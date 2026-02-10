import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { autoAssignInstallers } from '@/lib/auto-assign';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Customer picks a slot, triggers auto-assignment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json({ error: 'Datum krävs' }, { status: 400 });
    }

    // Find booking by customer token
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('id, status, scheduled_date')
      .eq('customer_token', token)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: 'Bokning ej hittad' }, { status: 404 });
    }

    // Update booking with selected date
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        scheduled_date: date,
        customer_booked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Auto-assign installers
    const result = await autoAssignInstallers(booking.id);

    return NextResponse.json({
      success: true,
      message: 'Datum valt och installatörer tilldelade',
      date,
      assignment: result,
    });
  } catch (err) {
    console.error('Customer book POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
