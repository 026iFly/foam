import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  isGoogleCalendarConfigured,
  updateCalendarEvent,
  deleteCalendarEvent,
  createCalendarEvent,
  BookingWithCustomer,
} from '@/lib/google-calendar';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch a single booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingId = parseInt(id, 10);

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    const { data: booking, error } = await supabaseAdmin
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
      .eq('id', bookingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
      console.error('Error fetching booking:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch materials for the booking
    const { data: materials } = await supabaseAdmin
      .from('booking_materials')
      .select(`
        estimated_quantity,
        actual_quantity,
        materials (id, name)
      `)
      .eq('booking_id', bookingId);

    // Fetch assigned installers
    const { data: assignments } = await supabaseAdmin
      .from('booking_installers')
      .select(`
        installer_id, is_lead, status, responded_at,
        user_profiles (first_name, last_name, email, phone)
      `)
      .eq('booking_id', bookingId);

    // Flatten the response
    const flattenedBooking = {
      ...booking,
      customer_name: booking.quote_requests?.customer_name,
      customer_address: booking.quote_requests?.customer_address,
      customer_phone: booking.quote_requests?.customer_phone,
      customer_email: booking.quote_requests?.customer_email,
      quote_value: booking.quote_requests?.adjusted_total_excl_vat || booking.quote_requests?.total_excl_vat,
      materials: materials?.map((m) => {
        const mat = m.materials as unknown as { id: number; name: string } | null;
        return {
          id: mat?.id,
          name: mat?.name,
          estimated_quantity: m.estimated_quantity,
          actual_quantity: m.actual_quantity,
        };
      }),
      installers: (assignments || []).map((a) => {
        const profile = a.user_profiles as unknown as { first_name: string; last_name: string; email: string; phone: string } | null;
        return {
          installer_id: a.installer_id,
          is_lead: a.is_lead,
          status: a.status,
          name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
          email: profile?.email,
          phone: profile?.phone,
        };
      }),
      quote_requests: undefined,
    };

    return NextResponse.json({ booking: flattenedBooking });
  } catch (err) {
    console.error('Booking GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT - Update a booking
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
    const { scheduled_date, scheduled_time, status, notes, booking_type } = body;

    // Fetch existing booking to get google_event_id
    const { data: existingBooking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (scheduled_date !== undefined) updateData.scheduled_date = scheduled_date;
    if (scheduled_time !== undefined) updateData.scheduled_time = scheduled_time;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (booking_type !== undefined) updateData.booking_type = booking_type;

    // Update the booking
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      console.error('Error updating booking:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check for overbooking
    if (status !== 'cancelled') {
      const { data: assignments } = await supabaseAdmin
        .from('booking_installers')
        .select('installer_id')
        .eq('booking_id', bookingId)
        .neq('status', 'declined');

      const assignedCount = assignments?.length || 0;
      const numInstallers = booking.num_installers || existingBooking.num_installers || 2;

      if (assignedCount > numInstallers && !existingBooking.overbooking_resolved) {
        // Create admin task for distributing debitable hours
        const { data: existingTask } = await supabaseAdmin
          .from('tasks')
          .select('id')
          .eq('booking_id', bookingId)
          .like('title', '%fakturerbara timmar%')
          .eq('status', 'pending')
          .single();

        if (!existingTask) {
          await supabaseAdmin
            .from('tasks')
            .insert({
              title: 'Fördela fakturerbara timmar',
              description: `Bokning #${bookingId} har ${assignedCount} installatörer men ${numInstallers} beräknade. Fördela fakturerbara timmar.`,
              status: 'pending',
              priority: 'high',
              booking_id: bookingId,
              task_type: 'custom',
            });
        }
      }
    }

    // Sync to Google Calendar if configured
    if (isGoogleCalendarConfigured()) {
      try {
        // Fetch the full booking with customer info
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
          .eq('id', bookingId)
          .single();

        // Fetch materials for the booking
        const { data: bookingMaterials } = await supabaseAdmin
          .from('booking_materials')
          .select(`
            estimated_quantity,
            materials (name)
          `)
          .eq('booking_id', bookingId);

        const bookingForCalendar: BookingWithCustomer = {
          id: booking.id,
          quote_id: booking.quote_id,
          booking_type: booking.booking_type,
          scheduled_date: booking.scheduled_date,
          scheduled_time: booking.scheduled_time,
          status: booking.status,
          notes: booking.notes,
          google_event_id: booking.google_event_id,
          customer_name: fullBooking?.quote_requests?.customer_name,
          customer_address: fullBooking?.quote_requests?.customer_address,
          customer_phone: fullBooking?.quote_requests?.customer_phone,
          customer_email: fullBooking?.quote_requests?.customer_email,
          materials: bookingMaterials?.map((bm) => {
            const mat = bm.materials as unknown as { name: string } | null;
            return {
              name: mat?.name || 'Unknown',
              estimated_quantity: bm.estimated_quantity,
            };
          }),
        };

        // If booking is cancelled, delete the Google Calendar event
        if (status === 'cancelled' && existingBooking.google_event_id) {
          await deleteCalendarEvent(existingBooking.google_event_id);
          // Clear the google_event_id
          await supabaseAdmin
            .from('bookings')
            .update({ google_event_id: null })
            .eq('id', bookingId);
        } else if (existingBooking.google_event_id) {
          // Update existing event
          await updateCalendarEvent(existingBooking.google_event_id, bookingForCalendar);
        } else if (status !== 'cancelled') {
          // Create new event if it doesn't exist yet
          const googleEventId = await createCalendarEvent(bookingForCalendar);
          if (googleEventId) {
            await supabaseAdmin
              .from('bookings')
              .update({ google_event_id: googleEventId })
              .eq('id', bookingId);
            booking.google_event_id = googleEventId;
          }
        }
      } catch (calendarErr) {
        console.error('Error syncing to Google Calendar:', calendarErr);
        // Don't fail the whole request
      }
    }

    return NextResponse.json({ booking });
  } catch (err) {
    console.error('Booking PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Delete a booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingId = parseInt(id, 10);

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    // Fetch existing booking to get google_event_id
    const { data: existingBooking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('google_event_id')
      .eq('id', bookingId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Delete from Google Calendar first if event exists
    if (isGoogleCalendarConfigured() && existingBooking.google_event_id) {
      try {
        await deleteCalendarEvent(existingBooking.google_event_id);
      } catch (calendarErr) {
        console.error('Error deleting from Google Calendar:', calendarErr);
        // Continue with deletion even if Google sync fails
      }
    }

    // Delete booking materials first (foreign key constraint)
    await supabaseAdmin
      .from('booking_materials')
      .delete()
      .eq('booking_id', bookingId);

    // Delete the booking
    const { error } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (error) {
      console.error('Error deleting booking:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Booking DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
