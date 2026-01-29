import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/supabase-auth';
import { getQuoteRequest, markQuoteQuoted } from '@/lib/quotes';
import { getCompanyInfo } from '@/lib/queries';
import { renderToBuffer } from '@react-pdf/renderer';
import { QuoteDocument } from '@/lib/pdf/quote-template';
import type { CalculationData } from '@/lib/types/quote';

export async function GET(
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
      const updatedQuote = await getQuoteRequest(parseInt(id));
      if (updatedQuote) {
        validUntil = updatedQuote.quote_valid_until;
      }
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

    // Return PDF as downloadable file
    const filename = `offert-${quoteNumber}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid generering av PDF' },
      { status: 500 }
    );
  }
}
