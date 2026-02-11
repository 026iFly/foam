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

    // Find quote by customer token
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quote_requests')
      .select('id, num_installers')
      .eq('customer_token', token)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Offert ej hittad' }, { status: 404 });
    }

    // Check if a booking already exists for this quote
    const { data: existingBookings } = await supabaseAdmin
      .from('bookings')
      .select('id, status')
      .eq('quote_id', quote.id)
      .eq('booking_type', 'installation')
      .limit(1);

    let bookingId: number;

    if (existingBookings && existingBookings.length > 0) {
      // Update existing booking with selected date
      bookingId = existingBookings[0].id;
      const { error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({
          scheduled_date: date,
          customer_booked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      // Create new booking linked to the quote
      const { data: newBooking, error: createError } = await supabaseAdmin
        .from('bookings')
        .insert({
          quote_id: quote.id,
          booking_type: 'installation',
          scheduled_date: date,
          status: 'scheduled',
          num_installers: quote.num_installers || 2,
          customer_booked_at: new Date().toISOString(),
          notes: 'Datum valt av kund via portalen.',
        })
        .select('id')
        .single();

      if (createError || !newBooking) {
        return NextResponse.json({ error: createError?.message || 'Kunde inte skapa bokning' }, { status: 500 });
      }
      bookingId = newBooking.id;
    }

    // Auto-assign installers
    const result = await autoAssignInstallers(bookingId);

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
