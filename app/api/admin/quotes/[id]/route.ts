import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/supabase-auth';
import { getQuoteRequest, updateQuoteRequest, deleteQuoteRequest, markQuoteReviewed, markQuoteQuoted } from '@/lib/quotes';
import type { UpdateQuoteRequestInput } from '@/lib/types/quote';

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

    // Parse the JSON fields (keep rot_customer_info as string for client-side parsing)
    const parsedQuote = {
      ...quote,
      calculation_data: quote.calculation_data ? JSON.parse(quote.calculation_data) : null,
      adjusted_data: quote.adjusted_data ? JSON.parse(quote.adjusted_data) : null,
      // rot_customer_info stays as string to be parsed on client if needed
    };

    return NextResponse.json(parsedQuote);
  } catch (error) {
    console.error('Error fetching quote:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av offert' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Handle special actions
    if (body.action === 'mark_reviewed') {
      const success = await markQuoteReviewed(parseInt(id));
      return NextResponse.json({ success });
    }

    if (body.action === 'mark_quoted') {
      const quoteNumber = await markQuoteQuoted(parseInt(id));
      return NextResponse.json({ success: !!quoteNumber, quote_number: quoteNumber });
    }

    // Regular update
    const updateData: UpdateQuoteRequestInput = {};

    if (body.status !== undefined) updateData.status = body.status;
    if (body.admin_notes !== undefined) updateData.admin_notes = body.admin_notes;
    if (body.adjusted_data !== undefined) {
      updateData.adjusted_data = typeof body.adjusted_data === 'string'
        ? body.adjusted_data
        : JSON.stringify(body.adjusted_data);
    }
    if (body.adjusted_total_excl_vat !== undefined) {
      updateData.adjusted_total_excl_vat = body.adjusted_total_excl_vat;
    }
    if (body.adjusted_total_incl_vat !== undefined) {
      updateData.adjusted_total_incl_vat = body.adjusted_total_incl_vat;
    }
    if (body.quote_number !== undefined) updateData.quote_number = body.quote_number;
    if (body.quote_pdf_path !== undefined) updateData.quote_pdf_path = body.quote_pdf_path;
    if (body.quote_valid_until !== undefined) updateData.quote_valid_until = body.quote_valid_until;

    const success = await updateQuoteRequest(parseInt(id), updateData);

    if (!success) {
      return NextResponse.json({ error: 'Kunde inte uppdatera offert' }, { status: 400 });
    }

    // Return the updated quote
    const updatedQuote = await getQuoteRequest(parseInt(id));
    return NextResponse.json({
      success: true,
      quote: updatedQuote ? {
        ...updatedQuote,
        calculation_data: updatedQuote.calculation_data ? JSON.parse(updatedQuote.calculation_data) : null,
        adjusted_data: updatedQuote.adjusted_data ? JSON.parse(updatedQuote.adjusted_data) : null,
      } : null,
    });
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid uppdatering av offert' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const success = await deleteQuoteRequest(parseInt(id));

    if (!success) {
      return NextResponse.json({ error: 'Kunde inte ta bort offert' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quote:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid borttagning av offert' },
      { status: 500 }
    );
  }
}
