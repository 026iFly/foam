import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/supabase-auth';
import { getQuoteRequest, markQuoteQuoted, markQuoteSent } from '@/lib/quotes';
import { getCompanyInfo } from '@/lib/queries';
import { renderToBuffer } from '@react-pdf/renderer';
import { QuoteDocument } from '@/lib/pdf/quote-template';
import { sendQuoteEmail } from '@/lib/email/send-quote';
import type { CalculationData } from '@/lib/types/quote';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    let quote = await getQuoteRequest(parseInt(id));

    if (!quote) {
      return NextResponse.json({ error: 'Offert ej hittad' }, { status: 404 });
    }

    // Ensure quote has a quote number
    let quoteNumber = quote.quote_number;
    let validUntil = quote.quote_valid_until;

    if (!quoteNumber) {
      // Generate quote number if not exists
      quoteNumber = await markQuoteQuoted(parseInt(id));
      if (!quoteNumber) {
        return NextResponse.json({ error: 'Kunde inte generera offertnummer' }, { status: 500 });
      }
      // Refresh quote data
      quote = await getQuoteRequest(parseInt(id));
      if (!quote) {
        return NextResponse.json({ error: 'Offert ej hittad' }, { status: 404 });
      }
      validUntil = quote.quote_valid_until;
    }

    // Get company info
    const companyInfo = await getCompanyInfo();

    if (!companyInfo) {
      return NextResponse.json({ error: 'Företagsinformation saknas' }, { status: 500 });
    }

    // Parse calculation data (use adjusted if available)
    const calculationData: CalculationData = quote.adjusted_data
      ? JSON.parse(quote.adjusted_data)
      : JSON.parse(quote.calculation_data);

    // Generate PDF using JSX
    const pdfBuffer = await renderToBuffer(
      <QuoteDocument
        quoteNumber={quoteNumber}
        validUntil={validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
        customerName={quote.customer_name}
        customerEmail={quote.customer_email}
        customerPhone={quote.customer_phone}
        customerAddress={quote.customer_address}
        calculationData={calculationData}
        companyInfo={{
          name: companyInfo.company_name,
          orgNumber: companyInfo.org_number || '',
          address: `${companyInfo.address || ''}, ${companyInfo.postal_code || ''} ${companyInfo.city || ''}`,
          phone: companyInfo.phone || '',
          email: companyInfo.email || '',
        }}
      />
    );

    // Calculate total amount for email
    const totalAmount = quote.adjusted_total_incl_vat || calculationData.totals.finalTotal;

    // Send email
    const emailResult = await sendQuoteEmail({
      to: quote.customer_email,
      customerName: quote.customer_name,
      quoteNumber,
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalAmount,
      pdfBuffer: Buffer.from(pdfBuffer),
      companyName: companyInfo.company_name,
      companyEmail: companyInfo.email || '',
      companyPhone: companyInfo.phone || '',
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || 'Kunde inte skicka e-post' },
        { status: 500 }
      );
    }

    // Mark quote as sent
    await markQuoteSent(parseInt(id));

    return NextResponse.json({
      success: true,
      message: 'E-post skickad till ' + quote.customer_email,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid skickande av e-post' },
      { status: 500 }
    );
  }
}
