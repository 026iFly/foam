import { NextResponse } from 'next/server';
import { saveContactSubmission } from '@/lib/queries';
import { createQuoteRequest } from '@/lib/quotes';
import { notifyNewQuoteRequest } from '@/lib/discord';
import type { CalculationData } from '@/lib/types/quote';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if this is a quote request (has calculation_data)
    if (body.calculation_data) {
      // Validate required fields for quote
      if (!body.name || !body.email || !body.customer_address) {
        return NextResponse.json(
          { error: 'Namn, e-post och adress är obligatoriska för offertförfrågan' },
          { status: 400 }
        );
      }

      const calculationData = body.calculation_data as CalculationData;

      // Create quote request
      const quoteId = await createQuoteRequest({
        customer_name: body.name,
        customer_email: body.email,
        customer_phone: body.phone,
        customer_address: body.customer_address,
        project_type: body.project_type,
        message: body.message,
        calculation_data: calculationData,
        climate_zone: calculationData.climate?.zone,
        indoor_temp: calculationData.climate?.indoorTemp,
        indoor_rh: calculationData.climate?.indoorRH,
        has_three_phase: calculationData.options?.hasThreePhase,
        apply_rot_deduction: calculationData.options?.applyRotDeduction,
        total_area: calculationData.totals?.totalArea,
        total_excl_vat: calculationData.totals?.totalExclVat,
        total_incl_vat: calculationData.totals?.totalInclVat,
        rot_deduction: calculationData.totals?.rotDeduction,
      });

      // Send Discord notification (don't await to not block response)
      notifyNewQuoteRequest({
        id: quoteId,
        customer_name: body.name,
        customer_address: body.customer_address,
        total_incl_vat: calculationData.totals?.totalInclVat,
      }).catch(err => console.error('Discord notification failed:', err));

      return NextResponse.json({
        success: true,
        quote_id: quoteId,
        message: 'Offertförfrågan mottagen'
      }, { status: 200 });
    }

    // Regular contact form submission
    if (!body.name || !body.email || !body.message) {
      return NextResponse.json(
        { error: 'Namn, e-post och meddelande är obligatoriska fält' },
        { status: 400 }
      );
    }

    // Save to database
    await saveContactSubmission({
      name: body.name,
      email: body.email,
      phone: body.phone,
      message: body.message,
      project_type: body.project_type,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error saving submission:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Ett fel uppstod vid sparande av förfrågan', details: errorMessage },
      { status: 500 }
    );
  }
}
