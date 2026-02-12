import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/supabase-auth';
import { getQuoteRequest } from '@/lib/quotes';
import { supabase } from '@/lib/supabase';
import {
  analyzeCondensationRisk,
  calculateMinClosedCellThickness,
  FOAM_PROPERTIES,
  BBR_U_VALUES,
  getFoamProperties,
  BuildingPhysicsVariables,
  DEFAULT_SAFETY_MARGIN,
} from '@/lib/foam-calculations';
import type { CalculationData, BuildingPartRecommendation } from '@/lib/types/quote';

interface CostVariables {
  [key: string]: number;
}

async function getCostVariables(): Promise<{ vars: CostVariables; physicsVars: BuildingPhysicsVariables }> {
  const { data, error } = await supabase
    .from('cost_variables')
    .select('variable_key, variable_value, category');

  if (error) {
    console.error('Error fetching cost variables:', error);
    throw error;
  }

  const vars: CostVariables = {};
  const physicsVars: BuildingPhysicsVariables = {};

  for (const v of data || []) {
    vars[v.variable_key] = v.variable_value;

    // Also populate physics vars for building_physics category
    if (v.category === 'building_physics') {
      (physicsVars as Record<string, number>)[v.variable_key] = v.variable_value;
    }
  }

  return { vars, physicsVars };
}

async function getProjectMultipliers(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('project_multipliers')
    .select('project_type, multiplier')
    .eq('is_active', 1);

  if (error) {
    console.error('Error fetching project multipliers:', error);
    return {};
  }

  const multipliers: Record<string, number> = {};
  for (const m of data || []) {
    multipliers[m.project_type] = m.multiplier;
  }
  return multipliers;
}

interface RecalculatePartInput {
  partId: string;
  partName: string;
  partType: string;
  area: number;
  hasVaporBarrier: boolean;
  closedCellThickness: number;
  openCellThickness: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const quote = await getQuoteRequest(parseInt(id));

    if (!quote) {
      return NextResponse.json({ error: 'Offert ej hittad' }, { status: 404 });
    }

    const body = await request.json();
    const { parts, climate, options } = body as {
      parts: RecalculatePartInput[];
      climate: {
        zone: string;
        indoorTemp: number;
        indoorRH: number;
        outdoorTemp: number;
      };
      options: {
        hasThreePhase: boolean;
        applyRotDeduction: boolean;
        customerAddress: string;
      };
    };

    // Get cost variables and physics variables from database
    const { vars, physicsVars } = await getCostVariables();
    const multipliers = await getProjectMultipliers();

