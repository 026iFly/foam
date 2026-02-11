/**
 * Foam Expert Calculations
 *
 * This module contains expert calculations for spray foam insulation,
 * including dew point analysis, thickness recommendations, and building
 * physics according to Swedish building standards (BBR).
 */

// Climate zones in Sweden (approximate outdoor winter design temps)
export const CLIMATE_ZONES = {
  'Södra Sverige (Zon I)': -16,
  'Mellersta Sverige (Zon II)': -20,
  'Norra Sverige (Zon III)': -26,
  'Fjällområden (Zon IV)': -30,
} as const;

// Standard indoor conditions for Swedish residential buildings
export const INDOOR_CONDITIONS = {
  temperature: 21, // °C
  relativeHumidity: 40, // %
} as const;

// Default foam properties (can be overridden by DB values)
export const FOAM_PROPERTIES = {
  closed_cell: {
    lambda: 0.024, // W/(m·K) - thermal conductivity
    sd_value: 100, // m - vapor diffusion resistance (acts as vapor barrier)
    density: 35, // kg/m³
    name: 'Slutencellsskum',
  },
  open_cell: {
    lambda: 0.040, // W/(m·K)
    sd_value: 0.3, // m - vapor permeable
    density: 10, // kg/m³
    name: 'Öppencellsskum',
  },
} as const;

// Type for physics variables from DB
export interface BuildingPhysicsVariables {
  condensation_safety_margin?: number;
  closed_cell_min_airtightness?: number;
  flash_batt_min_open_thickness?: number;
  indoor_temp_standard?: number;
  indoor_rh_standard?: number;
  closed_cell_lambda?: number;
  open_cell_lambda?: number;
  closed_cell_sd_value?: number;
  open_cell_sd_value?: number;
  closed_cell_density?: number;
  open_cell_density?: number;
}

// Helper to get foam properties with optional DB overrides
export function getFoamProperties(dbVars?: BuildingPhysicsVariables) {
  return {
    closed_cell: {
      lambda: dbVars?.closed_cell_lambda ?? FOAM_PROPERTIES.closed_cell.lambda,
      sd_value: dbVars?.closed_cell_sd_value ?? FOAM_PROPERTIES.closed_cell.sd_value,
      density: dbVars?.closed_cell_density ?? FOAM_PROPERTIES.closed_cell.density,
      name: 'Slutencellsskum',
    },
    open_cell: {
      lambda: dbVars?.open_cell_lambda ?? FOAM_PROPERTIES.open_cell.lambda,
      sd_value: dbVars?.open_cell_sd_value ?? FOAM_PROPERTIES.open_cell.sd_value,
      density: dbVars?.open_cell_density ?? FOAM_PROPERTIES.open_cell.density,
      name: 'Öppencellsskum',
    },
  };
}

// Helper to get indoor conditions with optional DB overrides
export function getIndoorConditions(dbVars?: BuildingPhysicsVariables) {
  return {
    temperature: dbVars?.indoor_temp_standard ?? INDOOR_CONDITIONS.temperature,
    relativeHumidity: dbVars?.indoor_rh_standard ?? INDOOR_CONDITIONS.relativeHumidity,
  };
}

// Default safety margin
export const DEFAULT_SAFETY_MARGIN = 2.0; // °C

// Swedish building standard minimum U-values (W/m²K) - BBR 29
export const BBR_U_VALUES = {
  yttervagg: 0.18, // Outer wall
  tak: 0.13, // Roof/attic
  golv: 0.15, // Floor against ground
  fonster: 1.2, // Windows (for reference)
} as const;

/**
 * Calculate saturation vapor pressure using Magnus formula
 * @param temp Temperature in °C
 * @returns Saturation vapor pressure in Pa
 */
function saturationVaporPressure(temp: number): number {
  return 611.2 * Math.exp((17.62 * temp) / (243.12 + temp));
}

/**
 * Calculate dew point temperature
 * @param temp Temperature in °C
 * @param rh Relative humidity in %
 * @returns Dew point temperature in °C
 */
export function calculateDewPoint(temp: number, rh: number): number {
  const a = 17.62;
  const b = 243.12;
  const alpha = Math.log(rh / 100) + (a * temp) / (b + temp);
  return (b * alpha) / (a - alpha);
}

