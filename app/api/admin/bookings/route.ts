import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  isGoogleCalendarConfigured,
  createCalendarEvent,
  BookingWithCustomer,
} from '@/lib/google-calendar';

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

    // Create the booking
    const { data: booking, error } = await supabaseAdmin
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

    // For installation bookings with a quote, add material requirements
    if (booking_type === 'installation' && quote_id) {
      try {
        // Fetch quote calculation data
        const { data: quote } = await supabaseAdmin
          .from('quote_requests')
          .select('calculation_data, adjusted_data')
          .eq('id', quote_id)
          .single();

        if (quote) {
          const dataStr = quote.adjusted_data || quote.calculation_data;
          if (dataStr) {
            const calcData = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
            const totals = calcData.totals;

            if (totals) {
              // Get material IDs
              const { data: materials } = await supabaseAdmin
                .from('materials')
                .select('id, name');

              const openCellMaterial = materials?.find(m =>
                m.name.toLowerCase().includes('öppen') || m.name.toLowerCase().includes('open')
              );
              const closedCellMaterial = materials?.find(m =>
                m.name.toLowerCase().includes('sluten') || m.name.toLowerCase().includes('closed')
              );

              const bookingMaterials = [];

              // Add open cell foam if needed
              if (totals.totalOpenCellKg > 0 && openCellMaterial) {
                bookingMaterials.push({
                  booking_id: booking.id,
                  material_id: openCellMaterial.id,
                  estimated_quantity: Math.round(totals.totalOpenCellKg * 10) / 10,
                });
              }

              // Add closed cell foam if needed
              if (totals.totalClosedCellKg > 0 && closedCellMaterial) {
                bookingMaterials.push({
                  booking_id: booking.id,
                  material_id: closedCellMaterial.id,
                  estimated_quantity: Math.round(totals.totalClosedCellKg * 10) / 10,
                });
              }

              // Insert material requirements
              if (bookingMaterials.length > 0) {
                const { error: matError } = await supabaseAdmin
                  .from('booking_materials')
                  .insert(bookingMaterials);

                if (matError) {
                  console.error('Error adding booking materials:', matError);
                  // Don't fail the whole request, booking is already created
                }
              }
            }
          }
        }
      } catch (matErr) {
        console.error('Error processing booking materials:', matErr);
        // Don't fail the whole request
      }
    }

    // Sync to Google Calendar if configured
    if (isGoogleCalendarConfigured()) {
      try {
        // Fetch the full booking with customer info for Google Calendar
        const { data: fullBooking } = await supabaseAdmin
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
          .eq('id', booking.id)
          .single();

        // Fetch materials for the booking
        const { data: bookingMaterialsData } = await supabaseAdmin
          .from('booking_materials')
          .select(`
            estimated_quantity,
            materials (name)
          `)
          .eq('booking_id', booking.id);

        const bookingForCalendar: BookingWithCustomer = {
          id: booking.id,
          quote_id: booking.quote_id,
          booking_type: booking.booking_type,
          scheduled_date: booking.scheduled_date,
          scheduled_time: booking.scheduled_time,
          status: booking.status,
          notes: booking.notes,
          google_event_id: null,
          customer_name: fullBooking?.quote_requests?.customer_name,
          customer_address: fullBooking?.quote_requests?.customer_address,
          customer_phone: fullBooking?.quote_requests?.customer_phone,
          customer_email: fullBooking?.quote_requests?.customer_email,
          materials: bookingMaterialsData?.map((bm) => {
            const mat = bm.materials as unknown as { name: string } | null;
            return {
              name: mat?.name || 'Unknown',
              estimated_quantity: bm.estimated_quantity,
            };
          }),
        };

        const googleEventId = await createCalendarEvent(bookingForCalendar);

        if (googleEventId) {
          // Update booking with Google event ID
          await supabaseAdmin
            .from('bookings')
            .update({ google_event_id: googleEventId })
            .eq('id', booking.id);

          booking.google_event_id = googleEventId;
        }
      } catch (calendarErr) {
        console.error('Error syncing to Google Calendar:', calendarErr);
        // Don't fail the whole request, booking is already created
      }
    }

    return NextResponse.json({ booking });
  } catch (err) {
    console.error('Bookings POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
