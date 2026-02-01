import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get single setting
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;

    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('*')
      .eq('key', key)
      .single();

    if (error) {
      console.error('Error fetching setting:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ setting: data });
  } catch (err) {
    console.error('Setting GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT - Update setting
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const body = await request.json();
    const { value } = body;

    if (value === undefined) {
      return NextResponse.json({ error: 'Value is required' }, { status: 400 });
    }

    // Upsert the setting
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .upsert({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating setting:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ setting: data });
  } catch (err) {
    console.error('Setting PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
