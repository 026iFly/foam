import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get quote by offer token (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const { data: quote, error } = await supabaseAdmin
      .from('quote_requests')
      .select(`
        id,
        customer_name,
        customer_address,
        quote_number,
        quote_valid_until,
        total_excl_vat,
        total_incl_vat,
        adjusted_total_excl_vat,
        adjusted_total_incl_vat,
        rot_deduction,
        apply_rot_deduction,
        status,
        accepted_at,
        rejected_at,
        signed_name
      `)
      .eq('offer_token', token)
      .single();

    if (error || !quote) {
      return NextResponse.json({ error: 'Offert ej hittad' }, { status: 404 });
    }

    return NextResponse.json({ quote });
  } catch (err) {
    console.error('Offer GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
