/**
 * Google Calendar → bookings sync.
 *
 * Shared by /api/integrations/bot/sync-calendar (manual/bot trigger)
 * and /api/cron/sync-calendar (scheduled Vercel cron).
 */

import { createClient } from '@supabase/supabase-js';
import {
  isGoogleCalendarConfigured,
  fetchCalendarEvents,
  extractBookingIdFromEvent,
} from '@/lib/google-calendar';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface CalendarSyncResult {
  processed: number;
  updated: number;
  unchanged: number;
  notFound: number;
  errors: string[];
}

/**
 * Parse event times with Stockholm timezone
 */
function parseEventTimesStockholm(startStr: string, endStr?: string): {
  scheduled_date: string;
  scheduled_time: string | null;
} {
  // Handle all-day events (just date, no time)
  if (startStr.length === 10) {
    return {
      scheduled_date: startStr,
      scheduled_time: 'heldag',
    };
  }

  const startDateTime = new Date(startStr);
  const endDateTime = endStr ? new Date(endStr) : null;

  const stockholmFormatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const startParts = stockholmFormatter.formatToParts(startDateTime);
  const startYear = startParts.find(p => p.type === 'year')?.value;
  const startMonth = startParts.find(p => p.type === 'month')?.value;
  const startDay = startParts.find(p => p.type === 'day')?.value;
  const startHour = startParts.find(p => p.type === 'hour')?.value;
  const startMinute = startParts.find(p => p.type === 'minute')?.value;

  const scheduled_date = `${startYear}-${startMonth}-${startDay}`;
  const startTimeStr = `${startHour}:${startMinute}`;

  let scheduled_time = startTimeStr;

  if (endDateTime) {
    const endParts = stockholmFormatter.formatToParts(endDateTime);
    const endHour = endParts.find(p => p.type === 'hour')?.value;
    const endMinute = endParts.find(p => p.type === 'minute')?.value;
    scheduled_time = `${startTimeStr}-${endHour}:${endMinute}`;
  }

  return { scheduled_date, scheduled_time };
}

export async function syncCalendarToBookings(
  monthsBack = 1,
  monthsForward = 6
): Promise<CalendarSyncResult> {
  if (!isGoogleCalendarConfigured()) {
    throw new Error('Google Calendar not configured');
  }

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + monthsForward);

  const events = await fetchCalendarEvents(startDate, endDate);

  const results: CalendarSyncResult = {
    processed: 0,
    updated: 0,
    unchanged: 0,
    notFound: 0,
    errors: [],
  };

  for (const event of events) {
    const bookingId = extractBookingIdFromEvent(event);
    if (!bookingId) continue;

    results.processed++;

    try {
      const { scheduled_date, scheduled_time } = parseEventTimesStockholm(event.start, event.end || undefined);

      const { data: currentBooking, error: fetchError } = await supabaseAdmin
        .from('bookings')
        .select('scheduled_date, scheduled_time')
        .eq('id', bookingId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          results.notFound++;
        } else {
          results.errors.push(`Booking ${bookingId}: ${fetchError.message}`);
        }
        continue;
      }

      if (currentBooking.scheduled_date !== scheduled_date ||
          currentBooking.scheduled_time !== scheduled_time) {

        const { error: updateError } = await supabaseAdmin
          .from('bookings')
          .update({
            scheduled_date,
            scheduled_time,
            google_event_id: event.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId);

        if (updateError) {
          results.errors.push(`Booking ${bookingId}: ${updateError.message}`);
        } else {
          results.updated++;
        }
      } else {
        results.unchanged++;
      }
    } catch (err) {
      results.errors.push(`Booking ${bookingId}: ${(err as Error).message}`);
    }
  }

  return results;
}
