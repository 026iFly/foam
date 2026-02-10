import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Assign installer(s) to a booking
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingId = parseInt(id, 10);

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    const body = await request.json();
    const { installer_ids, lead_id } = body;

    if (!installer_ids || !Array.isArray(installer_ids) || installer_ids.length === 0) {
      return NextResponse.json(
        { error: 'installer_ids array is required' },
        { status: 400 }
      );
    }

    // Remove existing assignments
    await supabaseAdmin
      .from('booking_installers')
      .delete()
      .eq('booking_id', bookingId);

    // Create new assignments
    const rows = installer_ids.map((installerId: string) => ({
      booking_id: bookingId,
      installer_id: installerId,
      is_lead: installerId === lead_id,
      status: 'pending',
    }));

    const { data, error } = await supabaseAdmin
      .from('booking_installers')
      .insert(rows)
      .select();

    if (error) {
      console.error('Error assigning installers:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ assignments: data });
  } catch (err) {
    console.error('Assign POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT - Update assignments (change lead or individual statuses)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingId = parseInt(id, 10);

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    const body = await request.json();
    const { installer_ids, lead_id } = body;

    if (installer_ids) {
      // Full replacement
      await supabaseAdmin
        .from('booking_installers')
        .delete()
        .eq('booking_id', bookingId);

      const rows = installer_ids.map((installerId: string) => ({
        booking_id: bookingId,
        installer_id: installerId,
        is_lead: installerId === lead_id,
        status: 'pending',
      }));

      const { data, error } = await supabaseAdmin
        .from('booking_installers')
        .insert(rows)
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ assignments: data });
    }

    // Update lead only
    if (lead_id) {
      await supabaseAdmin
        .from('booking_installers')
        .update({ is_lead: false })
        .eq('booking_id', bookingId);

      await supabaseAdmin
        .from('booking_installers')
        .update({ is_lead: true })
        .eq('booking_id', bookingId)
        .eq('installer_id', lead_id);
    }

    // Return current assignments
    const { data } = await supabaseAdmin
      .from('booking_installers')
      .select('*')
      .eq('booking_id', bookingId);

    return NextResponse.json({ assignments: data || [] });
  } catch (err) {
    console.error('Assign PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
