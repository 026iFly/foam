import { NextResponse } from 'next/server';
import { isGoogleCalendarConfigured } from '@/lib/google-calendar';
import { syncCalendarToBookings } from '@/lib/calendar-sync';

// Scheduled Google Calendar → bookings sync.
// Replaces the OpenClaw/n8n bot that used to call
// /api/integrations/bot/sync-calendar on an interval.

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({ success: true, skipped: 'Google Calendar not configured' });
  }

  try {
    const results = await syncCalendarToBookings();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (err) {
    console.error('Calendar sync cron error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
