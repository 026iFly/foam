import { NextResponse } from 'next/server';
import { getQuoteByRotToken, saveRotCustomerInfo } from '@/lib/quotes';
import type { RotCustomerInfo, RotCustomer } from '@/lib/types/quote';

// GET - Fetch quote info for ROT submission page
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const quote = await getQuoteByRotToken(token);

    if (!quote) {
      return NextResponse.json(
        { error: 'Länken är ogiltig eller har utgått' },
        { status: 404 }
      );
    }

    // Check if ROT info is already submitted
    const alreadySubmitted = !!quote.rot_customer_info;

    return NextResponse.json({
      customer_name: quote.customer_name,
      customer_address: quote.customer_address,
      rot_deduction: quote.rot_deduction,
      already_submitted: alreadySubmitted,
    });
  } catch (error) {
    console.error('Error fetching ROT info:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod' },
      { status: 500 }
    );
  }
}

// POST - Save ROT customer info
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const quote = await getQuoteByRotToken(token);

    if (!quote) {
      return NextResponse.json(
        { error: 'Länken är ogiltig eller har utgått' },
        { status: 404 }
      );
    }

    // Check if already submitted
    if (quote.rot_customer_info) {
      return NextResponse.json(
        { error: 'ROT-information har redan skickats in för denna offert' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { fastighetsbeteckning, customers } = body as {
      fastighetsbeteckning: string;
      customers: RotCustomer[];
    };

    // Validate
    if (!fastighetsbeteckning || !fastighetsbeteckning.trim()) {
      return NextResponse.json(
        { error: 'Fastighetsbeteckning krävs' },
        { status: 400 }
      );
    }

    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json(
        { error: 'Minst en person krävs' },
        { status: 400 }
      );
    }

    // Validate each customer
    for (const customer of customers) {
      if (!customer.name || !customer.name.trim()) {
        return NextResponse.json(
          { error: 'Namn krävs för alla personer' },
          { status: 400 }
        );
      }

      // Validate personnummer (12 digits)
      const cleanPnr = customer.personnummer.replace(/\D/g, '');
      if (cleanPnr.length !== 12) {
        return NextResponse.json(
          { error: `Ogiltigt personnummer för ${customer.name}` },
          { status: 400 }
        );
      }
    }

    // Validate share totals to 100%
    const totalShare = customers.reduce((sum, c) => sum + (c.share || 100), 0);
    if (customers.length > 1 && totalShare !== 100) {
      return NextResponse.json(
        { error: 'Fördelningen av ROT-avdrag måste summera till 100%' },
        { status: 400 }
      );
    }

    // Build ROT info object
    const rotInfo: RotCustomerInfo = {
      fastighetsbeteckning: fastighetsbeteckning.trim(),
      customers: customers.map(c => ({
        name: c.name.trim(),
        personnummer: c.personnummer.replace(/\D/g, ''),
        share: c.share || 100,
      })),
      submittedAt: new Date().toISOString(),
    };

    // Save to database
    const success = await saveRotCustomerInfo(quote.id, JSON.stringify(rotInfo));

    if (!success) {
      return NextResponse.json(
        { error: 'Kunde inte spara ROT-information' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving ROT info:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid sparande' },
      { status: 500 }
    );
  }
}
