import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List contracts with optional installer filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const installerId = searchParams.get('installer_id');

    let query = supabaseAdmin
      .from('installer_contracts')
      .select(`
        *,
        user_profiles (first_name, last_name, email)
      `)
      .order('created_at', { ascending: false });

    if (installerId) {
      query = query.eq('installer_id', installerId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      contracts: (data || []).map((c) => ({
        ...c,
        installer_name: `${(c.user_profiles as unknown as { first_name: string; last_name: string })?.first_name || ''} ${(c.user_profiles as unknown as { first_name: string; last_name: string })?.last_name || ''}`.trim(),
        user_profiles: undefined,
      })),
    });
  } catch (err) {
    console.error('Contracts GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Create a new contract
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { installer_id, contract_type, valid_from, valid_to, notes } = body;

    if (!installer_id || !contract_type) {
      return NextResponse.json(
        { error: 'installer_id and contract_type required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('installer_contracts')
      .insert({
        installer_id,
        contract_type,
        status: 'draft',
        valid_from: valid_from || null,
        valid_to: valid_to || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contract: data });
  } catch (err) {
    console.error('Contracts POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
