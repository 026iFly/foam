import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple API key auth for n8n
function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = process.env.N8N_API_KEY;

  if (!expectedKey) {
    return true;
  }

  return apiKey === expectedKey;
}

// GET - Dashboard overview for Discord bot
export async function GET(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get today's date in Stockholm timezone
    const stockholmDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });

    // Get counts in parallel
    const [
      pendingTasksResult,
      pendingQuotesResult,
      todayBookingsResult,
      upcomingBookingsResult,
      recentQuotesResult,
      quotesStatsResult,
    ] = await Promise.all([
      // Pending tasks count
      supabaseAdmin
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress']),

      // Pending quotes (need action)
      supabaseAdmin
        .from('quote_requests')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'reviewed']),

      // Today's bookings
      supabaseAdmin
        .from('bookings')
        .select(`
          id,
          booking_type,
          scheduled_time,
          status,
          quote_requests (customer_name, customer_address)
        `)
        .eq('scheduled_date', stockholmDate)
        .neq('status', 'cancelled')
        .order('scheduled_time', { ascending: true }),

      // Upcoming bookings (next 7 days)
      supabaseAdmin
        .from('bookings')
        .select(`
          id,
          booking_type,
          scheduled_date,
          scheduled_time,
          status,
          quote_requests (customer_name)
        `)
        .gt('scheduled_date', stockholmDate)
        .neq('status', 'cancelled')
        .order('scheduled_date', { ascending: true })
        .limit(10),

      // Recent quotes (last 5)
      supabaseAdmin
        .from('quote_requests')
        .select('id, quote_number, customer_name, status, total_price_incl_vat, created_at')
        .order('created_at', { ascending: false })
        .limit(5),

      // Quote stats by status
      supabaseAdmin
        .from('quote_requests')
        .select('status'),
    ]);

    // Calculate quote stats
    const quoteStats: Record<string, number> = {};
    quotesStatsResult.data?.forEach(q => {
      quoteStats[q.status] = (quoteStats[q.status] || 0) + 1;
    });

    // Format today's bookings
    const todayBookings = todayBookingsResult.data?.map(b => ({
      id: b.id,
      type: b.booking_type === 'installation' ? 'Installation' : 'Hembesök',
      time: b.scheduled_time || 'Ej angiven',
      customer: (b.quote_requests as { customer_name?: string } | null)?.customer_name || 'Okänd',
      address: (b.quote_requests as { customer_address?: string } | null)?.customer_address || '',
      status: b.status,
    })) || [];

    // Format upcoming bookings
    const upcomingBookings = upcomingBookingsResult.data?.map(b => ({
      id: b.id,
      type: b.booking_type === 'installation' ? 'Installation' : 'Hembesök',
      date: b.scheduled_date,
      time: b.scheduled_time || 'Ej angiven',
      customer: (b.quote_requests as { customer_name?: string } | null)?.customer_name || 'Okänd',
      status: b.status,
    })) || [];

    // Format recent quotes
    const recentQuotes = recentQuotesResult.data?.map(q => ({
      id: q.id,
      quoteNumber: q.quote_number,
      customer: q.customer_name,
      status: q.status,
      price: q.total_price_incl_vat,
      createdAt: q.created_at,
    })) || [];

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      date: stockholmDate,
      summary: {
        pendingTasks: pendingTasksResult.count || 0,
        pendingQuotes: pendingQuotesResult.count || 0,
        todayBookings: todayBookings.length,
        upcomingBookings: upcomingBookings.length,
      },
      quoteStats,
      todayBookings,
      upcomingBookings,
      recentQuotes,
    });
  } catch (err) {
    console.error('n8n dashboard GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
