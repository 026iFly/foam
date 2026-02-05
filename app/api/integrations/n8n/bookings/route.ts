import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  isGoogleCalendarConfigured,
  updateCalendarEvent,
  BookingWithCustomer,
} from '@/lib/google-calendar';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple API key auth for n8n
function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = process.env.N8N_API_KEY;

  if (!expectedKey) {
    console.warn('N8N_API_KEY not set - allowing request (set this in production!)');
    return true;
  }

  return apiKey === expectedKey;
}

// GET - List bookings (for Discord bot to query)
export async function GET(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabaseAdmin
      .from('bookings')
      .select(`
        id,
        booking_type,
        scheduled_date,
        scheduled_time,
        status,
        notes,
        google_event_id,
        quote_requests (
          customer_name,
          customer_address,
          customer_phone,
          customer_email,
          quote_number
        )
      `)
      .order('scheduled_date', { ascending: true })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.neq('status', 'cancelled');
    }

    if (type) {
      query = query.eq('booking_type', type);
    }

    if (fromDate) {
      query = query.gte('scheduled_date', fromDate);
    }

    if (toDate) {
      query = query.lte('scheduled_date', toDate);
    }

    const { data: bookings, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format for easier consumption
    const formatted = bookings?.map(b => ({
      id: b.id,
      type: b.booking_type,
      date: b.scheduled_date,
      time: b.scheduled_time,
      status: b.status,
      notes: b.notes,
      customerName: (b.quote_requests as { customer_name?: string } | null)?.customer_name || 'Okänd',
      customerAddress: (b.quote_requests as { customer_address?: string } | null)?.customer_address || '',
      customerPhone: (b.quote_requests as { customer_phone?: string } | null)?.customer_phone || '',
      quoteNumber: (b.quote_requests as { quote_number?: string } | null)?.quote_number || '',
      hasGoogleEvent: !!b.google_event_id,
    }));

    return NextResponse.json({
      success: true,
      count: formatted?.length || 0,
      bookings: formatted || [],
    });
  } catch (err) {
    console.error('n8n bookings GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT - Update a booking (for Discord bot commands like "move installation 123 to 2026-02-10")
export async function PUT(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, scheduled_date, scheduled_time, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
    }

    // Fetch current booking
    const { data: currentBooking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        quote_requests (
          customer_name,
          customer_address,
          customer_phone,
          customer_email
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !currentBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (scheduled_date) updateData.scheduled_date = scheduled_date;
    if (scheduled_time !== undefined) updateData.scheduled_time = scheduled_time;
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    // Update booking in database
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Sync to Google Calendar if configured and has event ID
    if (isGoogleCalendarConfigured() && currentBooking.google_event_id) {
      try {
        const quoteData = currentBooking.quote_requests as {
          customer_name?: string;
          customer_address?: string;
          customer_phone?: string;
          customer_email?: string;
        } | null;

        const bookingForCalendar: BookingWithCustomer = {
          id: updatedBooking.id,
          quote_id: updatedBooking.quote_id,
          booking_type: updatedBooking.booking_type,
          scheduled_date: updatedBooking.scheduled_date,
          scheduled_time: updatedBooking.scheduled_time,
          status: updatedBooking.status,
          notes: updatedBooking.notes,
          google_event_id: currentBooking.google_event_id,
          customer_name: quoteData?.customer_name,
          customer_address: quoteData?.customer_address,
          customer_phone: quoteData?.customer_phone,
          customer_email: quoteData?.customer_email,
        };

        await updateCalendarEvent(currentBooking.google_event_id, bookingForCalendar);
      } catch (err) {
        console.error('Failed to update Google Calendar:', err);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: updatedBooking.id,
        type: updatedBooking.booking_type,
        date: updatedBooking.scheduled_date,
        time: updatedBooking.scheduled_time,
        status: updatedBooking.status,
      },
    });
  } catch (err) {
    console.error('n8n bookings PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
