import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/supabase-auth';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEFAULT_PROJECT_MULTIPLIERS = [
  {
    project_type: 'tak',
    multiplier: 1.2,
    description: 'Tak/Vind - Overhead work adds time',
    is_active: true,
  },
  {
    project_type: 'yttervagg',
    multiplier: 1.0,
    description: 'Yttervägg - Standard work',
    is_active: true,
  },
  {
    project_type: 'innervagg',
    multiplier: 1.0,
    description: 'Innervägg - Standard work',
    is_active: true,
  },
  {
    project_type: 'golv',
    multiplier: 0.9,
    description: 'Golv mot mark - Easier access',
    is_active: true,
  },
];

export async function POST() {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check which multipliers already exist
    const { data: existing } = await supabaseAdmin
      .from('project_multipliers')
      .select('project_type');

    const existingTypes = new Set((existing || []).map(m => m.project_type));

    // Filter out multipliers that already exist
    const toInsert = DEFAULT_PROJECT_MULTIPLIERS.filter(
      m => !existingTypes.has(m.project_type)
    );

    if (toInsert.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Alla projektmultiplikatorer finns redan',
        inserted: 0,
      });
    }

    // Insert new multipliers
    const { error } = await supabaseAdmin
      .from('project_multipliers')
      .insert(toInsert);

    if (error) {
      console.error('Error inserting project multipliers:', error);
      return NextResponse.json(
        { error: `Kunde inte lägga till multiplikatorer: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${toInsert.length} projektmultiplikatorer tillagda`,
      inserted: toInsert.length,
      multipliers: toInsert.map(m => m.project_type),
    });
  } catch (error) {
    console.error('Error in project multipliers setup:', error);
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
      .from('project_multipliers')
      .select('*')
      .order('project_type');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      multipliers: data || [],
      expected: DEFAULT_PROJECT_MULTIPLIERS.map(m => m.project_type),
    });
  } catch (error) {
    console.error('Error fetching project multipliers:', error);
    return NextResponse.json({ error: 'Ett fel uppstod' }, { status: 500 });
  }
}
