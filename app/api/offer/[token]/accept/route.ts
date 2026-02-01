import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyOfferAccepted } from '@/lib/discord';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Accept offer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { signed_name } = body;

    if (!signed_name || !signed_name.trim()) {
      return NextResponse.json({ error: 'Signatur krävs' }, { status: 400 });
    }

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

    // Get client IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor?.split(',')[0]?.trim() || 'unknown';

    // Update quote
    const { error: updateError } = await supabaseAdmin
      .from('quote_requests')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        signed_name: signed_name.trim(),
        signed_ip: clientIp,
      })
      .eq('id', quote.id);

    if (updateError) {
      console.error('Accept update error:', updateError);
      return NextResponse.json({ error: 'Kunde inte uppdatera offert' }, { status: 500 });
    }

    // Send Discord notification
    notifyOfferAccepted({
      id: quote.id,
      quote_number: quote.quote_number,
      customer_name: quote.customer_name,
      total_incl_vat: quote.adjusted_total_incl_vat || quote.total_incl_vat,
    }).catch(err => console.error('Discord notification failed:', err));

    return NextResponse.json({
      success: true,
      message: 'Offert godkänd',
    });
  } catch (err) {
    console.error('Accept offer error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
