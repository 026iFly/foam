import { google, calendar_v3 } from 'googleapis';

// Types for bookings (matching database schema)
export interface BookingWithCustomer {
  id: number;
  quote_id: number | null;
  booking_type: 'visit' | 'installation';
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  notes: string | null;
  google_event_id: string | null;
  customer_name?: string;
  customer_address?: string;
  customer_phone?: string;
  customer_email?: string;
  // Material info for installations
  materials?: {
    name: string;
    estimated_quantity: number;
  }[];
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  start: string;
  end: string;
  colorId: string | null;
}

// Color IDs in Google Calendar
// 1 = Lavender (blue-ish)
// 2 = Sage (green)
// 3 = Grape (purple)
// 4 = Flamingo (pink)
// 5 = Banana (yellow)
// 6 = Tangerine (orange)
// 7 = Peacock (teal)
// 8 = Graphite (gray)
// 9 = Blueberry (blue)
// 10 = Basil (green)
// 11 = Tomato (red)

const COLOR_INSTALLATION = '10'; // Basil (green) for installations
const COLOR_VISIT = '9'; // Blueberry (blue) for visits

// Default event duration in hours
const DEFAULT_DURATION_HOURS = 4;

/**
 * Check if Google Calendar integration is configured
 */
export function isGoogleCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_CALENDAR_ID
  );
}

/**
 * Initialize Google Calendar API client using service account
 */
export function initGoogleCalendar(): calendar_v3.Calendar | null {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!clientEmail || !privateKey || !calendarId) {
    console.warn('Google Calendar not configured: missing environment variables');
    return null;
  }

  // Handle escaped newlines in the private key
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: formattedPrivateKey,
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  return google.calendar({ version: 'v3', auth });
}

/**
 * Get the calendar ID from environment
 */
export function getCalendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID || '';
}

/**
 * Parse scheduled_time (e.g., "08:00", "08:00-12:00", "heldag") to start/end times
 */
function parseScheduledTime(scheduledDate: string, scheduledTime: string | null): { start: string; end: string } {
  const date = scheduledDate; // Format: YYYY-MM-DD

  let startHour = 8;
  let startMinute = 0;
  let durationHours = DEFAULT_DURATION_HOURS;

  if (scheduledTime) {
    const lowerTime = scheduledTime.toLowerCase();

    if (lowerTime === 'heldag' || lowerTime === 'hela dagen') {
      // Full day: 08:00-16:00
      startHour = 8;
      durationHours = 8;
    } else if (lowerTime.includes('-')) {
      // Range format: "08:00-12:00"
      const [startStr, endStr] = lowerTime.split('-');
      const [sh, sm] = startStr.split(':').map(Number);
      const [eh, em] = endStr.split(':').map(Number);

      startHour = sh || 8;
      startMinute = sm || 0;

      // Calculate duration from end time
      const startMins = startHour * 60 + startMinute;
      const endMins = (eh || 12) * 60 + (em || 0);
      durationHours = (endMins - startMins) / 60;
    } else if (lowerTime.includes(':')) {
      // Single time: "08:00"
      const [h, m] = lowerTime.split(':').map(Number);
      startHour = h || 8;
      startMinute = m || 0;
    }
  }

  // Format times with timezone (Sweden)
  const startTime = `${date}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`;
  const endHour = startHour + durationHours;
  const endMinute = startMinute;
  const endTime = `${date}T${String(Math.floor(endHour)).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`;

  return { start: startTime, end: endTime };
}

/**
 * Convert a booking to a Google Calendar event format
 */
export function bookingToEvent(booking: BookingWithCustomer): calendar_v3.Schema$Event {
  const { start, end } = parseScheduledTime(booking.scheduled_date, booking.scheduled_time);

  // Build event title
  const typeLabel = booking.booking_type === 'installation' ? 'Installation' : 'Hembesök';
  const customerName = booking.customer_name || 'Okänd kund';

  // Include quote reference if available
  let title = `${typeLabel} - ${customerName}`;

  // Build description
  const descParts: string[] = [];

  if (booking.customer_name) {
    descParts.push(`Kund: ${booking.customer_name}`);
  }
  if (booking.customer_address) {
    descParts.push(`Adress: ${booking.customer_address}`);
  }
  if (booking.customer_phone) {
    descParts.push(`Tel: ${booking.customer_phone}`);
  }
  if (booking.customer_email) {
    descParts.push(`E-post: ${booking.customer_email}`);
  }

  // Add material info for installations
  if (booking.booking_type === 'installation' && booking.materials && booking.materials.length > 0) {
    const materialStrings = booking.materials.map(m => `${m.estimated_quantity} kg ${m.name}`);
    descParts.push(`Material: ${materialStrings.join(', ')}`);
  }

  if (booking.notes) {
    descParts.push(`\nAnteckningar:\n${booking.notes}`);
  }

  // Add booking ID reference for two-way sync
  descParts.push(`\n---\nIntellifoam Booking ID: ${booking.id}`);

  return {
    summary: title,
    description: descParts.join('\n'),
    location: booking.customer_address || undefined,
    start: {
      dateTime: start,
      timeZone: 'Europe/Stockholm',
    },
    end: {
      dateTime: end,
      timeZone: 'Europe/Stockholm',
    },
    colorId: booking.booking_type === 'installation' ? COLOR_INSTALLATION : COLOR_VISIT,
  };
}

