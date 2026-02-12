import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyBookingCancelled } from '@/lib/discord';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Customer cancels a booking
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find quote by customer token
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quote_requests')
      .select('id, customer_name')
      .eq('customer_token', token)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Offert ej hittad' }, { status: 404 });
    }

    // Find the booking linked to this quote
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('id, scheduled_date, status')
      .eq('quote_id', quote.id)
      .eq('booking_type', 'installation')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Bokning ej hittad' }, { status: 404 });
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return NextResponse.json({ error: 'Bokningen kan inte avbokas' }, { status: 400 });
    }

    // Update booking status to cancelled
    await supabaseAdmin
      .from('bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', booking.id);

    // Complete all pending tasks for this booking
    await supabaseAdmin
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('booking_id', booking.id)
      .in('status', ['pending', 'in_progress']);

    // Cancel pending confirmation requests
    await supabaseAdmin
      .from('booking_confirmation_requests')
      .update({ status: 'cancelled', responded_at: new Date().toISOString() })
      .eq('booking_id', booking.id)
      .eq('status', 'pending');

    // Send Discord notification
    notifyBookingCancelled({
      id: booking.id,
      customer_name: quote.customer_name || 'Kund',
      scheduled_date: booking.scheduled_date,
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      message: 'Bokningen har avbokats',
    });
  } catch (err) {
    console.error('Cancel POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
