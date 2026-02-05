import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  initGoogleCalendar,
  getCalendarId,
  extractBookingIdFromEvent,
  CalendarEvent,
} from '@/lib/google-calendar';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Color mapping for booking types (reverse of what we use when creating)
const INSTALLATION_COLORS = ['10', '2']; // Basil, Sage (greens)
const VISIT_COLORS = ['9', '1', '7']; // Blueberry, Lavender, Peacock (blues)

/**
 * Parse event times and extract date/time info
 */
function parseEventTimes(event: { start?: string | null; end?: string | null }): {
  scheduled_date: string;
  scheduled_time: string | null;
} {
  const startStr = event.start || '';

  // Handle all-day events (just date, no time)
  if (startStr.length === 10) {
    return {
      scheduled_date: startStr,
      scheduled_time: 'heldag',
    };
  }

  // Parse datetime
  const startDate = new Date(startStr);
  const endDate = event.end ? new Date(event.end) : null;

  const date = startStr.split('T')[0];
  const startTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;

  let scheduled_time = startTime;

  if (endDate) {
    const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
    scheduled_time = `${startTime}-${endTime}`;
  }

  return {
    scheduled_date: date,
    scheduled_time,
  };
}

/**
 * Determine booking type from event color
 */
function getBookingTypeFromColor(colorId: string | null): 'visit' | 'installation' {
  if (!colorId) return 'visit';
  if (INSTALLATION_COLORS.includes(colorId)) return 'installation';
  return 'visit';
}

/**
 * Parse customer info from event description
 */
function parseCustomerInfo(description: string | null): {
  customer_name?: string;
  customer_address?: string;
  customer_phone?: string;
  customer_email?: string;
} {
  if (!description) return {};

  const info: Record<string, string> = {};

  const nameMatch = description.match(/Kund:\s*(.+)/);
  if (nameMatch) info.customer_name = nameMatch[1].trim();

  const addressMatch = description.match(/Adress:\s*(.+)/);
  if (addressMatch) info.customer_address = addressMatch[1].trim();

  const phoneMatch = description.match(/Tel:\s*(.+)/);
  if (phoneMatch) info.customer_phone = phoneMatch[1].trim();

  const emailMatch = description.match(/E-post:\s*(.+)/);
  if (emailMatch) info.customer_email = emailMatch[1].trim();

  return info;
}

// POST - Handle Google Calendar push notifications
export async function POST(request: NextRequest) {
  try {
    // Verify this is a valid Google Calendar notification
    const channelId = request.headers.get('X-Goog-Channel-ID');
    const resourceId = request.headers.get('X-Goog-Resource-ID');
    const resourceState = request.headers.get('X-Goog-Resource-State');

    // Log webhook receipt for debugging
    console.log('Google Calendar webhook received:', {
      channelId,
      resourceId,
      resourceState,
    });

    // Verify channel ID matches our stored webhook
    const { data: webhookSetting } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'google_calendar_webhook')
      .single();

    if (webhookSetting?.value) {
      const storedChannelId = (webhookSetting.value as { channelId?: string }).channelId;
      if (storedChannelId && channelId !== storedChannelId) {
        console.warn('Channel ID mismatch, ignoring webhook');
        return NextResponse.json({ received: true });
      }
    }

    // Handle sync message (initial verification)
    if (resourceState === 'sync') {
      console.log('Google Calendar sync notification received');
      return NextResponse.json({ received: true });
    }

    // Handle exists/change notifications
    if (resourceState === 'exists' || resourceState === 'update') {
      // Fetch the changed event using the sync token mechanism
      const calendar = initGoogleCalendar();
      if (!calendar) {
        return NextResponse.json({ received: true });
      }

      const calendarId = getCalendarId();

      // Get the page token from system settings if we have one
      const { data: syncTokenSetting } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'google_calendar_sync_token')
        .single();

      let syncToken = syncTokenSetting?.value as string | undefined;

      try {
        // If we have a sync token, use incremental sync
        // Otherwise, just acknowledge the webhook and let manual sync handle it
        if (syncToken) {
          const response = await calendar.events.list({
            calendarId,
            syncToken,
          });

          const events = response.data.items || [];

          for (const event of events) {
            const googleEventId = event.id;
            if (!googleEventId) continue;

            // Check if this event is linked to an existing booking
            const { data: existingBooking } = await supabaseAdmin
              .from('bookings')
              .select('id, updated_at')
              .eq('google_event_id', googleEventId)
              .single();

            if (event.status === 'cancelled') {
              // Event was deleted in Google - cancel the booking
              if (existingBooking) {
                await supabaseAdmin
                  .from('bookings')
                  .update({
                    status: 'cancelled',
                    google_event_id: null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existingBooking.id);

                console.log(`Booking ${existingBooking.id} cancelled due to Google Calendar deletion`);
              }
            } else if (existingBooking) {
              // Event was updated - update the booking
              const eventUpdated = event.updated ? new Date(event.updated) : new Date();
              const bookingUpdated = new Date(existingBooking.updated_at);

              // Only update if Google event is newer (last-write-wins)
              if (eventUpdated > bookingUpdated) {
                const { scheduled_date, scheduled_time } = parseEventTimes({
                  start: event.start?.dateTime || event.start?.date,
                  end: event.end?.dateTime || event.end?.date,
                });

                await supabaseAdmin
                  .from('bookings')
                  .update({
                    scheduled_date,
                    scheduled_time,
                    notes: event.description || null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existingBooking.id);

                console.log(`Booking ${existingBooking.id} updated from Google Calendar`);
              }
            } else {
              // Check if this is an Intellifoam event (has booking ID in description)
              const calendarEvent: CalendarEvent = {
                id: googleEventId,
                summary: event.summary || '',
                description: event.description || null,
                location: event.location || null,
                start: event.start?.dateTime || event.start?.date || '',
                end: event.end?.dateTime || event.end?.date || '',
                colorId: event.colorId || null,
              };

              const bookingId = extractBookingIdFromEvent(calendarEvent);

              if (bookingId) {
                // This was created by Intellifoam but lost its link - restore it
                await supabaseAdmin
                  .from('bookings')
                  .update({ google_event_id: googleEventId })
                  .eq('id', bookingId);

                console.log(`Restored Google Calendar link for booking ${bookingId}`);
              }
              // If no booking ID in description, this is an external event
              // We could optionally create a new booking here, but for now we skip it
            }
          }

          // Store the new sync token
          if (response.data.nextSyncToken) {
            await supabaseAdmin
              .from('system_settings')
              .upsert({
                key: 'google_calendar_sync_token',
                value: response.data.nextSyncToken,
                description: 'Google Calendar incremental sync token',
              }, { onConflict: 'key' });
          }
        }
      } catch (err) {
        // If sync token is invalid, clear it and do a fresh sync next time
        const error = err as { code?: number; message?: string };
        if (error.code === 410) {
          // Sync token expired - clear it
          await supabaseAdmin
            .from('system_settings')
            .delete()
            .eq('key', 'google_calendar_sync_token');

          console.log('Sync token expired, cleared for fresh sync');
        } else {
          console.error('Error processing calendar webhook:', error);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Calendar webhook error:', err);
    // Always return 200 to prevent Google from retrying
    return NextResponse.json({ received: true });
  }
}

// GET - Verify webhook endpoint is accessible (for setup testing)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Google Calendar webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
