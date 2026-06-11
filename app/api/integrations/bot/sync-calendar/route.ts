import { NextRequest, NextResponse } from 'next/server';
import { isGoogleCalendarConfigured } from '@/lib/google-calendar';
import { syncCalendarToBookings } from '@/lib/calendar-sync';

// Simple API key auth for bot integrations
function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = process.env.N8N_API_KEY;

  if (!expectedKey) {
    console.warn('N8N_API_KEY not set - allowing request (set this in production!)');
    return true;
  }

  return apiKey === expectedKey;
}

// POST - Sync bookings from Google Calendar
// Also runs on a schedule via /api/cron/sync-calendar
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

    const results = await syncCalendarToBookings(monthsBack, monthsForward);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (err) {
    console.error('bot calendar sync error:', err);
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
