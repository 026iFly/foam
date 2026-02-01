import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all settings
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('*');

    if (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: data || [] });
  } catch (err) {
    console.error('Settings GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