/**
 * Calculate minimum closed-cell thickness needed to keep interface above dew point
 * Based on temperature criterion (steady-state heat transfer)
 *
 * @param params Configuration parameters
 * @returns Minimum thickness in mm and explanation
 */
export function calculateMinClosedCellThickness(params: {
  T_in: number;           // Indoor temperature (°C)
  RH_in: number;          // Indoor relative humidity (%)
  T_out: number;          // Outdoor temperature (°C)
  openCellThickness: number; // Planned open-cell thickness (mm)
  safetyMargin?: number;  // Safety margin above dew point (°C), default 2.0
}): {
  minThickness: number;
  T_dew: number;
  T_target: number;
  T_interface: number;
  explanation: string;
} {
  const {
    T_in,
    RH_in,
    T_out,
    openCellThickness,
    safetyMargin = 2.0,
  } = params;

  // Thermal resistances (m²K/W)
  const R_out_film = 0.04;  // Exterior surface resistance
  const R_in_film = 0.13;   // Interior surface resistance

  // Typical construction layers
  const R_ext_fixed = 0.12; // Sheathing/OSB (12mm @ 0.13 W/mK) + undertaksplatta
  const R_int_fixed = 0.06; // Gypsum board (13mm @ 0.25 W/mK)

  // Open-cell thermal resistance
  const lambda_open = FOAM_PROPERTIES.open_cell.lambda;
  const R_open = (openCellThickness / 1000) / lambda_open;

  // Closed-cell lambda
  const lambda_closed = FOAM_PROPERTIES.closed_cell.lambda;

  // Calculate dew point
  const T_dew = calculateDewPoint(T_in, RH_in);
  const T_target = T_dew + safetyMargin;

  // Temperature difference
  const deltaT = T_in - T_out;

  if (deltaT <= 0) {
    return {
      minThickness: 0,
      T_dew,
      T_target,
      T_interface: T_in,
      explanation: 'Ingen kondensationsrisk vid denna temperaturskillnad'
    };
  }

  // Calculate k = (T_target - T_out) / (T_in - T_out)
  const k = (T_target - T_out) / deltaT;

  if (k <= 0) {
    return {
      minThickness: 0,
      T_dew,
      T_target,
      T_interface: T_out,
      explanation: 'Måltemperaturen är lägre än utetemperaturen'
    };
  }

  if (k >= 1) {
    return {
      minThickness: Infinity,
      T_dew,
      T_target,
      T_interface: T_out,
      explanation: 'Omöjligt att nå måltemperaturen med given konfiguration'
    };
  }

  // A = layers before closed-cell (from outside)
  const A = R_out_film + R_ext_fixed;

  // B = layers after closed-cell (toward inside)
  const B = R_open + R_int_fixed + R_in_film;

  // Solve for R_closed_min
  // T_interface = T_out + (A + R_closed) / (A + R_closed + B) * (T_in - T_out)
  // T_interface >= T_target
  // (A + R_closed) / (A + R_closed + B) >= k
  // A + R_closed >= k * (A + R_closed + B)
  // A + R_closed >= k*A + k*R_closed + k*B
  // R_closed - k*R_closed >= k*A + k*B - A
  // R_closed * (1 - k) >= k*(A + B) - A
  // R_closed >= (k*(A + B) - A) / (1 - k)
  // R_closed >= (k*B + A*(k-1)) / (1 - k)
  // R_closed >= (k*B - A*(1-k)) / (1 - k)
  // R_closed >= k*B/(1-k) - A

  const R_closed_min = (k / (1 - k)) * B - A;

  // Ensure non-negative
  const R_closed_safe = Math.max(0, R_closed_min);

  // Convert to thickness
  const t_closed_min = R_closed_safe * lambda_closed * 1000; // mm

  // Calculate actual interface temperature with this thickness
  const R_total = A + R_closed_safe + B;
  const T_interface = T_out + ((A + R_closed_safe) / R_total) * deltaT;

  const explanation = `För att hålla gränsskiktet (closed/open) över daggpunkten (${T_dew.toFixed(1)}°C) med ${safetyMargin}°C säkerhetsmarginal behövs minst ${Math.ceil(t_closed_min)}mm slutencellsskum.`;

  return {
    minThickness: t_closed_min,
    T_dew,
    T_target,
    T_interface,
    explanation
  };
}

