import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Adjust stock (add or subtract)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { quantity, transaction_type, notes } = body;

    if (quantity === undefined || quantity === 0) {
      return NextResponse.json({ error: 'Quantity is required and cannot be 0' }, { status: 400 });
    }

    // Get current material
    const { data: material, error: materialError } = await supabaseAdmin
      .from('materials')
      .select('current_stock')
      .eq('id', id)
      .single();

    if (materialError) {
      console.error('Error fetching material:', materialError);
      return NextResponse.json({ error: materialError.message }, { status: 500 });
    }

    const newStock = (material.current_stock || 0) + quantity;

    // Update material stock
    const { error: updateError } = await supabaseAdmin
      .from('materials')
      .update({ current_stock: newStock })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating material stock:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Record the transaction
    const { error: transactionError } = await supabaseAdmin
      .from('stock_transactions')
      .insert({
        material_id: parseInt(id),
        quantity,
        transaction_type: transaction_type || 'adjustment',
        reference_type: 'manual',
        transaction_date: new Date().toISOString().split('T')[0],
        notes: notes || null,
      });

    if (transactionError) {
      console.error('Error recording transaction:', transactionError);
      // Don't fail the whole request, just log it
    }

    return NextResponse.json({
      success: true,
      new_stock: newStock,
    });
  } catch (err) {
    console.error('Stock adjust error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
