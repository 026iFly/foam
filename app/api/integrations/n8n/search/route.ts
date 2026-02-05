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

// GET - Search across database
export async function GET(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query');
    const type = searchParams.get('type'); // 'quotes', 'bookings', 'tasks', 'all'

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Search query required (min 2 characters)' }, { status: 400 });
    }

    const searchType = type || 'all';
    const results: {
      quotes?: Array<Record<string, unknown>>;
      bookings?: Array<Record<string, unknown>>;
      tasks?: Array<Record<string, unknown>>;
    } = {};

    // Search quotes
    if (searchType === 'all' || searchType === 'quotes') {
      const { data: quotes } = await supabaseAdmin
        .from('quote_requests')
        .select('id, quote_number, customer_name, customer_email, customer_phone, customer_address, status, total_price_incl_vat')
        .or(`customer_name.ilike.%${query}%,customer_email.ilike.%${query}%,customer_phone.ilike.%${query}%,quote_number.ilike.%${query}%,customer_address.ilike.%${query}%`)
        .limit(10);

      results.quotes = quotes?.map(q => ({
        id: q.id,
        type: 'quote',
        quoteNumber: q.quote_number,
        customerName: q.customer_name,
        customerEmail: q.customer_email,
        customerPhone: q.customer_phone,
        address: q.customer_address,
        status: q.status,
        price: q.total_price_incl_vat,
      })) || [];
    }

    // Search bookings (via related quotes)
    if (searchType === 'all' || searchType === 'bookings') {
      const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select(`
          id,
          booking_type,
          scheduled_date,
          scheduled_time,
          status,
          quote_requests!inner (
            customer_name,
            customer_address,
            customer_phone,
            quote_number
          )
        `)
        .or(`quote_requests.customer_name.ilike.%${query}%,quote_requests.customer_phone.ilike.%${query}%,quote_requests.quote_number.ilike.%${query}%`)
        .neq('status', 'cancelled')
        .limit(10);

      results.bookings = bookings?.map(b => ({
        id: b.id,
        type: 'booking',
        bookingType: b.booking_type,
        date: b.scheduled_date,
        time: b.scheduled_time,
        status: b.status,
        customerName: (b.quote_requests as { customer_name?: string } | null)?.customer_name,
        address: (b.quote_requests as { customer_address?: string } | null)?.customer_address,
        quoteNumber: (b.quote_requests as { quote_number?: string } | null)?.quote_number,
      })) || [];
    }

    // Search tasks
    if (searchType === 'all' || searchType === 'tasks') {
      const { data: tasks } = await supabaseAdmin
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          quote_requests (
            customer_name,
            quote_number
          )
        `)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .in('status', ['pending', 'in_progress'])
        .limit(10);

      results.tasks = tasks?.map(t => ({
        id: t.id,
        type: 'task',
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        customerName: (t.quote_requests as { customer_name?: string } | null)?.customer_name,
        quoteNumber: (t.quote_requests as { quote_number?: string } | null)?.quote_number,
      })) || [];
    }

    // Count total results
    const totalResults =
      (results.quotes?.length || 0) +
      (results.bookings?.length || 0) +
      (results.tasks?.length || 0);

    return NextResponse.json({
      success: true,
      query,
      totalResults,
      results,
    });
  } catch (err) {
    console.error('n8n search GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