/**
 * Calculate required insulation thickness to meet BBR standards
 * @param buildingPart Type of building part
 * @param lambda Thermal conductivity of insulation material
 * @returns Required thickness in mm
 */
export function calculateMinimumThickness(
  buildingPart: keyof typeof BBR_U_VALUES,
  lambda: number
): number {
  const maxU = BBR_U_VALUES[buildingPart];
  // U = λ / d => d = λ / U
  // Add 10% safety margin and interior/exterior surface resistances (0.13 + 0.04 = 0.17)
  const Rsi = 0.13; // Interior surface resistance
  const Rse = 0.04; // Exterior surface resistance
  const requiredR = 1 / maxU - Rsi - Rse;
  const thickness = (lambda * requiredR) * 1000 * 1.1; // Convert to mm and add 10% margin
  return Math.ceil(thickness / 10) * 10; // Round up to nearest 10mm
}

/**
 * Calculate temperature at a specific depth in insulation
 * Uses linear interpolation (simplified, assumes steady-state conditions)
 */
function temperatureAtDepth(
  indoorTemp: number,
  outdoorTemp: number,
  totalThickness: number,
  depth: number,
  lambda: number
): number {
  // Simplified: assumes uniform material
  const ratio = depth / totalThickness;
  return indoorTemp - (indoorTemp - outdoorTemp) * ratio;
}

/**
 * Analyze if condensation risk exists in a wall/roof assembly
 */