/**
 * Create a calendar event from a booking
 * Returns the Google event ID
 */
export async function createCalendarEvent(booking: BookingWithCustomer): Promise<string | null> {
  const calendar = initGoogleCalendar();
  if (!calendar) {
    console.warn('Google Calendar not configured, skipping event creation');
    return null;
  }

  const calendarId = getCalendarId();
  const event = bookingToEvent(booking);

  try {
    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    return response.data.id || null;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

/**
 * Update an existing calendar event
 */
export async function updateCalendarEvent(eventId: string, booking: BookingWithCustomer): Promise<void> {
  const calendar = initGoogleCalendar();
  if (!calendar) {
    console.warn('Google Calendar not configured, skipping event update');
    return;
  }

  const calendarId = getCalendarId();
  const event = bookingToEvent(booking);

  try {
    await calendar.events.update({
      calendarId,
      eventId,
      requestBody: event,
    });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const calendar = initGoogleCalendar();
  if (!calendar) {
    console.warn('Google Calendar not configured, skipping event deletion');
    return;
  }

  const calendarId = getCalendarId();

  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    });
  } catch (error) {
    // Ignore 404 errors (event already deleted)
    if ((error as { code?: number }).code === 404) {
      console.warn('Calendar event already deleted:', eventId);
      return;
    }
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}

/**
 * Fetch all events from the calendar within a date range
 */
export async function fetchCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const calendar = initGoogleCalendar();
  if (!calendar) {
    console.warn('Google Calendar not configured');
    return [];
  }

  const calendarId = getCalendarId();

  try {
    const response = await calendar.events.list({
      calendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500,
    });

    const events = response.data.items || [];

    return events.map((event) => ({
      id: event.id || '',
      summary: event.summary || '',
      description: event.description || null,
      location: event.location || null,
      start: event.start?.dateTime || event.start?.date || '',
      end: event.end?.dateTime || event.end?.date || '',
      colorId: event.colorId || null,
    }));
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

/**
 * Extract Intellifoam booking ID from event description
 * Returns null if not an Intellifoam event
 */
export function extractBookingIdFromEvent(event: CalendarEvent): number | null {
  if (!event.description) return null;

  const match = event.description.match(/Intellifoam Booking ID:\s*(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Test the Google Calendar connection
 */
export async function testConnection(): Promise<{ success: boolean; error?: string; calendarName?: string }> {
  const calendar = initGoogleCalendar();
  if (!calendar) {
    return {
      success: false,
      error: 'Google Calendar not configured. Please set GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_CALENDAR_ID environment variables.'
    };
  }

  const calendarId = getCalendarId();

  try {
    const response = await calendar.calendars.get({
      calendarId,
    });

    return {
      success: true,
      calendarName: response.data.summary || 'Unknown Calendar'
    };
  } catch (error) {
    const err = error as { message?: string; code?: number };
    if (err.code === 404) {
      return {
        success: false,
        error: 'Calendar not found. Please check the GOOGLE_CALENDAR_ID and ensure the calendar is shared with the service account.'
      };
    }
    if (err.code === 403) {
      return {
        success: false,
        error: 'Access denied. Please share the calendar with the service account email.'
      };
    }
    return {
      success: false,
      error: err.message || 'Unknown error connecting to Google Calendar'
    };
  }
}

/**
 * Set up a watch on the calendar for push notifications (webhooks)
 * Note: This requires a publicly accessible webhook URL
 */
export async function setupCalendarWatch(webhookUrl: string): Promise<{
  success: boolean;
  channelId?: string;
  resourceId?: string;
  expiration?: string;
  error?: string
}> {
  const calendar = initGoogleCalendar();
  if (!calendar) {
    return { success: false, error: 'Google Calendar not configured' };
  }

  const calendarId = getCalendarId();
  const channelId = `intellifoam-${Date.now()}`;

  try {
    const response = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
      },
    });

    return {
      success: true,
      channelId: response.data.id || undefined,
      resourceId: response.data.resourceId || undefined,
      expiration: response.data.expiration || undefined,
    };
  } catch (error) {
    const err = error as { message?: string };
    return {
      success: false,
      error: err.message || 'Failed to set up calendar watch'
    };
  }
}

/**
 * Stop watching a calendar channel
 */
export async function stopCalendarWatch(channelId: string, resourceId: string): Promise<void> {
  const calendar = initGoogleCalendar();
  if (!calendar) {
    return;
  }

  try {
    await calendar.channels.stop({
      requestBody: {
        id: channelId,
        resourceId,
      },
    });
  } catch (error) {
    console.error('Error stopping calendar watch:', error);
  }
}
