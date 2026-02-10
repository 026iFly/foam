import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Verify customer surname and return session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { surname } = body;

    if (!surname || !surname.trim()) {
      return NextResponse.json({ error: 'Efternamn krävs' }, { status: 400 });
    }

    // Find booking by customer token
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        id, customer_token,
        quote_requests (customer_name)
      `)
      .eq('customer_token', token)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: 'Bokning ej hittad' }, { status: 404 });
    }

    const quoteData = booking.quote_requests as unknown as { customer_name: string } | null;
    const customerName = quoteData?.customer_name || '';

    // Check surname (case-insensitive, check if it's the last word in the name)
    const nameParts = customerName.trim().split(/\s+/);
    const lastNameFromDb = nameParts[nameParts.length - 1]?.toLowerCase() || '';
    const inputSurname = surname.trim().toLowerCase();

    if (lastNameFromDb !== inputSurname) {
      return NextResponse.json({ error: 'Felaktigt efternamn' }, { status: 403 });
    }

    return NextResponse.json({
      verified: true,
      booking_id: booking.id,
    });
  } catch (err) {
    console.error('Customer verify error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
