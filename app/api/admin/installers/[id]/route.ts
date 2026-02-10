import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch a single installer profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: installer, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .not('installer_type', 'is', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Installer not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch blocked dates
    const { data: blockedDates } = await supabaseAdmin
      .from('installer_blocked_dates')
      .select('*')
      .eq('installer_id', id)
      .gte('blocked_date', new Date().toISOString().split('T')[0])
      .order('blocked_date', { ascending: true });

    // Fetch upcoming assignments
    const { data: assignments } = await supabaseAdmin
      .from('booking_installers')
      .select(`
        *,
        bookings (
          id, scheduled_date, scheduled_time, status, slot_type,
          quote_requests (customer_name, customer_address)
        )
      `)
      .eq('installer_id', id)
      .neq('status', 'declined');

    // Fetch contracts
    const { data: contracts } = await supabaseAdmin
      .from('installer_contracts')
      .select('*')
      .eq('installer_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      installer,
      blocked_dates: blockedDates || [],
      assignments: (assignments || []).map((a) => ({
        ...a,
        booking: a.bookings,
        bookings: undefined,
      })),
      contracts: contracts || [],
    });
  } catch (err) {
    console.error('Installer GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT - Update installer profile
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { installer_type, hourly_rate, hardplast_expiry, priority_order, is_active } = body;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (installer_type !== undefined) updateData.installer_type = installer_type;
    if (hourly_rate !== undefined) updateData.hourly_rate = hourly_rate;
    if (hardplast_expiry !== undefined) updateData.hardplast_expiry = hardplast_expiry || null;
    if (priority_order !== undefined) updateData.priority_order = priority_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: installer, error } = await supabaseAdmin
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)
      .not('installer_type', 'is', null)
      .select()
      .single();

    if (error) {
      console.error('Error updating installer:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ installer });
  } catch (err) {
    console.error('Installer PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
