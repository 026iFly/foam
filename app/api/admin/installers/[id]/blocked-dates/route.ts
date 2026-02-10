import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List blocked dates for an installer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabaseAdmin
      .from('installer_blocked_dates')
      .select('*')
      .eq('installer_id', id)
      .order('blocked_date', { ascending: true });

    if (from) query = query.gte('blocked_date', from);
    if (to) query = query.lte('blocked_date', to);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ blocked_dates: data || [] });
  } catch (err) {
    console.error('Blocked dates GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Add blocked date(s)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { dates, slot, reason } = body;

    // Support both single date and array of dates
    const dateList = Array.isArray(dates) ? dates : [dates];

    if (dateList.length === 0) {
      return NextResponse.json({ error: 'At least one date is required' }, { status: 400 });
    }

    const rows = dateList.map((d: string) => ({
      installer_id: id,
      blocked_date: d,
      slot: slot || 'full',
      reason: reason || null,
    }));

    const { data, error } = await supabaseAdmin
      .from('installer_blocked_dates')
      .upsert(rows, { onConflict: 'installer_id,blocked_date,slot' })
      .select();

    if (error) {
      console.error('Error adding blocked dates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ blocked_dates: data });
  } catch (err) {
    console.error('Blocked dates POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Remove blocked date(s)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const dateId = searchParams.get('date_id');
    const date = searchParams.get('date');

    if (dateId) {
      const { error } = await supabaseAdmin
        .from('installer_blocked_dates')
        .delete()
        .eq('id', parseInt(dateId))
        .eq('installer_id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else if (date) {
      const { error } = await supabaseAdmin
        .from('installer_blocked_dates')
        .delete()
        .eq('installer_id', id)
        .eq('blocked_date', date);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'date_id or date query param required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Blocked dates DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