export function analyzeCondensationRisk(params: {
  indoorTemp: number;
  outdoorTemp: number;
  indoorRH: number;
  outdoorRH?: number;
  insulationThickness: number;
  foamType: 'closed_cell' | 'open_cell';
  hasVaporBarrier: boolean;
  safetyMargin?: number;  // Safety margin above dew point (°C), default 2.0
}): {
  risk: 'low' | 'medium' | 'high';
  dewPointInside: number;
  criticalDepth?: number;
  recommendation: string;
  explanation: string;
} {
  const {
    indoorTemp,
    outdoorTemp,
    indoorRH,
    outdoorRH = 80, // Typical outdoor winter RH in Sweden
    insulationThickness,
    foamType,
    hasVaporBarrier,
    safetyMargin = 2.0,
  } = params;

  const dewPoint = calculateDewPoint(indoorTemp, indoorRH);

  // Risk assessment based on building physics
  let risk: 'low' | 'medium' | 'high' = 'low';
  let recommendation: string = '';
  let explanation: string = '';
  let criticalDepth: number | undefined;

  if (foamType === 'closed_cell') {
    // Closed-cell: Risk comes from insufficient thickness for air-tightness and vapor barrier performance
    // Calculate minimum thickness needed to keep outer surface above dew point
    const minCalc = calculateMinClosedCellThickness({
      T_in: indoorTemp,
      RH_in: indoorRH,
      T_out: outdoorTemp,
      openCellThickness: 0, // Pure closed-cell configuration
      safetyMargin,
    });

    // Calculate ACTUAL temperature at the INSIDE surface of the foam (facing interior)
    // This is where moisture from the warm interior would first encounter the foam
    const R_out_film = 0.04;
    const R_ext_fixed = 0.12;
    const R_closed_actual = (insulationThickness / 1000) / FOAM_PROPERTIES.closed_cell.lambda;
    const R_int_fixed = 0.06;
    const R_in_film = 0.13;
    const R_total_actual = R_out_film + R_ext_fixed + R_closed_actual + R_int_fixed + R_in_film;
    // Temperature at INSIDE of foam = temp after passing through exterior layers AND the foam
    const actualSurfaceTemp = outdoorTemp + ((R_out_film + R_ext_fixed + R_closed_actual) / R_total_actual) * (indoorTemp - outdoorTemp);

    // Check if current thickness is adequate
    if (insulationThickness < 40) {
      // Too thin for reliable air-tightness
      risk = 'high';
      recommendation = 'Öka isoleringstjockleken till minst 40-60mm';
      explanation = `VARNING: Med nuvarande tjocklek (${insulationThickness}mm) kan lufttätheten inte garanteras. Slutencellsskum behöver minst 40-60mm tjocklek för att fungera som pålitlig ångbroms och lufttätning. Detta är viktigare än själva temperaturprofilen - även om ytan blir kall så måste fukten stoppas från att nå den.`;
      criticalDepth = insulationThickness;
    } else if (insulationThickness < minCalc.minThickness) {
      // Thickness insufficient to keep surface above dew point
      risk = 'high';
      recommendation = `Öka isoleringstjockleken till minst ${Math.ceil(minCalc.minThickness)}mm`;
      explanation = `VARNING: Med nuvarande tjocklek (${insulationThickness}mm) blir ytterytans temperatur ${actualSurfaceTemp.toFixed(1)}°C, vilket ligger för nära daggpunkten (${dewPoint.toFixed(1)}°C). Säkerhetsmarginalen är bara ${(actualSurfaceTemp - dewPoint).toFixed(1)}°C men bör vara minst 2.0°C. ${minCalc.explanation}`;
      criticalDepth = insulationThickness;
    } else {
      // Adequate thickness
      risk = 'low';
      recommendation = 'Slutencellsskum är en utmärkt lösning';
      explanation = `Slutencellsskum fungerar som både isolering och ångspärr (sd-värde ~100m). Med ${insulationThickness}mm tjocklek blockeras fukttransporten effektivt och ytterytans temperatur (${actualSurfaceTemp.toFixed(1)}°C) hålls säkert över daggpunkten (${dewPoint.toFixed(1)}°C) med ${(actualSurfaceTemp - dewPoint).toFixed(1)}°C marginal. Risken för kondensation är minimal.`;
    }
  } else if (foamType === 'open_cell') {
    // Open-cell: Depends entirely on vapor barrier
    if (hasVaporBarrier) {
      // With vapor barrier, moisture transport is controlled
      // Check if thickness provides adequate insulation
      const minThicknessForUValue = 100; // Rough minimum for decent U-value

      if (insulationThickness < minThicknessForUValue) {
        risk = 'medium';
        recommendation = 'Öka isoleringstjockleken eller överväg flash-and-batt';
        explanation = `Med öppencellsskum och ångspärr är fukttransporten kontrollerad, men tjockleken (${insulationThickness}mm) är relativt liten. Överväg antingen mer öppencellsskum eller flash-and-batt-metoden (först slutencellsskum, sedan öppencellsskum) för bättre prestanda och säkerhetsmarginal.`;
      } else {
        risk = 'low';
        recommendation = 'Öppencellsskum med ångspärr är godkänt';
        explanation = 'Med en korrekt installerad ångspärr på varm sida kan öppencellsskum användas säkert. Tjockleken är tillräcklig och ångspärren förhindrar fukttransport från inomhusluften.';
      }
    } else {
      // Without vapor barrier: Always high risk
      // Moisture can reach cold surfaces via both diffusion and air leakage
      risk = 'high';
      recommendation = 'Använd slutencellsskum eller lägg till ångspärr';
      explanation = `VARNING: Utan ångspärr kan fukt från inomhusluften (daggpunkt: ${dewPoint.toFixed(1)}°C) nå kalla ytor genom både diffusion och luftläckage. Öppencellsskum har lågt sd-värde (~0.3m) och stoppar inte fukttransport. Detta kan leda till kondensation och fuktskador. Välj antingen slutencellsskum som fungerar som inbyggd ångspärr, eller installera en separat ångspärr på varm sida.`;
      criticalDepth = 0; // Risk exists throughout the insulation
    }
  }

  return {
    risk,
    dewPointInside: dewPoint,
    criticalDepth,
    recommendation,
    explanation,
  };
}

/**
 * Recommend optimal foam configuration (flash-and-batt or single foam)
 */
