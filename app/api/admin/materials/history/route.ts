import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch stock transaction history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('material_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabaseAdmin
      .from('stock_transactions')
      .select(`
        *,
        materials (name, unit)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (materialId) {
      query = query.eq('material_id', parseInt(materialId));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching stock history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const transactions = (data || []).map((t) => ({
      id: t.id,
      material_id: t.material_id,
      material_name: (t.materials as unknown as { name: string; unit: string })?.name || 'Okänt',
      material_unit: (t.materials as unknown as { name: string; unit: string })?.unit || 'kg',
      quantity: t.quantity,
      transaction_type: t.transaction_type,
      reference_type: t.reference_type,
      notes: t.notes,
      transaction_date: t.transaction_date,
      created_at: t.created_at,
    }));

    return NextResponse.json({ transactions });
  } catch (err) {
    console.error('Stock history GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
