import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/supabase-auth';
import { getQuoteRequest } from '@/lib/quotes';
import { supabase } from '@/lib/supabase';
import { sendRotLinkEmail } from '@/lib/email';
import { randomBytes } from 'crypto';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const quote = await getQuoteRequest(parseInt(id));

    if (!quote) {
      return NextResponse.json({ error: 'Offert ej hittad' }, { status: 404 });
    }

    if (!quote.customer_email) {
      return NextResponse.json({ error: 'Kunden saknar e-postadress' }, { status: 400 });
    }

    // Generate ROT info token if it doesn't exist
    let rotInfoToken = quote.rot_info_token;
    if (!rotInfoToken) {
      rotInfoToken = randomBytes(32).toString('hex');

      const { error: updateError } = await supabase
        .from('quote_requests')
        .update({ rot_info_token: rotInfoToken })
        .eq('id', quote.id);

      if (updateError) {
        console.error('Error updating ROT token:', updateError);
        return NextResponse.json(
          { error: 'Kunde inte generera ROT-länk' },
          { status: 500 }
        );
      }
    }

    // Send the email
    const success = await sendRotLinkEmail({
      customer_name: quote.customer_name,
      customer_email: quote.customer_email,
      rot_info_token: rotInfoToken,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Kunde inte skicka e-post. Kontrollera SMTP-inställningar.' },
        { status: 500 }
      );
    }

    // Log the event
    console.log(`ROT link email sent to ${quote.customer_email} for quote ${quote.id}`);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.intellifoam.se';
    const rotLink = `${baseUrl}/rot-info/${rotInfoToken}`;

    return NextResponse.json({
      success: true,
      message: `ROT-länk skickad till ${quote.customer_email}`,
      rot_link: rotLink,
    });
  } catch (error) {
    console.error('Error sending ROT link email:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid skickande av e-post' },
      { status: 500 }
    );
  }
}