export function recommendFoamConfiguration(params: {
  buildingPart: keyof typeof BBR_U_VALUES;
  hasVaporBarrier: boolean;
  indoorTemp: number;
  outdoorTemp: number;
  indoorRH: number;
  targetThickness?: number;
  safetyMargin?: number;  // Safety margin above dew point (°C), default 2.0
}): {
  config: 'closed_only' | 'open_only' | 'flash_and_batt';
  closedThickness: number;
  openThickness: number;
  totalThickness: number;
  explanation: string;
  uValue: number;
} {
  const {
    buildingPart,
    hasVaporBarrier,
    indoorTemp,
    outdoorTemp,
    indoorRH,
    targetThickness,
    safetyMargin = 2.0,
  } = params;

  const minThicknessClosed = calculateMinimumThickness(buildingPart, FOAM_PROPERTIES.closed_cell.lambda);
  const minThicknessOpen = calculateMinimumThickness(buildingPart, FOAM_PROPERTIES.open_cell.lambda);

  // Inner walls - always open cell
  if (buildingPart === 'yttervagg' && indoorTemp === outdoorTemp) {
    return {
      config: 'open_only',
      closedThickness: 0,
      openThickness: targetThickness || 100,
      totalThickness: targetThickness || 100,
      explanation: 'För innerväggar rekommenderas öppencellsskum för optimal ljuddämpning och kostnad.',
      uValue: FOAM_PROPERTIES.open_cell.lambda / ((targetThickness || 100) / 1000),
    };
  }

  // No vapor barrier and outer application -> closed cell needed as vapor barrier
  // BUT we can use flash-and-batt: minimum closed-cell + open-cell to save cost
  if (!hasVaporBarrier && (buildingPart === 'yttervagg' || buildingPart === 'tak')) {
    const targetTotal = targetThickness || minThicknessClosed;

    // Find ACTUAL minimum closed-cell by testing the real split
    // Iterative approach: test with actual remaining open-cell thickness
    let minClosedNeeded = 40; // Start with minimum for air-tightness
    let bestCalc = null;

    // Binary search-like approach: try different splits
    for (let testClosed = 40; testClosed <= targetTotal; testClosed += 5) {
      const testOpen = targetTotal - testClosed;

      const testCalc = calculateMinClosedCellThickness({
        T_in: indoorTemp,
        RH_in: indoorRH,
        T_out: outdoorTemp,
        openCellThickness: testOpen,
        safetyMargin,
      });

      // If this closed thickness is sufficient for safety
      if (testClosed >= testCalc.minThickness) {
        minClosedNeeded = testClosed;
        bestCalc = testCalc;
        break;
      }
    }

    // Fallback if no solution found (shouldn't happen)
    if (!bestCalc) {
      const estimatedOpen = Math.max(0, targetTotal - 60);
      bestCalc = calculateMinClosedCellThickness({
        T_in: indoorTemp,
        RH_in: indoorRH,
        T_out: outdoorTemp,
        openCellThickness: estimatedOpen,
        safetyMargin,
      });
      minClosedNeeded = Math.min(targetTotal, Math.ceil(bestCalc.minThickness / 5) * 5);
    }

    const remainingForOpen = targetTotal - minClosedNeeded;

    // Decision: Can we use flash-and-batt?
    if (remainingForOpen >= 50) {
      // Yes! Flash-and-batt is viable and cheaper
      const R_closed = minClosedNeeded / 1000 / FOAM_PROPERTIES.closed_cell.lambda;
      const R_open = remainingForOpen / 1000 / FOAM_PROPERTIES.open_cell.lambda;
      const R_total = R_closed + R_open;
      const uValue = 1 / R_total;

      return {
        config: 'flash_and_batt',
        closedThickness: minClosedNeeded,
        openThickness: remainingForOpen,
        totalThickness: targetTotal,
        explanation: `Flash-and-batt metoden (${minClosedNeeded}mm slutencell + ${remainingForOpen}mm öppencell = ${targetTotal}mm totalt): Utan separat ångspärr använder vi ${minClosedNeeded}mm slutencellsskum mot yttre sidan som fungerar som både ångbroms (sd-värde ~100m) och lufttätning. Detta håller gränsskiktet vid ${bestCalc.T_interface.toFixed(1)}°C (säkert över daggpunkten ${bestCalc.T_dew.toFixed(1)}°C med ${(bestCalc.T_interface - bestCalc.T_dew).toFixed(1)}°C marginal). Därefter lägger vi ${remainingForOpen}mm öppencellsskum på insidan för kostnadseffektiv isolering. Detta ger bästa ekonomin eftersom öppencellsskum har mycket lägre densitet (10 kg/m³ vs 35 kg/m³).`,
        uValue,
      };
    } else {
      // No, open-cell layer would be too thin - use all closed-cell
      return {
        config: 'closed_only',
        closedThickness: targetTotal,
        openThickness: 0,
        totalThickness: targetTotal,
        explanation: `Utan ångspärr krävs slutencellsskum som fungerar både som isolering och ångspärr. Vid ${targetTotal}mm total tjocklek skulle flash-and-batt kräva ${minClosedNeeded}mm slutencell (för kondensationssäkerhet) + ${remainingForOpen}mm öppencell, men öppencellsskiktet blir för tunt (<50mm) för att motivera extra arbetstid och växlingskostnad. Rent slutencellsskum (${targetTotal}mm) blir därför mer praktiskt och kostnadseffektivt, samt eliminerar behovet för separat ångspärr och luftspalt.`,
        uValue: FOAM_PROPERTIES.closed_cell.lambda / (targetTotal / 1000),
      };
    }
  }

  // Has vapor barrier -> use open cell only (vapor barrier handles moisture control)
  if (hasVaporBarrier) {
    const thickness = targetThickness || minThicknessOpen;
    const uValue = FOAM_PROPERTIES.open_cell.lambda / (thickness / 1000);

    return {
      config: 'open_only',
      closedThickness: 0,
      openThickness: thickness,
      totalThickness: thickness,
      explanation: `Med befintlig ångspärr rekommenderas enbart öppencellsskum (${thickness}mm). Ångspärren förhindrar fukttransport, så slutencellsskum behövs inte. Öppencellsskum är kostnadseffektivt (lägre densitet, 10 kg/m³) och ger god isolering. Uppfyller BBR-krav (U ≤ ${BBR_U_VALUES[buildingPart]} W/m²K).`,
      uValue,
    };
  }

  // Default fallback
  const thickness = targetThickness || minThicknessClosed;
  return {
    config: 'closed_only',
    closedThickness: thickness,
    openThickness: 0,
    totalThickness: thickness,
    explanation: 'Standardrekommendation: Slutencellsskum för maximal säkerhet och prestanda.',
    uValue: FOAM_PROPERTIES.closed_cell.lambda / (thickness / 1000),
  };
}

