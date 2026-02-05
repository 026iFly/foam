import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  isGoogleCalendarConfigured,
  testConnection,
  createCalendarEvent,
  fetchCalendarEvents,
  extractBookingIdFromEvent,
  BookingWithCustomer,
  setupCalendarWatch,
} from '@/lib/google-calendar';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get sync status and differences
export async function GET() {
  try {
    if (!isGoogleCalendarConfigured()) {
      return NextResponse.json({
        configured: false,
        connected: false,
        error: 'Google Calendar not configured. Please set environment variables.',
      });
    }

    // Test connection
    const connectionTest = await testConnection();

    if (!connectionTest.success) {
      return NextResponse.json({
        configured: true,
        connected: false,
        error: connectionTest.error,
      });
    }

    // Fetch bookings without google_event_id (not synced)
    const { data: unsyncedBookings, error: dbError } = await supabaseAdmin
      .from('bookings')
      .select('id, booking_type, scheduled_date, status')
      .is('google_event_id', null)
      .neq('status', 'cancelled')
      .order('scheduled_date', { ascending: true });

    if (dbError) {
      console.error('Error fetching unsynced bookings:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Fetch synced bookings count
    const { count: syncedCount } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .not('google_event_id', 'is', null);

    // Get last sync info from system_settings
    const { data: syncSetting } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'google_calendar_sync')
      .single();

    return NextResponse.json({
      configured: true,
      connected: true,
      calendarName: connectionTest.calendarName,
      syncedCount: syncedCount || 0,
      unsyncedBookings: unsyncedBookings || [],
      lastSync: syncSetting?.value || null,
    });
  } catch (err) {
    console.error('Calendar sync GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Perform sync operation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'sync_all';

    if (!isGoogleCalendarConfigured()) {
      return NextResponse.json(
        { error: 'Google Calendar not configured' },
        { status: 400 }
      );
    }

    // Test connection first
    const connectionTest = await testConnection();
    if (!connectionTest.success) {
      return NextResponse.json(
        { error: connectionTest.error },
        { status: 400 }
      );
    }

    if (action === 'test') {
      // Just test the connection
      return NextResponse.json({
        success: true,
        calendarName: connectionTest.calendarName,
      });
    }

    if (action === 'setup_webhook') {
      // Set up push notifications
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.intellifoam.se';
      const webhookUrl = `${baseUrl}/api/webhooks/google-calendar`;

      const result = await setupCalendarWatch(webhookUrl);

      if (result.success) {
        // Store webhook info in system_settings
        await supabaseAdmin
          .from('system_settings')
          .upsert({
            key: 'google_calendar_webhook',
            value: {
              channelId: result.channelId,
              resourceId: result.resourceId,
              expiration: result.expiration,
              setupAt: new Date().toISOString(),
            },
            description: 'Google Calendar webhook configuration',
          }, { onConflict: 'key' });

        return NextResponse.json({
          success: true,
          message: 'Webhook set up successfully',
          expiration: result.expiration,
        });
      } else {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
    }

    if (action === 'sync_all') {
      // Fetch all bookings without google_event_id that are not cancelled
      const { data: bookings, error: dbError } = await supabaseAdmin
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
        .is('google_event_id', null)
        .neq('status', 'cancelled')
        .order('scheduled_date', { ascending: true });

      if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }

      const results = {
        synced: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const booking of bookings || []) {
        try {
          // Fetch materials for this booking
          const { data: bookingMaterials } = await supabaseAdmin
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
            customer_name: booking.quote_requests?.customer_name,
            customer_address: booking.quote_requests?.customer_address,
            customer_phone: booking.quote_requests?.customer_phone,
            customer_email: booking.quote_requests?.customer_email,
            materials: bookingMaterials?.map((bm) => {
              const mat = bm.materials as unknown as { name: string } | null;
              return {
                name: mat?.name || 'Unknown',
                estimated_quantity: bm.estimated_quantity,
              };
            }),
          };

          const eventId = await createCalendarEvent(bookingForCalendar);

          if (eventId) {
            await supabaseAdmin
              .from('bookings')
              .update({ google_event_id: eventId })
              .eq('id', booking.id);

            results.synced++;
          }
        } catch (err) {
          results.failed++;
          results.errors.push(`Booking ${booking.id}: ${(err as Error).message}`);
        }
      }

      // Update last sync timestamp
      await supabaseAdmin
        .from('system_settings')
        .upsert({
          key: 'google_calendar_sync',
          value: {
            lastSync: new Date().toISOString(),
            syncedCount: results.synced,
            failedCount: results.failed,
          },
          description: 'Google Calendar sync status',
        }, { onConflict: 'key' });

      return NextResponse.json({
        success: true,
        ...results,
      });
    }

    if (action === 'fetch_events') {
      // Fetch events from Google Calendar
      const startDate = body.startDate ? new Date(body.startDate) : new Date();
      const endDate = body.endDate
        ? new Date(body.endDate)
        : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days ahead

      const events = await fetchCalendarEvents(startDate, endDate);

      // Extract Intellifoam booking IDs from events
      const eventsWithBookingIds = events.map((event) => ({
        ...event,
        bookingId: extractBookingIdFromEvent(event),
      }));

      return NextResponse.json({
        success: true,
        events: eventsWithBookingIds,
        count: events.length,
      });
    }

    if (action === 'pull_from_google') {
      // Pull changes from Google Calendar and update bookings
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1); // Include past month
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6); // 6 months ahead

      const events = await fetchCalendarEvents(startDate, endDate);

      const results = {
        updated: 0,
        notFound: 0,
        errors: [] as string[],
      };

      for (const event of events) {
        const bookingId = extractBookingIdFromEvent(event);
        if (!bookingId) continue;

        try {
          // Parse event times
          const startStr = event.start;
          let scheduled_date = '';
          let scheduled_time: string | null = null;

          if (startStr.length === 10) {
            // All-day event
            scheduled_date = startStr;
            scheduled_time = 'heldag';
          } else {
            // DateTime event
            const startDateTime = new Date(startStr);
            scheduled_date = startStr.split('T')[0];
            const hours = String(startDateTime.getHours()).padStart(2, '0');
            const mins = String(startDateTime.getMinutes()).padStart(2, '0');

            if (event.end) {
              const endDateTime = new Date(event.end);
              const endHours = String(endDateTime.getHours()).padStart(2, '0');
              const endMins = String(endDateTime.getMinutes()).padStart(2, '0');
              scheduled_time = `${hours}:${mins}-${endHours}:${endMins}`;
            } else {
              scheduled_time = `${hours}:${mins}`;
            }
          }

          // Update booking
          const { data, error } = await supabaseAdmin
            .from('bookings')
            .update({
              scheduled_date,
              scheduled_time,
              google_event_id: event.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId)
            .select()
            .single();

          if (error) {
            if (error.code === 'PGRST116') {
              results.notFound++;
            } else {
              results.errors.push(`Booking ${bookingId}: ${error.message}`);
            }
          } else if (data) {
            results.updated++;
          }
        } catch (err) {
          results.errors.push(`Booking ${bookingId}: ${(err as Error).message}`);
        }
      }

      return NextResponse.json({
        success: true,
        ...results,
      });
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    );
  } catch (err) {
    console.error('Calendar sync POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
