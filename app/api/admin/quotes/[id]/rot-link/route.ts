import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/session';
import { getQuoteRequest, generateRotInfoToken } from '@/lib/quotes';

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

    // Check if quote has ROT deduction
    if (!quote.apply_rot_deduction) {
      return NextResponse.json(
        { error: 'Denna offert har inte ROT-avdrag aktiverat' },
        { status: 400 }
      );
    }

    // Generate or return existing token
    let token = quote.rot_info_token;
    if (!token) {
      token = await generateRotInfoToken(parseInt(id));
      if (!token) {
        return NextResponse.json(
          { error: 'Kunde inte generera ROT-länk' },
          { status: 500 }
        );
      }
    }

    // Build the full URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const rotLink = `${baseUrl}/rot-info/${token}`;

    return NextResponse.json({
      success: true,
      token,
      link: rotLink,
    });
  } catch (error) {
    console.error('Error generating ROT link:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid generering av ROT-länk' },
      { status: 500 }
    );
  }
}
