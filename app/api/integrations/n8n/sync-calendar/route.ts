import { NextRequest, NextResponse } from 'next/server';
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

  // Use Intl to format in Stockholm timezone
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

// POST - Sync bookings from Google Calendar
// Called by n8n on a schedule (e.g., every 5 minutes)
export async function POST(request: NextRequest) {
  try {
    // Verify API key
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isGoogleCalendarConfigured()) {
      return NextResponse.json({ error: 'Google Calendar not configured' }, { status: 400 });
    }

    // Get optional parameters from request body
    const body = await request.json().catch(() => ({}));
    const monthsBack = body.monthsBack ?? 1;
    const monthsForward = body.monthsForward ?? 6;

    // Fetch events from Google Calendar
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + monthsForward);

    const events = await fetchCalendarEvents(startDate, endDate);

    const results = {
      processed: 0,
      updated: 0,
      unchanged: 0,
      notFound: 0,
      errors: [] as string[],
    };

    for (const event of events) {
      const bookingId = extractBookingIdFromEvent(event);
      if (!bookingId) continue;

      results.processed++;

      try {
        const { scheduled_date, scheduled_time } = parseEventTimesStockholm(event.start, event.end || undefined);

        // Get current booking to check if update is needed
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

        // Only update if something changed
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

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (err) {
    console.error('n8n calendar sync error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET - Health check and status (no auth required for debugging)
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = process.env.N8N_API_KEY;

  return NextResponse.json({
    status: 'ok',
    configured: isGoogleCalendarConfigured(),
    timestamp: new Date().toISOString(),
    auth: {
      keyProvided: !!apiKey,
      keyLength: apiKey?.length || 0,
      envKeySet: !!expectedKey,
      envKeyLength: expectedKey?.length || 0,
      match: apiKey === expectedKey,
    },
  });
}