    // Load crew settings and BBR U-values from system_settings
    const { data: crewSettingsRow } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'crew_settings')
      .single();
    const crewSettings = crewSettingsRow?.value
      ? (typeof crewSettingsRow.value === 'string' ? JSON.parse(crewSettingsRow.value) : crewSettingsRow.value)
      : { default_installers: 2, single_installer_factor: 30 };

    const { data: bbrRow } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'bbr_u_values')
      .single();
    const customBBR = bbrRow?.value
      ? (typeof bbrRow.value === 'string' ? JSON.parse(bbrRow.value) : bbrRow.value)
      : null;

    // Get foam properties with DB overrides
    const foamProps = getFoamProperties(physicsVars);
    const safetyMargin = physicsVars.condensation_safety_margin ?? DEFAULT_SAFETY_MARGIN;

    // Process each part
    const recalculatedParts: BuildingPartRecommendation[] = [];
    let totalClosedCellKg = 0;
    let totalOpenCellKg = 0;
    let totalMaterialCost = 0;
    let totalSprayHours = 0;

    for (const part of parts) {
      const closedThickness = part.closedCellThickness;
      const openThickness = part.openCellThickness;
      const totalThickness = closedThickness + openThickness;

      // Calculate closed cell
      let closedCellKg = 0;
      let closedCellCost = 0;
      let closedSprayHours = 0;

      if (closedThickness > 0) {
        const closedVolume = (part.area * closedThickness) / 1000;
        closedCellKg = closedVolume * vars.closed_density;
        const closedMaterialCost = closedCellKg * vars.closed_material_cost;
        closedCellCost = closedMaterialCost * (1 + vars.closed_margin / 100);
        closedSprayHours = closedVolume * vars.closed_spray_time;
      }

      // Calculate open cell
      let openCellKg = 0;
      let openCellCost = 0;
      let openSprayHours = 0;

      if (openThickness > 0) {
        const openVolume = (part.area * openThickness) / 1000;
        openCellKg = openVolume * vars.open_density;
        const openMaterialCost = openCellKg * vars.open_material_cost;
        openCellCost = openMaterialCost * (1 + vars.open_margin / 100);
        openSprayHours = openVolume * vars.open_spray_time;
      }

      const materialCost = closedCellCost + openCellCost;

      // Apply project multiplier to spray hours based on part type
      const partMultiplier = multipliers[part.partType] ?? 1.0;
      const sprayHours = (closedSprayHours + openSprayHours) * partMultiplier;

      // Accumulate totals
      totalClosedCellKg += closedCellKg;
      totalOpenCellKg += openCellKg;
      totalMaterialCost += materialCost;
      totalSprayHours += sprayHours;

      // Determine config type
      let configType: 'closed_only' | 'open_only' | 'flash_and_batt' = 'closed_only';
      if (closedThickness > 0 && openThickness > 0) {
        configType = 'flash_and_batt';
      } else if (openThickness > 0) {
        configType = 'open_only';
      }

      // Check if it's an inner wall (no condensation risk analysis needed)
      const isInnerWall = part.partType === 'innervagg' ||
        (climate.indoorTemp === climate.outdoorTemp);

      // Calculate condensation analysis
      let condensationAnalysis = undefined;
      let condensationRisk: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';

      if (!isInnerWall) {
        // For flash-and-batt, analyze the closed cell layer
        const analysisThickness = configType === 'flash_and_batt'
          ? closedThickness
          : totalThickness;

        const foamType = configType === 'open_only' ? 'open_cell' : 'closed_cell';

        const riskAnalysis = analyzeCondensationRisk({
          indoorTemp: climate.indoorTemp,
          outdoorTemp: climate.outdoorTemp,
          indoorRH: climate.indoorRH,
          insulationThickness: analysisThickness,
          foamType,
          hasVaporBarrier: part.hasVaporBarrier,
        });

        // Calculate temperature at interface for flash-and-batt
        let tempAtInterface = climate.outdoorTemp;
        let interfaceSafetyMargin = 0;

        if (configType === 'flash_and_batt' || configType === 'closed_only') {
          const minCalc = calculateMinClosedCellThickness({
            T_in: climate.indoorTemp,
            RH_in: climate.indoorRH,
            T_out: climate.outdoorTemp,
            openCellThickness: openThickness,
            safetyMargin: safetyMargin,
          });

          // Calculate actual temperature at the closed/open interface using DB values
          const R_out_film = 0.04;
          const R_ext_fixed = 0.12;
          const R_closed = (closedThickness / 1000) / foamProps.closed_cell.lambda;
          const R_open = (openThickness / 1000) / foamProps.open_cell.lambda;
          const R_int_fixed = 0.06;
          const R_in_film = 0.13;
          const R_total = R_out_film + R_ext_fixed + R_closed + R_open + R_int_fixed + R_in_film;

          tempAtInterface = climate.outdoorTemp +
            ((R_out_film + R_ext_fixed + R_closed) / R_total) *
            (climate.indoorTemp - climate.outdoorTemp);

          interfaceSafetyMargin = tempAtInterface - minCalc.T_dew;
        }

        condensationRisk = riskAnalysis.risk;
        condensationAnalysis = {
          risk: riskAnalysis.risk,
          dewPointInside: riskAnalysis.dewPointInside,
          tempAtInterface,
          explanation: riskAnalysis.explanation,
          safetyMargin: interfaceSafetyMargin,
        };
      }

      // Calculate U-value using DB foam properties
      const R_closed = closedThickness > 0
        ? (closedThickness / 1000) / foamProps.closed_cell.lambda
        : 0;
      const R_open = openThickness > 0
        ? (openThickness / 1000) / foamProps.open_cell.lambda
        : 0;
      const R_total = R_closed + R_open + 0.17; // Add surface resistances
      const actualUValue = R_total > 0 ? 1 / R_total : 0;

      // Get required U-value for the building part type
      const partTypeKey = part.partType === 'tak' ? 'tak' :
        part.partType === 'yttervagg' ? 'yttervagg' :
        part.partType === 'golv' ? 'golv' : 'tak';
      const requiredUValue = customBBR?.[partTypeKey] ?? BBR_U_VALUES[partTypeKey as keyof typeof BBR_U_VALUES] ?? 0.13;
      const meetsUValue = actualUValue <= requiredUValue;

      recalculatedParts.push({
        partId: part.partId,
        partName: part.partName,
        partType: part.partType,
        area: part.area,
        hasVaporBarrier: part.hasVaporBarrier,
        targetThickness: totalThickness,
        closedCellThickness: closedThickness,
        openCellThickness: openThickness,
        totalThickness,
        closedCellKg: Math.round(closedCellKg * 10) / 10,
        openCellKg: Math.round(openCellKg * 10) / 10,
        closedCellCost: Math.round(closedCellCost),
        openCellCost: Math.round(openCellCost),
        materialCost: Math.round(materialCost),
        laborHours: Math.round(sprayHours * 10) / 10,
        laborCost: 0, // Will be calculated below
        totalCost: 0, // Will be calculated below
        condensationRisk,
        meetsUValue,
        actualUValue: Math.round(actualUValue * 100) / 100,
        requiredUValue,
        configType,
        configExplanation: configType === 'closed_only' ? 'Endast slutencell' :
          configType === 'open_only' ? 'Endast öppencell' : 'Flash & Batt',
        condensationAnalysis,
      });
    }

    // Apply single-installer factor if applicable
    // Check booking for num_installers (passed via options or from booking)
    const numInstallers = (options as Record<string, unknown>).num_installers
      ? Number((options as Record<string, unknown>).num_installers)
      : crewSettings.default_installers ?? 2;
    const singleFactor = crewSettings.single_installer_factor ?? 30;
    let adjustedSprayHours = totalSprayHours;
    if (numInstallers === 1) {
      adjustedSprayHours = totalSprayHours * (1 + singleFactor / 100);
    }

    // Calculate shared costs
    const setupHours = vars.setup_hours || 2;
    const travelHours = 0; // Would need distance calculation
    const switchingHours = recalculatedParts.filter(p => p.configType === 'flash_and_batt').length * 1.0;
    const totalLaborHours = adjustedSprayHours + setupHours + travelHours + switchingHours;
    const totalLaborCost = totalLaborHours * vars.personnel_cost_per_hour;

    // Distribute labor cost proportionally to spray hours
    for (const part of recalculatedParts) {
      const laborShare = totalSprayHours > 0
        ? (part.laborHours / totalSprayHours) * totalLaborCost
        : 0;
      part.laborCost = Math.round(laborShare);
      part.totalCost = part.materialCost + part.laborCost;
    }

    // Calculate totals
    const generatorCost = options.hasThreePhase ? 0 : (vars.generator_cost || 0);

    // Try to preserve travel cost and distance from original data
    const originalData: CalculationData | null = quote.adjusted_data
      ? JSON.parse(quote.adjusted_data)
      : quote.calculation_data
        ? JSON.parse(quote.calculation_data)
        : null;

    const preservedTravelCost = originalData?.totals.travelCost || 0;
    const preservedDistanceKm = originalData?.totals.distanceKm || 0;
    const preservedTravelHours = originalData?.totals.travelHours || 0;

    const totalExclVat = Math.round(totalMaterialCost + totalLaborCost + preservedTravelCost + generatorCost);
    const vat = Math.round(totalExclVat * 0.25);
    const totalInclVat = totalExclVat + vat;

    // ROT deduction (30% of labor cost incl VAT, capped per person)
    const laborCostInclVat = totalLaborCost * 1.25;
    const rawRot = Math.round(laborCostInclVat * 0.30);

    let rotDeduction = 0;
    if (options.applyRotDeduction) {
      const rotMaxPerPerson = quote.rot_max_per_person || 50000;
      const customerMax = quote.rot_customer_max
        ? (typeof quote.rot_customer_max === 'string' ? JSON.parse(quote.rot_customer_max) : quote.rot_customer_max)
        : null;
      const rotInfoRaw = quote.rot_customer_info
        ? (typeof quote.rot_customer_info === 'string' ? JSON.parse(quote.rot_customer_info) : quote.rot_customer_info)
        : null;

      if (rotInfoRaw?.customers?.length) {
        // Sum each person's cap * their share
        let totalMaxRot = 0;
        for (let i = 0; i < rotInfoRaw.customers.length; i++) {
          const personMax = customerMax?.[String(i)] ?? rotMaxPerPerson;
          const share = rotInfoRaw.customers[i].share / 100;
          totalMaxRot += Math.round(personMax * share);
        }
        rotDeduction = Math.min(rawRot, totalMaxRot);
      } else {
        // No customer ROT info yet — cap at single person max
        rotDeduction = Math.min(rawRot, rotMaxPerPerson);
      }
    }
    const finalTotal = totalInclVat - rotDeduction;

    const recalculatedData: CalculationData = {
      recommendations: recalculatedParts,
      climate,
      options,
      totals: {
        totalArea: recalculatedParts.reduce((sum, p) => sum + p.area, 0),
        totalClosedCellKg: Math.round(totalClosedCellKg * 10) / 10,
        totalOpenCellKg: Math.round(totalOpenCellKg * 10) / 10,
        materialCostTotal: Math.round(totalMaterialCost),
        laborCostTotal: Math.round(totalLaborCost),
        travelCost: preservedTravelCost,
        generatorCost,
        totalExclVat,
        vat,
        totalInclVat,
        rotDeduction,
        finalTotal,
        sprayHours: Math.round(totalSprayHours * 10) / 10,
        setupHours,
        travelHours: preservedTravelHours,
        switchingHours,
        totalHours: Math.round((totalSprayHours + setupHours + preservedTravelHours + switchingHours) * 10) / 10,
        distanceKm: preservedDistanceKm,
      },
      timestamp: Date.now(),
    };

    return NextResponse.json({
      success: true,
      data: recalculatedData,
    });
  } catch (error) {
    console.error('Error recalculating quote:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid omräkning' },
      { status: 500 }
    );
  }
}
