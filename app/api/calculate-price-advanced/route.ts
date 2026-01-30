import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculateDistanceToCustomer } from '@/lib/distance-calculator';

interface CostVariables {
  [key: string]: number;
}

async function getCostVariables(): Promise<CostVariables> {
  const { data, error } = await supabase
    .from('cost_variables')
    .select('variable_key, variable_value');

  if (error) {
    console.error('Error fetching cost variables:', error);
    throw error;
  }

  const vars: CostVariables = {};
  for (const v of data || []) {
    vars[v.variable_key] = v.variable_value;
  }
  return vars;
}

export async function POST(request: NextRequest) {
  try {
    const {
      area,
      thickness_mm,
      foam_type,
      project_type,
      customer_address,
      has_three_phase,
      apply_rot_deduction = false,
    } = await request.json();

    // Validation
    if (!area || !thickness_mm || !foam_type) {
      return NextResponse.json(
        { error: 'Missing required fields: area, thickness_mm, foam_type' },
        { status: 400 }
      );
    }

    // Get cost variables from database
    const vars = await getCostVariables();

    // Select the right variables based on foam type
    const materialCost =
      foam_type === 'closed'
        ? vars.closed_material_cost
        : vars.open_material_cost;
    const margin =
      foam_type === 'closed' ? vars.closed_margin : vars.open_margin;
    const density =
      foam_type === 'closed' ? vars.closed_density : vars.open_density;
    const sprayTimePerM3 =
      foam_type === 'closed' ? vars.closed_spray_time : vars.open_spray_time;

    // Calculate volume in m³
    const volume_m3 = (area * thickness_mm) / 1000;

    // Calculate material cost
    const materialKg = volume_m3 * density;
    const materialCostTotal = materialKg * materialCost;
    const materialWithMargin = materialCostTotal * (1 + margin / 100);

    // Calculate spray hours - apply project multiplier
    let sprayHours = volume_m3 * sprayTimePerM3;

    // Apply project type multiplier to spray hours if available
    if (project_type) {
      const { data: multiplierRow } = await supabase
        .from('project_multipliers')
        .select('multiplier')
        .eq('project_type', project_type)
        .single();

      if (multiplierRow) {
        sprayHours *= multiplierRow.multiplier;
      }
    }

    // Add setup hours
    const setupHours = vars.setup_hours || 0;

    // Calculate travel time and cost if address provided
    let travelCost = 0;
    let distanceKm = 0;
    let travelHours = 0;
    if (customer_address) {
      try {
        // Calculate distance directly (no HTTP request needed)
        const distanceResult = await calculateDistanceToCustomer(customer_address);

        if (distanceResult) {
          distanceKm = distanceResult.distance_km;

          // Calculate travel time (round trip) in hours
          const averageSpeed = vars.average_travel_speed_kmh || 80;
          travelHours = (distanceKm * 2) / averageSpeed; // Round trip

          // Calculate travel cost (fixed + per km)
          travelCost =
            vars.travel_base_cost + distanceKm * vars.travel_cost_per_km;
        }
      } catch (err) {
        console.error('Travel calculation error:', err);
        // Continue without travel cost if calculation fails
      }
    }

    // Total labor hours = spray + setup + travel
    const totalLaborHours = sprayHours + setupHours + travelHours;
    const laborCost = totalLaborHours * vars.personnel_cost_per_hour;

    // Base cost (material + labor)
    let totalCost = materialWithMargin + laborCost;

    // Add travel cost (vehicle costs, separate from labor)
    totalCost += travelCost;

    // Add generator cost if no 3-phase outlet
    let generatorCost = 0;
    if (has_three_phase === false) {
      generatorCost = vars.generator_cost;
      totalCost += generatorCost;
    }

    // Calculate VAT (25%)
    const totalExclVat = Math.round(totalCost);
    let totalInclVat = Math.round(totalCost * 1.25);

    // Calculate ROT deduction (30% of total labor cost after VAT)
    // Labor includes: spray time + setup time + travel time
    let rotDeduction = 0;
    if (apply_rot_deduction) {
      const laborCostInclVat = laborCost * 1.25;
      rotDeduction = Math.round(laborCostInclVat * 0.30);
      totalInclVat -= rotDeduction;
    }

    return NextResponse.json({
      price_excl_vat: totalExclVat,
      price_incl_vat: totalInclVat,
      rot_deduction: rotDeduction,
      breakdown: {
        material_kg: Math.round(materialKg * 10) / 10,
        material_cost: Math.round(materialCostTotal),
        material_with_margin: Math.round(materialWithMargin),
        spray_hours: Math.round(sprayHours * 10) / 10,
        setup_hours: Math.round(setupHours * 10) / 10,
        travel_hours: Math.round(travelHours * 10) / 10,
        total_labor_hours: Math.round(totalLaborHours * 10) / 10,
        labor_cost: Math.round(laborCost),
        generator_cost: generatorCost,
        distance_km: distanceKm,
        travel_cost: Math.round(travelCost),
        foam_type,
        area,
        thickness_mm,
        volume_m3: Math.round(volume_m3 * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Price calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate price' },
      { status: 500 }
    );
  }
}
