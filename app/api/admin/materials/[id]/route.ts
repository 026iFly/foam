import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get single material
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('materials')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching material:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ material: data });
  } catch (err) {
    console.error('Material GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT - Update material
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, sku, unit, current_stock, minimum_stock, unit_cost, supplier, lead_time_days } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (sku !== undefined) updates.sku = sku;
    if (unit !== undefined) updates.unit = unit;
    if (current_stock !== undefined) updates.current_stock = current_stock;
    if (minimum_stock !== undefined) updates.minimum_stock = minimum_stock;
    if (unit_cost !== undefined) updates.unit_cost = unit_cost;
    if (supplier !== undefined) updates.supplier = supplier;
    if (lead_time_days !== undefined) updates.lead_time_days = lead_time_days;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('materials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating material:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ material: data });
  } catch (err) {
    console.error('Material PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Delete material
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('materials')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting material:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Material DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
