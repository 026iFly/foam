'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CLIMATE_ZONES,
  INDOOR_CONDITIONS,
  BBR_U_VALUES,
  recommendFoamConfiguration,
  analyzeCondensationRisk,
  calculateConfigurationPrice,
} from '@/lib/foam-calculations';

interface BuildingPart {
  id: string;
  type: keyof typeof BBR_U_VALUES | 'innervagg';
  name: string;
  area: number;
  hasVaporBarrier?: boolean;
  targetThickness?: number;
}

interface PricingData {
  id: number;
  foam_type: string;
  thickness_mm: number;
  price_per_m2_excl_vat: number;
}

interface MultiplierData {
  project_type: string;
  multiplier: number;
}

const BUILDING_PART_OPTIONS = [
  { id: 'yttervagg', name: 'Yttervägg', icon: '🧱', needsVaporCheck: true },
  { id: 'tak', name: 'Tak/Vind', icon: '🏠', needsVaporCheck: true },
  { id: 'innervagg', name: 'Innervägg', icon: '🚪', needsVaporCheck: false },
  { id: 'golv', name: 'Golv mot mark', icon: '⬇️', needsVaporCheck: false },
];

export default function ExpertCalculatorPage() {
  const [step, setStep] = useState(1);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [buildingParts, setBuildingParts] = useState<BuildingPart[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);

  // Climate conditions
  const [climateZone, setClimateZone] = useState('Mellersta Sverige (Zon II)');
  const [indoorTemp, setIndoorTemp] = useState<number>(INDOOR_CONDITIONS.temperature);
  const [indoorRH, setIndoorRH] = useState<number>(INDOOR_CONDITIONS.relativeHumidity);

  // Customer details
  const [customerAddress, setCustomerAddress] = useState('');
  const [hasThreePhase, setHasThreePhase] = useState<boolean | null>(null);
  const [applyRotDeduction, setApplyRotDeduction] = useState(false);

  // Pricing data
  const [pricingData, setPricingData] = useState<PricingData[]>([]);
  const [multipliers, setMultipliers] = useState<MultiplierData[]>([]);
  const [buildingPhysics, setBuildingPhysics] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Results
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/pricing')
      .then(res => res.json())
      .then(data => {
        setPricingData(data.pricing);
        setMultipliers(data.multipliers);
        setBuildingPhysics(data.buildingPhysics || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Get safety margin from database or use default
  const safetyMargin = buildingPhysics.condensation_safety_margin_c ?? 2.0;

  const outdoorTemp = CLIMATE_ZONES[climateZone as keyof typeof CLIMATE_ZONES];

  const togglePartSelection = (partId: string) => {
    setSelectedParts(prev =>
      prev.includes(partId)
        ? prev.filter(id => id !== partId)
        : [...prev, partId]
    );
  };

  const startPartConfiguration = () => {
    const parts: BuildingPart[] = selectedParts.map((partId, index) => ({
      id: `${partId}-${index}`,
      type: partId as any,
      name: BUILDING_PART_OPTIONS.find(p => p.id === partId)?.name || partId,
      area: 0,
    }));
    setBuildingParts(parts);
    setCurrentPartIndex(0);
    setStep(2);
  };

  const updateCurrentPart = (updates: Partial<BuildingPart>) => {
    setBuildingParts(prev =>
      prev.map((part, idx) =>
        idx === currentPartIndex ? { ...part, ...updates } : part
      )
    );
  };

  const nextPart = () => {
    if (currentPartIndex < buildingParts.length - 1) {
      setCurrentPartIndex(prev => prev + 1);
    } else {
      setStep(3);
    }
  };

  const previousPart = () => {
    if (currentPartIndex > 0) {
      setCurrentPartIndex(prev => prev - 1);
    }
  };

  const calculateRecommendations = async () => {
    const results = await Promise.all(buildingParts.map(async (part) => {
      const isInnerWall = part.type === 'innervagg';
      const buildingPartType = isInnerWall ? 'yttervagg' : part.type;

      // For inner walls, use same indoor temp on both sides
      const effectiveOutdoorTemp = isInnerWall ? indoorTemp : outdoorTemp;

      const config = recommendFoamConfiguration({
        buildingPart: buildingPartType as keyof typeof BBR_U_VALUES,
        hasVaporBarrier: part.hasVaporBarrier ?? false,
        indoorTemp,
        outdoorTemp: effectiveOutdoorTemp,
        indoorRH,
        targetThickness: part.targetThickness || undefined,
        safetyMargin,
      });

      // Condensation risk analysis
      // For flash-and-batt, analyze the closed-cell layer thickness
      // For pure configurations, analyze the total thickness
      const analysisThickness = config.config === 'flash_and_batt'
        ? config.closedThickness
        : config.totalThickness;

      const riskAnalysis = isInnerWall ? null : analyzeCondensationRisk({
        indoorTemp,
        outdoorTemp,
        indoorRH,
        insulationThickness: analysisThickness,
        foamType: config.config === 'open_only' ? 'open_cell' : 'closed_cell',
        hasVaporBarrier: part.hasVaporBarrier ?? false,
        safetyMargin,
      });

      // Get project type for multiplier
      const projectType =
        part.type === 'yttervagg' ? 'vagg' :
        part.type === 'tak' ? 'vind' :
        part.type === 'golv' ? 'kallare' :
        'vind';

      // Calculate pricing using new advanced API
      let pricing = {
        totalExclVat: 0,
        totalInclVat: 0,
        rotDeduction: 0,
        breakdown: {
          material_cost: 0,
          labor_cost: 0,
          generator_cost: 0,
          travel_cost: 0,
          distance_km: 0,
          material_with_margin: 0,
          spray_hours: 0,
          setup_hours: 0,
          travel_hours: 0,
          total_labor_hours: 0,
          // Separate kg and cost tracking for closed and open cell
          closed_cell_kg: 0,
          open_cell_kg: 0,
          closed_material_cost: 0,
          open_material_cost: 0,
        }
      };

      // Calculate closed cell cost if needed
      if (config.closedThickness > 0) {
        try {
          const response = await fetch('/api/calculate-price-advanced', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              area: part.area,
              thickness_mm: config.closedThickness,
              foam_type: 'closed',
              project_type: projectType,
              customer_address: customerAddress,
              has_three_phase: hasThreePhase,
              apply_rot_deduction: applyRotDeduction,
            }),
          });
          const closedPricing = await response.json();
          // Add material and labor costs, store breakdown
          pricing.totalExclVat += closedPricing.price_excl_vat;
          pricing.totalInclVat += closedPricing.price_incl_vat;
          pricing.rotDeduction += closedPricing.rot_deduction || 0;
          // Store closed cell specific values
          pricing.breakdown.closed_cell_kg = closedPricing.breakdown.material_kg || 0;
          pricing.breakdown.closed_material_cost = closedPricing.breakdown.material_with_margin || 0;
          // Store shared values from closed cell calculation
          pricing.breakdown.generator_cost = closedPricing.breakdown.generator_cost || 0;
          pricing.breakdown.travel_cost = closedPricing.breakdown.travel_cost || 0;
          pricing.breakdown.distance_km = closedPricing.breakdown.distance_km || 0;
          pricing.breakdown.setup_hours = closedPricing.breakdown.setup_hours || 0;
          pricing.breakdown.travel_hours = closedPricing.breakdown.travel_hours || 0;
          pricing.breakdown.spray_hours += closedPricing.breakdown.spray_hours || 0;
          pricing.breakdown.material_with_margin += closedPricing.breakdown.material_with_margin || 0;
          pricing.breakdown.labor_cost += closedPricing.breakdown.labor_cost || 0;
          pricing.breakdown.total_labor_hours = closedPricing.breakdown.total_labor_hours || 0;
        } catch (err) {
          console.error('Pricing calculation error:', err);
        }
      }

      // Calculate open cell cost if needed
      if (config.openThickness > 0) {
        try {
          const response = await fetch('/api/calculate-price-advanced', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              area: part.area,
              thickness_mm: config.openThickness,
              foam_type: 'open',
              project_type: projectType,
              customer_address: customerAddress,
              has_three_phase: hasThreePhase,
              apply_rot_deduction: applyRotDeduction,
            }),
          });
          const openPricing = await response.json();
          // Add material and labor costs
          pricing.totalExclVat += openPricing.price_excl_vat;
          pricing.totalInclVat += openPricing.price_incl_vat;
          pricing.rotDeduction += openPricing.rot_deduction || 0;
          // Store open cell specific values
          pricing.breakdown.open_cell_kg = openPricing.breakdown.material_kg || 0;
          pricing.breakdown.open_material_cost = openPricing.breakdown.material_with_margin || 0;
          // Add spray hours from open cell
          pricing.breakdown.spray_hours += openPricing.breakdown.spray_hours || 0;
          pricing.breakdown.material_with_margin += openPricing.breakdown.material_with_margin || 0;
          pricing.breakdown.labor_cost += openPricing.breakdown.labor_cost || 0;
          // If we didn't have closed cell, use shared values from open cell
          if (config.closedThickness === 0) {
            pricing.breakdown.generator_cost = openPricing.breakdown.generator_cost || 0;
            pricing.breakdown.travel_cost = openPricing.breakdown.travel_cost || 0;
            pricing.breakdown.distance_km = openPricing.breakdown.distance_km || 0;
            pricing.breakdown.setup_hours = openPricing.breakdown.setup_hours || 0;
            pricing.breakdown.travel_hours = openPricing.breakdown.travel_hours || 0;
            pricing.breakdown.total_labor_hours = openPricing.breakdown.total_labor_hours || 0;
          }
        } catch (err) {
          console.error('Pricing calculation error:', err);
        }
      }

      return {
        part,
        config,
        riskAnalysis,
        pricing,
      };
    }));

    setRecommendations(results);
    setStep(4);
  };

  const currentPart = buildingParts[currentPartIndex];
  const currentOption = BUILDING_PART_OPTIONS.find(p => p.id === currentPart?.type);

  // Calculate total cost correctly: sum material+spray labor from all parts, add setup/travel/generator once
  const totalCost = (() => {
    if (recommendations.length === 0) return 0;

    // Get hourly rate from first part
    const firstBreakdown = recommendations[0].pricing.breakdown;
    const totalSprayHours = recommendations.reduce((sum, rec) => {
      return sum + (rec.pricing.breakdown.spray_hours || 0);
    }, 0);

    // Get setup and travel hours once (they're the same for all parts)
    const setupHours = firstBreakdown.setup_hours || 0;
    const travelHours = firstBreakdown.travel_hours || 0;

    // Add foam switching time for flash-and-batt configurations
    // Each part that uses both closed and open cell requires ~1h to switch between foams
    // TODO: Fetch this value from cost_variables table (foam_switching_hours)
    const foamSwitchingHoursPerPart = 1.0;
    const flashAndBattCount = recommendations.filter(rec =>
      rec.config.config === 'flash_and_batt'
    ).length;
    const totalSwitchingHours = flashAndBattCount * foamSwitchingHoursPerPart;

    const totalLaborHours = totalSprayHours + setupHours + travelHours + totalSwitchingHours;

    // Calculate labor cost properly
    // Need to get hourly rate - we can derive it from any part's labor_cost and spray_hours
    const personnelCostPerHour = recommendations[0].pricing.breakdown.spray_hours > 0
      ? recommendations[0].pricing.breakdown.labor_cost / recommendations[0].pricing.breakdown.total_labor_hours
      : 625; // fallback

    const totalLaborCost = totalLaborHours * personnelCostPerHour;

    // Sum material costs from all parts
    const totalMaterialCost = recommendations.reduce((sum, rec) => {
      return sum + (rec.pricing.breakdown.material_with_margin || 0);
    }, 0);

    // Shared costs (added once)
    const generatorCost = firstBreakdown.generator_cost || 0;
    const travelCost = firstBreakdown.travel_cost || 0;

    const totalExclVat = totalMaterialCost + totalLaborCost + generatorCost + travelCost;
    let totalInclVat = Math.round(totalExclVat * 1.25);

    // Apply ROT deduction (30% of labor cost after VAT)
    const laborCostInclVat = totalLaborCost * 1.25;
    const rotDeduction = applyRotDeduction ? Math.round(laborCostInclVat * 0.30) : 0;
    totalInclVat -= rotDeduction;

    return totalInclVat;
  })();

  // Also calculate the breakdown for display
  const costBreakdown = (() => {
    if (recommendations.length === 0) return null;

    const firstBreakdown = recommendations[0].pricing.breakdown;

    // Calculate correct labor totals
    const totalSprayHours = recommendations.reduce((sum, rec) => {
      return sum + (rec.pricing.breakdown.spray_hours || 0);
    }, 0);
    const setupHours = firstBreakdown.setup_hours || 0;
    const travelHours = firstBreakdown.travel_hours || 0;

    // Add foam switching time for flash-and-batt configurations
    const foamSwitchingHoursPerPart = 1.0;
    const flashAndBattCount = recommendations.filter(rec =>
      rec.config.config === 'flash_and_batt'
    ).length;
    const switchingHours = flashAndBattCount * foamSwitchingHoursPerPart;

    const totalLaborHours = totalSprayHours + setupHours + travelHours + switchingHours;

    // Calculate personnel cost per hour
    const personnelCostPerHour = recommendations[0].pricing.breakdown.spray_hours > 0
      ? recommendations[0].pricing.breakdown.labor_cost / recommendations[0].pricing.breakdown.total_labor_hours
      : 625;

    const totalLaborCost = totalLaborHours * personnelCostPerHour;
    const laborCostInclVat = totalLaborCost * 1.25;
    const rotDeduction = applyRotDeduction ? Math.round(laborCostInclVat * 0.30) : 0;

    return {
      generatorCost: firstBreakdown.generator_cost || 0,
      travelCost: firstBreakdown.travel_cost || 0,
      distanceKm: firstBreakdown.distance_km || 0,
      totalSprayHours,
      setupHours,
      travelHours,
      switchingHours,
      totalLaborHours,
      totalLaborCost,
      rotDeduction,
    };
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900">Laddar kalkylator...</div>
      </div>
    );
  }

  return (
    <div className="py-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-center mb-4 text-gray-800">
              Priskalkylator
            </h1>
            <p className="text-xl text-center text-gray-900 mb-4">
              Med daggpunktsanalys och svenska byggstandarder
            </p>
            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3, 4].map(s => (
                <button
                  key={s}
                  onClick={() => {
                    if (s === 1 || (s === 2 && buildingParts.length > 0) || (s === 3 && buildingParts.length > 0) || (s === 4 && recommendations.length > 0)) {
                      setStep(s);
                    }
                  }}
                  disabled={s === 1 ? false : (s === 2 || s === 3) ? buildingParts.length === 0 : recommendations.length === 0}
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition ${
                    step >= s
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-200 text-gray-700 cursor-not-allowed'
                  } ${s <= step ? 'cursor-pointer' : ''}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Step 1: Select Building Parts */}
          {step === 1 && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900">Steg 1: Välj byggnadsdelar</h2>
              <p className="text-gray-900 mb-6">
                Välj alla delar som ska isoleras. Du kan välja flera.
              </p>

              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {BUILDING_PART_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    onClick={() => togglePartSelection(option.id)}
                    className={`p-6 border-2 rounded-lg transition ${
                      selectedParts.includes(option.id)
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                  >
                    <div className="text-4xl mb-2">{option.icon}</div>
                    <div className="font-semibold text-lg text-gray-900">{option.name}</div>
                    {option.needsVaporCheck && (
                      <div className="text-sm text-gray-800 mt-1">
                        Kräver ångspärrsanalys
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={startPartConfiguration}
                disabled={selectedParts.length === 0}
                className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Nästa: Konfigurera {selectedParts.length} {selectedParts.length === 1 ? 'del' : 'delar'}
              </button>
            </div>
          )}

          {/* Step 2: Configure Each Part */}
          {step === 2 && currentPart && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-semibold mb-2 text-gray-900">
                Steg 2: {currentPart.name}
              </h2>
              <p className="text-gray-900 mb-6">
                Del {currentPartIndex + 1} av {buildingParts.length}
              </p>

              <div className="space-y-6">
                {/* Area */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yta (m²) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={currentPart.area || ''}
                    onChange={(e) => updateCurrentPart({ area: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                    placeholder="T.ex. 85.5"
                  />
                </div>

                {/* Target thickness */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Önskad tjocklek (mm) - valfritt
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="300"
                    step="10"
                    value={currentPart.targetThickness || ''}
                    onChange={(e) => updateCurrentPart({ targetThickness: parseFloat(e.target.value) || undefined })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                    placeholder="Lämna tom för automatisk beräkning"
                  />
                  <p className="text-sm text-gray-800 mt-1">
                    Om du vet hur tjock isoleringen ska vara. Annars beräknas minimum enligt BBR.
                  </p>
                </div>

                {/* Vapor barrier check */}
                {currentOption?.needsVaporCheck && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Finns det ångspärr installerad? *
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-start cursor-pointer p-4 border-2 rounded-lg hover:bg-gray-50 transition">
                        <input
                          type="radio"
                          name={`vapor-${currentPart.id}`}
                          checked={currentPart.hasVaporBarrier === true}
                          onChange={() => updateCurrentPart({ hasVaporBarrier: true })}
                          className="mt-1 mr-3"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Ja, ångspärr finns</div>
                          <div className="text-sm text-gray-900">
                            Exempelvis plastfolie eller befintlig ångspärr installerad på varm sida
                          </div>
                        </div>
                      </label>
                      <label className="flex items-start cursor-pointer p-4 border-2 rounded-lg hover:bg-gray-50 transition">
                        <input
                          type="radio"
                          name={`vapor-${currentPart.id}`}
                          checked={currentPart.hasVaporBarrier === false}
                          onChange={() => updateCurrentPart({ hasVaporBarrier: false })}
                          className="mt-1 mr-3"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Nej, ingen ångspärr</div>
                          <div className="text-sm text-gray-900">
                            Vi rekommenderar då slutencellsskum som fungerar som ångspärr
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-8">
                {currentPartIndex > 0 && (
                  <button
                    onClick={previousPart}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    Föregående
                  </button>
                )}
                <button
                  onClick={nextPart}
                  disabled={!currentPart.area || (currentOption?.needsVaporCheck && currentPart.hasVaporBarrier === undefined)}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-300"
                >
                  {currentPartIndex < buildingParts.length - 1 ? 'Nästa del' : 'Nästa: Klimatinställningar'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Climate Settings & Location */}
          {step === 3 && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900">Steg 3: Plats & Klimatförhållanden</h2>
              <p className="text-gray-900 mb-6">
                Dessa uppgifter används för daggpunktsberäkningar och för att beräkna transportkostnad.
              </p>

              <div className="space-y-6">
                {/* Customer Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Projektets adress *
                  </label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Gatuadress, Postnummer Ort"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                  />
                  <p className="text-sm text-gray-800 mt-1">
                    Används för att beräkna transportkostnad från Gävle och bestämma klimatzon
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Klimatzon
                  </label>
                  <select
                    value={climateZone}
                    onChange={(e) => setClimateZone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                  >
                    {Object.entries(CLIMATE_ZONES).map(([zone, temp]) => (
                      <option key={zone} value={zone}>
                        {zone} (Utetemperatur vinter: {temp}°C)
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-800 mt-1">
                    Välj baserat på projektets geografiska läge
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inomhustemperatur (°C)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="25"
                    step="0.5"
                    value={indoorTemp}
                    onChange={(e) => setIndoorTemp(parseFloat(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                  />
                  <p className="text-sm text-gray-800 mt-1">
                    Standard för bostäder: 21°C
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relativ luftfuktighet inomhus (%)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="95"
                    step="5"
                    value={indoorRH}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        setIndoorRH(val);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                  />
                  <p className="text-sm text-gray-800 mt-1">
                    Standard för bostäder: 40% (30-50% är normalt)
                  </p>
                </div>

                {/* 3-Phase Outlet */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Finns det 3-fas 16A uttag på arbetsplatsen? *
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-start cursor-pointer p-4 border-2 rounded-lg hover:bg-gray-50 transition">
                      <input
                        type="radio"
                        name="three-phase"
                        checked={hasThreePhase === true}
                        onChange={() => setHasThreePhase(true)}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">Ja, 3-fas finns</div>
                        <div className="text-sm text-gray-900">
                          Vi kan koppla vår utrustning direkt till befintligt uttag
                        </div>
                      </div>
                    </label>
                    <label className="flex items-start cursor-pointer p-4 border-2 rounded-lg hover:bg-gray-50 transition">
                      <input
                        type="radio"
                        name="three-phase"
                        checked={hasThreePhase === false}
                        onChange={() => setHasThreePhase(false)}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">Nej, inget 3-fas uttag</div>
                        <div className="text-sm text-gray-900">
                          Vi tar med portabel generator (+2 000 kr)
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* ROT-avdrag */}
                <div>
                  <label className="flex items-start cursor-pointer p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition bg-blue-50">
                    <input
                      type="checkbox"
                      checked={applyRotDeduction}
                      onChange={(e) => setApplyRotDeduction(e.target.checked)}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Jag vill ansöka om ROT-avdrag</div>
                      <div className="text-sm text-gray-900">
                        För privatpersoner: 30% avdrag på arbetskostnaden efter moms
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Tillbaka
                </button>
                <button
                  onClick={calculateRecommendations}
                  disabled={!customerAddress || hasThreePhase === null}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Beräkna rekommendationer
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-3xl font-semibold mb-2 text-center text-gray-900">Rekommendationer</h2>
                <p className="text-center text-gray-900 mb-6">
                  Baserat på byggfysik, daggpunktsanalys och BBR-krav
                </p>
              </div>

              {recommendations.map((rec, idx) => {
                // Calculate part-specific cost (material + spray labor only, not including shared costs)
                const breakdown = rec.pricing.breakdown;

                // Calculate hourly rate
                const personnelCostPerHour = breakdown.total_labor_hours > 0
                  ? breakdown.labor_cost / breakdown.total_labor_hours
                  : 625;

                // Only spray labor for this part
                const partSprayLaborCost = breakdown.spray_hours * personnelCostPerHour;
                const partCostExclVat = (breakdown.material_with_margin || 0) + partSprayLaborCost;
                const partCostInclVat = Math.round(partCostExclVat * 1.25);

                return (
                  <div key={idx} className="bg-white rounded-lg shadow-md p-8">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-semibold text-gray-900">{rec.part.name}</h3>
                        <p className="text-gray-900">{rec.part.area} m²</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-green-600">
                          {partCostInclVat.toLocaleString('sv-SE')} kr
                        </div>
                        <div className="text-sm text-gray-900">inkl. moms</div>
                      </div>
                    </div>

                    {/* Configuration */}
                    <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4">
                      <h4 className="font-semibold text-green-900 mb-2">Rekommenderad lösning:</h4>
                      <p className="text-green-800">{rec.config.explanation}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h5 className="font-semibold text-gray-900 mb-2">Specifikation:</h5>
                        <ul className="space-y-1 text-sm text-gray-700">
                          {rec.config.closedThickness > 0 && (
                            <li>• Slutencellsskum: {rec.config.closedThickness} mm</li>
                          )}
                          {rec.config.openThickness > 0 && (
                            <li>• Öppencellsskum: {rec.config.openThickness} mm</li>
                          )}
                          <li>• Total tjocklek: {rec.config.totalThickness} mm</li>
                          <li>• U-värde: {rec.config.uValue.toFixed(3)} W/(m²·K)</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-900 mb-2">Kostnadsuppdelning:</h5>
                        <ul className="space-y-1 text-sm text-gray-700">
                          <li>• Exkl. moms: {partCostExclVat.toLocaleString('sv-SE')} kr</li>
                          <li>• Moms (25%): {Math.round(partCostExclVat * 0.25).toLocaleString('sv-SE')} kr</li>
                          <li>• <strong>Totalt inkl. moms: {partCostInclVat.toLocaleString('sv-SE')} kr</strong></li>
                        </ul>
                      </div>
                    </div>

                    {/* Risk Analysis */}
                    {rec.riskAnalysis && (
                      <div className={`border-l-4 p-4 ${
                        rec.riskAnalysis.risk === 'low' ? 'bg-green-50 border-green-600' :
                        rec.riskAnalysis.risk === 'medium' ? 'bg-yellow-50 border-yellow-600' :
                        'bg-red-50 border-red-600'
                      }`}>
                        <h5 className="font-semibold text-gray-900 mb-2">
                          Kondensationsrisk: {
                            rec.riskAnalysis.risk === 'low' ? 'LÅG ✓' :
                            rec.riskAnalysis.risk === 'medium' ? 'MEDEL ⚠️' :
                            'HÖG ⚠️'
                          }
                        </h5>
                        <p className="text-sm mb-2 text-gray-900">{rec.riskAnalysis.explanation}</p>
                        <p className="text-xs text-gray-900">
                          Daggpunkt inomhus: {rec.riskAnalysis.dewPointInside.toFixed(1)}°C
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Total Summary */}
              <div className="bg-green-700 text-white rounded-lg shadow-md p-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-semibold mb-2 text-white">Total Kostnad</h3>
                    <p className="text-green-100">
                      För {buildingParts.length} {buildingParts.length === 1 ? 'del' : 'delar'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-white">
                      {totalCost.toLocaleString('sv-SE')} kr
                    </div>
                    <div className="text-green-100">inkl. moms</div>
                  </div>
                </div>

                {costBreakdown && (
                  <div className="mt-6 pt-6 border-t border-green-600">
                    <p className="mb-3 text-white font-semibold">Kostnadsuppdelning:</p>
                    <div className="space-y-2 text-sm">
                      {/* Material costs */}
                      <div className="flex justify-between text-green-100">
                        <span>Material (inkl. marginal):</span>
                        <span>{recommendations.reduce((sum, rec) => {
                          const breakdown = rec.pricing.breakdown;
                          return sum + (breakdown.material_with_margin || 0);
                        }, 0).toLocaleString('sv-SE')} kr</span>
                      </div>

                      {/* Labor costs with detailed breakdown */}
                      {costBreakdown && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-green-100">
                            <span className="font-medium">Arbetskostnad:</span>
                            <span className="font-medium">{costBreakdown.totalLaborCost.toLocaleString('sv-SE')} kr</span>
                          </div>
                          <div className="ml-4 space-y-1 text-sm">
                            {/* Spray hours */}
                            {costBreakdown.totalSprayHours > 0 && (
                              <div className="flex justify-between text-green-200">
                                <span>• Sprutningstid: {costBreakdown.totalSprayHours.toFixed(1)} h</span>
                              </div>
                            )}
                            {/* Switching hours (flash-and-batt) */}
                            {costBreakdown.switchingHours > 0 && (
                              <div className="flex justify-between text-green-200">
                                <span>• Skumbyte (flash-and-batt): {costBreakdown.switchingHours.toFixed(1)} h</span>
                              </div>
                            )}
                            {/* Establishment hours (includes travel) */}
                            {(costBreakdown.setupHours + costBreakdown.travelHours) > 0 && (
                              <div className="flex justify-between text-green-200">
                                <span>• Etablering (inkl. restid): {(costBreakdown.setupHours + costBreakdown.travelHours).toFixed(1)} h</span>
                              </div>
                            )}
                            {/* Total hours */}
                            <div className="flex justify-between text-green-200 font-medium pt-1 border-t border-green-500">
                              <span>Totalt: {costBreakdown.totalLaborHours.toFixed(1)} h</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Travel cost */}
                      {costBreakdown.travelCost > 0 && (
                        <div className="flex justify-between text-green-100">
                          <span>Transport ({costBreakdown.distanceKm} km från Gävle):</span>
                          <span>{costBreakdown.travelCost.toLocaleString('sv-SE')} kr</span>
                        </div>
                      )}

                      {/* Generator cost */}
                      {costBreakdown.generatorCost > 0 && (
                        <div className="flex justify-between text-green-100">
                          <span>Portabel generator:</span>
                          <span>{costBreakdown.generatorCost.toLocaleString('sv-SE')} kr</span>
                        </div>
                      )}

                      {/* Subtotal before VAT */}
                      <div className="flex justify-between text-green-100 pt-2 border-t border-green-600">
                        <span className="font-medium">Summa exkl. moms:</span>
                        <span className="font-medium">{(() => {
                          const materialTotal = recommendations.reduce((sum, rec) => {
                            return sum + (rec.pricing.breakdown.material_with_margin || 0);
                          }, 0);
                          const subtotal = materialTotal + costBreakdown.totalLaborCost + costBreakdown.travelCost + costBreakdown.generatorCost;
                          return subtotal.toLocaleString('sv-SE');
                        })()} kr</span>
                      </div>

                      {/* VAT */}
                      <div className="flex justify-between text-green-100">
                        <span>Moms (25%):</span>
                        <span>{(() => {
                          const materialTotal = recommendations.reduce((sum, rec) => {
                            return sum + (rec.pricing.breakdown.material_with_margin || 0);
                          }, 0);
                          const subtotal = materialTotal + costBreakdown.totalLaborCost + costBreakdown.travelCost + costBreakdown.generatorCost;
                          return Math.round(subtotal * 0.25).toLocaleString('sv-SE');
                        })()} kr</span>
                      </div>

                      {/* Total incl VAT */}
                      <div className="flex justify-between text-white pt-2 border-t border-green-600">
                        <span className="font-semibold">Totalt inkl. moms:</span>
                        <span className="font-semibold">{(() => {
                          const materialTotal = recommendations.reduce((sum, rec) => {
                            return sum + (rec.pricing.breakdown.material_with_margin || 0);
                          }, 0);
                          const subtotal = materialTotal + costBreakdown.totalLaborCost + costBreakdown.travelCost + costBreakdown.generatorCost;
                          return Math.round(subtotal * 1.25).toLocaleString('sv-SE');
                        })()} kr</span>
                      </div>

                      {/* ROT deduction */}
                      {costBreakdown.rotDeduction > 0 && (
                        <>
                          <div className="flex justify-between text-green-100">
                            <span>ROT-avdrag (30% av arbetskostnad):</span>
                            <span className="text-yellow-300">- {costBreakdown.rotDeduction.toLocaleString('sv-SE')} kr</span>
                          </div>
                          <div className="flex justify-between text-white pt-2 border-t border-green-600 text-lg">
                            <span className="font-bold">Att betala efter ROT-avdrag:</span>
                            <span className="font-bold">{totalCost.toLocaleString('sv-SE')} kr</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    // Calculate totals for storage
                    const materialTotal = recommendations.reduce((sum, rec) => {
                      return sum + (rec.pricing.breakdown.material_with_margin || 0);
                    }, 0);
                    const totalExclVat = materialTotal + (costBreakdown?.totalLaborCost || 0) + (costBreakdown?.travelCost || 0) + (costBreakdown?.generatorCost || 0);
                    const totalInclVatBeforeRot = Math.round(totalExclVat * 1.25);
                    const finalTotalInclVat = totalInclVatBeforeRot - (costBreakdown?.rotDeduction || 0);

                    // Build recommendation data for storage
                    const recommendationData = recommendations.map(rec => ({
                      partId: rec.part.id,
                      partName: rec.part.name,
                      partType: rec.part.type,
                      area: rec.part.area,
                      hasVaporBarrier: rec.part.hasVaporBarrier ?? false,
                      targetThickness: rec.part.targetThickness || 0,
                      closedCellThickness: rec.config.closedThickness,
                      openCellThickness: rec.config.openThickness,
                      totalThickness: rec.config.totalThickness,
                      closedCellKg: rec.pricing.breakdown.closed_cell_kg || 0,
                      openCellKg: rec.pricing.breakdown.open_cell_kg || 0,
                      closedCellCost: rec.pricing.breakdown.closed_material_cost || 0,
                      openCellCost: rec.pricing.breakdown.open_material_cost || 0,
                      materialCost: rec.pricing.breakdown.material_with_margin || 0,
                      laborHours: rec.pricing.breakdown.spray_hours || 0,
                      laborCost: (rec.pricing.breakdown.spray_hours || 0) * ((costBreakdown?.totalLaborCost || 0) / (costBreakdown?.totalLaborHours || 1)),
                      totalCost: rec.pricing.totalExclVat || 0,
                      condensationRisk: rec.riskAnalysis?.risk || 'unknown',
                      meetsUValue: rec.config.meetsUValue ?? true,
                      actualUValue: rec.config.uValue || 0,
                      requiredUValue: rec.config.requiredUValue || 0,
                      // Additional fields for detailed display
                      configType: rec.config.config as 'closed_only' | 'open_only' | 'flash_and_batt',
                      configExplanation: rec.config.config === 'closed_only' ? 'Endast slutencell' :
                                        rec.config.config === 'open_only' ? 'Endast öppencell' : 'Flash & Batt',
                      condensationAnalysis: rec.riskAnalysis ? {
                        risk: rec.riskAnalysis.risk,
                        dewPointInside: rec.riskAnalysis.dewPointInside,
                        tempAtInterface: rec.riskAnalysis.tempAtInterface,
                        explanation: rec.riskAnalysis.explanation,
                        safetyMargin: rec.riskAnalysis.safetyMargin,
                      } : undefined,
                    }));

                    const quoteData = {
                      recommendations: recommendationData,
                      climate: {
                        zone: climateZone,
                        indoorTemp,
                        indoorRH,
                        outdoorTemp,
                      },
                      options: {
                        hasThreePhase: hasThreePhase ?? false,
                        applyRotDeduction,
                        customerAddress,
                      },
                      totals: {
                        totalArea: buildingParts.reduce((sum, p) => sum + p.area, 0),
                        totalClosedCellKg: recommendations.reduce((sum, rec) => sum + (rec.pricing.breakdown.closed_cell_kg || 0), 0),
                        totalOpenCellKg: recommendations.reduce((sum, rec) => sum + (rec.pricing.breakdown.open_cell_kg || 0), 0),
                        materialCostTotal: materialTotal,
                        laborCostTotal: costBreakdown?.totalLaborCost || 0,
                        travelCost: costBreakdown?.travelCost || 0,
                        generatorCost: costBreakdown?.generatorCost || 0,
                        totalExclVat,
                        vat: Math.round(totalExclVat * 0.25),
                        totalInclVat: totalInclVatBeforeRot,
                        rotDeduction: costBreakdown?.rotDeduction || 0,
                        finalTotal: finalTotalInclVat,
                        sprayHours: costBreakdown?.totalSprayHours || 0,
                        setupHours: costBreakdown?.setupHours || 0,
                        travelHours: costBreakdown?.travelHours || 0,
                        switchingHours: costBreakdown?.switchingHours || 0,
                        totalHours: costBreakdown?.totalLaborHours || 0,
                        distanceKm: costBreakdown?.distanceKm || 0,
                      },
                      timestamp: Date.now(),
                    };

                    sessionStorage.setItem('quoteCalculationData', JSON.stringify(quoteData));
                    window.location.href = '/kontakt?from=calculator';
                  }}
                  className="block w-full bg-white text-green-700 py-4 rounded-lg font-semibold hover:bg-green-50 transition text-center mt-6 cursor-pointer"
                >
                  Få Exakt Offert
                </button>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  ← Tillbaka till klimatinställningar
                </button>
                <button
                  onClick={() => {
                    setStep(1);
                    setSelectedParts([]);
                    setBuildingParts([]);
                    setRecommendations([]);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Starta om kalkylering
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
