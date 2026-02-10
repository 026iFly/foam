import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/supabase-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List own blocked dates
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabaseAdmin
      .from('installer_blocked_dates')
      .select('*')
      .eq('installer_id', user.id)
      .order('blocked_date', { ascending: true });

    if (from) query = query.gte('blocked_date', from);
    if (to) query = query.lte('blocked_date', to);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ blocked_dates: data || [] });
  } catch (err) {
    console.error('Installer blocked dates GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Add own blocked date(s)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { dates, slot, reason } = body;

    const dateList = Array.isArray(dates) ? dates : [dates];

    const rows = dateList.map((d: string) => ({
      installer_id: user.id,
      blocked_date: d,
      slot: slot || 'full',
      reason: reason || null,
      created_by: user.id,
    }));

    const { data, error } = await supabaseAdmin
      .from('installer_blocked_dates')
      .upsert(rows, { onConflict: 'installer_id,blocked_date,slot' })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ blocked_dates: data });
  } catch (err) {
    console.error('Installer blocked dates POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Remove own blocked date
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateId = searchParams.get('date_id');

    if (!dateId) {
      return NextResponse.json({ error: 'date_id required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('installer_blocked_dates')
      .delete()
      .eq('id', parseInt(dateId))
      .eq('installer_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Installer blocked dates DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
