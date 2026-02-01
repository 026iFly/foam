import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/supabase-auth';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUILDING_PHYSICS_VARIABLES = [
  {
    variable_key: 'condensation_safety_margin',
    variable_value: 2.0,
    variable_unit: '°C',
    description: 'Säkerhetsmarginal över daggpunkt',
    category: 'building_physics',
  },
  {
    variable_key: 'closed_cell_min_airtightness',
    variable_value: 40,
    variable_unit: 'mm',
    description: 'Minsta tjocklek för lufttäthet (slutencell)',
    category: 'building_physics',
  },
  {
    variable_key: 'flash_batt_min_open_thickness',
    variable_value: 50,
    variable_unit: 'mm',
    description: 'Minsta öppencellstjocklek för flash-and-batt',
    category: 'building_physics',
  },
  {
    variable_key: 'indoor_temp_standard',
    variable_value: 21,
    variable_unit: '°C',
    description: 'Standard inomhustemperatur',
    category: 'building_physics',
  },
  {
    variable_key: 'indoor_rh_standard',
    variable_value: 40,
    variable_unit: '%',
    description: 'Standard relativ luftfuktighet inomhus',
    category: 'building_physics',
  },
  {
    variable_key: 'closed_cell_lambda',
    variable_value: 0.024,
    variable_unit: 'W/(m·K)',
    description: 'Värmeledningsförmåga slutencellsskum',
    category: 'building_physics',
  },
  {
    variable_key: 'open_cell_lambda',
    variable_value: 0.040,
    variable_unit: 'W/(m·K)',
    description: 'Värmeledningsförmåga öppencellsskum',
    category: 'building_physics',
  },
  {
    variable_key: 'closed_cell_sd_value',
    variable_value: 100,
    variable_unit: 'm',
    description: 'Ångdiffusionsmotstånd slutencellsskum',
    category: 'building_physics',
  },
  {
    variable_key: 'open_cell_sd_value',
    variable_value: 0.3,
    variable_unit: 'm',
    description: 'Ångdiffusionsmotstånd öppencellsskum',
    category: 'building_physics',
  },
  // Note: density and material_cost are in pricing category (closed_density, open_density, etc.)
];

export async function POST() {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check which variables already exist
    const { data: existing } = await supabaseAdmin
      .from('cost_variables')
      .select('variable_key')
      .eq('category', 'building_physics');

    const existingKeys = new Set((existing || []).map(v => v.variable_key));

    // Filter out variables that already exist
    const toInsert = BUILDING_PHYSICS_VARIABLES.filter(
      v => !existingKeys.has(v.variable_key)
    );

    if (toInsert.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Alla byggnadsfysik-variabler finns redan',
        inserted: 0,
      });
    }

    // Insert new variables
    const { error } = await supabaseAdmin
      .from('cost_variables')
      .insert(toInsert);

    if (error) {
      console.error('Error inserting building physics variables:', error);
      return NextResponse.json(
        { error: `Kunde inte lägga till variabler: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${toInsert.length} byggnadsfysik-variabler tillagda`,
      inserted: toInsert.length,
      variables: toInsert.map(v => v.variable_key),
    });
  } catch (error) {
    console.error('Error in building physics setup:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod' },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('cost_variables')
      .select('*')
      .eq('category', 'building_physics')
      .order('variable_key');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      variables: data || [],
      expected: BUILDING_PHYSICS_VARIABLES.map(v => v.variable_key),
    });
  } catch (error) {
    console.error('Error fetching building physics variables:', error);
    return NextResponse.json({ error: 'Ett fel uppstod' }, { status: 500 });
  }
}