/**
 * Calculate price for a foam configuration
 */
export function calculateConfigurationPrice(
  area: number,
  closedThickness: number,
  openThickness: number,
  pricingData: Array<{ foam_type: string; thickness_mm: number; price_per_m2_excl_vat: number }>,
  projectMultiplier: number = 1.0
): {
  closedCost: number;
  openCost: number;
  totalExclVat: number;
  totalInclVat: number;
} {
  let closedCost = 0;
  let openCost = 0;

  if (closedThickness > 0) {
    // Find closest pricing
    const closedPricing = pricingData.filter(p => p.foam_type === 'closed');
    const closest = closedPricing.reduce((prev, curr) =>
      Math.abs(curr.thickness_mm - closedThickness) < Math.abs(prev.thickness_mm - closedThickness) ? curr : prev
    );
    const adjustment = (closedThickness - closest.thickness_mm) * 1.4; // SEK per mm
    closedCost = area * (closest.price_per_m2_excl_vat + adjustment);
  }

  if (openThickness > 0) {
    const openPricing = pricingData.filter(p => p.foam_type === 'open');
    const closest = openPricing.reduce((prev, curr) =>
      Math.abs(curr.thickness_mm - openThickness) < Math.abs(prev.thickness_mm - openThickness) ? curr : prev
    );
    const adjustment = (openThickness - closest.thickness_mm) * 1.1;
    openCost = area * (closest.price_per_m2_excl_vat + adjustment);
  }

  const totalExclVat = (closedCost + openCost) * projectMultiplier;
  const totalInclVat = totalExclVat * 1.25;

  return {
    closedCost,
    openCost,
    totalExclVat: Math.round(totalExclVat),
    totalInclVat: Math.round(totalInclVat),
  };
}
