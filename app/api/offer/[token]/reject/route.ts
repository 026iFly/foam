import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyOfferRejected } from '@/lib/discord';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Reject offer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Get quote
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quote_requests')
      .select('*')
      .eq('offer_token', token)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Offert ej hittad' }, { status: 404 });
    }

    // Check if already responded
    if (quote.status === 'accepted' || quote.status === 'rejected') {
      return NextResponse.json(
        { error: 'Offerten har redan besvarats' },
        { status: 400 }
      );
    }

    // Update quote
    const { error: updateError } = await supabaseAdmin
      .from('quote_requests')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
      })
      .eq('id', quote.id);

    if (updateError) {
      console.error('Reject update error:', updateError);
      return NextResponse.json({ error: 'Kunde inte uppdatera offert' }, { status: 500 });
    }

    // Send Discord notification
    notifyOfferRejected({
      id: quote.id,
      quote_number: quote.quote_number,
      customer_name: quote.customer_name,
    }).catch(err => console.error('Discord notification failed:', err));

    return NextResponse.json({
      success: true,
      message: 'Offert avböjd',
    });
  } catch (err) {
    console.error('Reject offer error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
