import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Return ROT info and max ROT settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const { data: quote, error } = await supabaseAdmin
      .from('quote_requests')
      .select('id, rot_customer_info, rot_max_per_person, rot_customer_max, rot_deduction, apply_rot_deduction')
      .eq('customer_token', token)
      .single();

    if (error || !quote) {
      return NextResponse.json({ error: 'Offert ej hittad' }, { status: 404 });
    }

    let rotCustomerInfo = null;
    if (quote.rot_customer_info) {
      try {
        rotCustomerInfo = typeof quote.rot_customer_info === 'string'
          ? JSON.parse(quote.rot_customer_info)
          : quote.rot_customer_info;
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      rot_customer_info: rotCustomerInfo,
      rot_max_per_person: quote.rot_max_per_person || 50000,
      rot_customer_max: quote.rot_customer_max,
      rot_deduction: quote.rot_deduction,
      apply_rot_deduction: quote.apply_rot_deduction,
    });
  } catch (err) {
    console.error('ROT info GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Submit/update ROT info from customer portal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { fastighetsbeteckning, customers, customer_max_rot } = body;

    // Validate inputs
    if (!fastighetsbeteckning?.trim()) {
      return NextResponse.json({ error: 'Fastighetsbeteckning krävs' }, { status: 400 });
    }

    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json({ error: 'Minst en person krävs' }, { status: 400 });
    }

    // Find quote
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quote_requests')
      .select('id, rot_max_per_person, apply_rot_deduction, calculation_data, adjusted_data')
      .eq('customer_token', token)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Offert ej hittad' }, { status: 404 });
    }

    const rotMaxPerPerson = quote.rot_max_per_person || 50000;

    // Validate each customer
    for (let i = 0; i < customers.length; i++) {
      const c = customers[i];
      if (!c.name?.trim()) {
        return NextResponse.json({ error: `Namn krävs för person ${i + 1}` }, { status: 400 });
      }
      const cleanPnr = (c.personnummer || '').replace(/\D/g, '');
      if (cleanPnr.length !== 12) {
        return NextResponse.json({ error: `Ogiltigt personnummer för ${c.name || `person ${i + 1}`}` }, { status: 400 });
      }
    }

    // Validate shares sum to 100
    const totalShare = customers.reduce((sum: number, c: { share: number }) => sum + (c.share || 0), 0);
    if (totalShare !== 100) {
      return NextResponse.json({ error: 'Fördelningen måste summera till 100%' }, { status: 400 });
    }

    // Validate customer_max_rot: each person's max cannot exceed quote's rot_max_per_person
    const rotCustomerMax: Record<string, number> = {};
    if (customer_max_rot && typeof customer_max_rot === 'object') {
      for (const [key, value] of Object.entries(customer_max_rot)) {
        const numValue = Number(value);
        if (numValue > rotMaxPerPerson) {
          return NextResponse.json(
            { error: `Max ROT-avdrag per person kan inte överstiga ${rotMaxPerPerson.toLocaleString('sv-SE')} kr` },
            { status: 400 }
          );
        }
        rotCustomerMax[key] = Math.max(0, numValue);
      }
    }

    // Build ROT customer info
    const rotCustomerInfo = {
      fastighetsbeteckning: fastighetsbeteckning.trim(),
      customers: customers.map((c: { name: string; personnummer: string; share: number }) => ({
        name: c.name.trim(),
        personnummer: c.personnummer.replace(/\D/g, ''),
        share: c.share,
      })),
      submittedAt: new Date().toISOString(),
    };

    // Calculate ROT deduction with per-person caps
    const calcData = quote.adjusted_data
      ? (typeof quote.adjusted_data === 'string' ? JSON.parse(quote.adjusted_data) : quote.adjusted_data)
      : quote.calculation_data
        ? (typeof quote.calculation_data === 'string' ? JSON.parse(quote.calculation_data) : quote.calculation_data)
        : null;

    let rotDeduction = 0;
    if (quote.apply_rot_deduction && calcData) {
      const laborCostTotal = calcData.totals?.laborCostTotal || 0;
      const laborCostInclVat = laborCostTotal * 1.25;
      const rawRot = Math.round(laborCostInclVat * 0.30);

      // Sum each person's cap * their share
      let totalMaxRot = 0;
      for (let i = 0; i < rotCustomerInfo.customers.length; i++) {
        const personMax = rotCustomerMax[String(i)] ?? rotMaxPerPerson;
        const share = rotCustomerInfo.customers[i].share / 100;
        totalMaxRot += Math.round(personMax * share);
      }

      rotDeduction = Math.min(rawRot, totalMaxRot);
    }

    // Update quote
    const updates: Record<string, unknown> = {
      rot_customer_info: rotCustomerInfo,
      updated_at: new Date().toISOString(),
    };

    if (Object.keys(rotCustomerMax).length > 0) {
      updates.rot_customer_max = rotCustomerMax;
    }

    if (quote.apply_rot_deduction) {
      updates.rot_deduction = rotDeduction;
    }

    const { error: updateError } = await supabaseAdmin
      .from('quote_requests')
      .update(updates)
      .eq('id', quote.id);

    if (updateError) {
      console.error('ROT info update error:', updateError);
      return NextResponse.json({ error: 'Kunde inte spara ROT-information' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      rot_deduction: rotDeduction,
    });
  } catch (err) {
    console.error('ROT info POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
