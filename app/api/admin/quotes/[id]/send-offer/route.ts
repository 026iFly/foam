import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendOfferEmail } from '@/lib/email';
import { notifyOfferSent } from '@/lib/discord';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { custom_subject, custom_body, include_pdf } = body;

    // Get the quote
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quote_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Offert hittades inte' }, { status: 404 });
    }

    // Generate offer token if not exists
    let offerToken = quote.offer_token;
    if (!offerToken) {
      offerToken = crypto.randomBytes(32).toString('hex');
      await supabaseAdmin
        .from('quote_requests')
        .update({ offer_token: offerToken })
        .eq('id', id);
    }

    // Generate quote number if not exists
    let quoteNumber = quote.quote_number;
    if (!quoteNumber) {
      const year = new Date().getFullYear();
      const { count } = await supabaseAdmin
        .from('quote_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${year}-01-01`)
        .lt('created_at', `${year + 1}-01-01`);

      quoteNumber = `OFF-${year}-${((count || 0) + 1).toString().padStart(4, '0')}`;

      // Set valid until 30 days from now
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      await supabaseAdmin
        .from('quote_requests')
        .update({
          quote_number: quoteNumber,
          quote_valid_until: validUntil.toISOString().split('T')[0],
          status: quote.status === 'pending' ? 'quoted' : quote.status,
        })
        .eq('id', id);
    }

    // Get PDF if requested
    let pdfBuffer: Buffer | undefined;
    if (include_pdf !== false) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.intellifoam.se';
        const pdfRes = await fetch(`${baseUrl}/api/admin/quotes/${id}/pdf`, {
          headers: {
            Cookie: request.headers.get('cookie') || '',
          },
        });
        if (pdfRes.ok) {
          const arrayBuffer = await pdfRes.arrayBuffer();
          pdfBuffer = Buffer.from(arrayBuffer);
        }
      } catch (err) {
        console.error('Failed to generate PDF:', err);
        // Continue without PDF
      }
    }

    // Send email
    const emailSent = await sendOfferEmail(
      {
        id: parseInt(id),
        customer_name: quote.customer_name,
        customer_email: quote.customer_email,
        quote_number: quoteNumber,
        quote_valid_until: quote.quote_valid_until,
        offer_token: offerToken,
      },
      pdfBuffer
    );

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Kunde inte skicka e-post. Kontrollera SMTP-inställningarna.' },
        { status: 500 }
      );
    }

    // Update quote status to 'sent'
    await supabaseAdmin
      .from('quote_requests')
      .update({
        status: 'sent',
        email_sent_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Send Discord notification
    notifyOfferSent({
      id: parseInt(id),
      quote_number: quoteNumber,
      customer_name: quote.customer_name,
      customer_email: quote.customer_email,
      total_incl_vat: quote.adjusted_total_incl_vat || quote.total_incl_vat,
    }).catch(err => console.error('Discord notification failed:', err));

    return NextResponse.json({
      success: true,
      message: 'Offert skickad till ' + quote.customer_email,
      quote_number: quoteNumber,
    });
  } catch (err) {
    console.error('Send offer error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
