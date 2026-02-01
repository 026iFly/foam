import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all bookings with quote info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('bookings')
      .select(`
        *,
        quote_requests (
          customer_name,
          customer_address,
          customer_phone,
          customer_email,
          total_excl_vat,
          adjusted_total_excl_vat
        )
      `)
      .order('scheduled_date', { ascending: true });

    if (fromDate) {
      query = query.gte('scheduled_date', fromDate);
    }

    if (toDate) {
      query = query.lte('scheduled_date', toDate);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten the response
    const bookings = (data || []).map((booking) => ({
      ...booking,
      customer_name: booking.quote_requests?.customer_name,
      customer_address: booking.quote_requests?.customer_address,
      customer_phone: booking.quote_requests?.customer_phone,
      customer_email: booking.quote_requests?.customer_email,
      quote_value: booking.quote_requests?.adjusted_total_excl_vat || booking.quote_requests?.total_excl_vat,
      quote_requests: undefined,
    }));

    return NextResponse.json({ bookings });
  } catch (err) {
    console.error('Bookings GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Create new booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quote_id, booking_type, scheduled_date, scheduled_time, notes } = body;

    if (!booking_type || !scheduled_date) {
      return NextResponse.json(
        { error: 'booking_type and scheduled_date are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        quote_id: quote_id || null,
        booking_type,
        scheduled_date,
        scheduled_time: scheduled_time || null,
        status: 'scheduled',
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating booking:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ booking: data });
  } catch (err) {
    console.error('Bookings POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
