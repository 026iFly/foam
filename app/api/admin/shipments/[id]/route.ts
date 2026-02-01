import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get single shipment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shipmentId = parseInt(id);

    const { data, error } = await supabaseAdmin
      .from('shipments')
      .select(`
        *,
        shipment_items (
          id,
          material_id,
          quantity,
          unit_cost,
          materials (name, unit)
        )
      `)
      .eq('id', shipmentId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    return NextResponse.json({ shipment: data });
  } catch (err) {
    console.error('Shipment GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT - Update shipment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shipmentId = parseInt(id);
    const body = await request.json();
    const { supplier, order_number, expected_date, status, notes, items } = body;

    // Update shipment
    const updateData: Record<string, unknown> = {};
    if (supplier !== undefined) updateData.supplier = supplier;
    if (order_number !== undefined) updateData.order_number = order_number;
    if (expected_date !== undefined) updateData.expected_date = expected_date;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('shipments')
        .update(updateData)
        .eq('id', shipmentId);

      if (updateError) {
        console.error('Error updating shipment:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await supabaseAdmin
        .from('shipment_items')
        .delete()
        .eq('shipment_id', shipmentId);

      // Insert new items
      if (items.length > 0) {
        const shipmentItems = items.map((item: { material_id: number; quantity: number; unit_cost?: number }) => ({
          shipment_id: shipmentId,
          material_id: item.material_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost || null,
        }));

        const { error: itemsError } = await supabaseAdmin
          .from('shipment_items')
          .insert(shipmentItems);

        if (itemsError) {
          console.error('Error updating shipment items:', itemsError);
        }
      }
    }

    // Fetch updated shipment
    const { data, error } = await supabaseAdmin
      .from('shipments')
      .select(`
        *,
        shipment_items (
          id,
          material_id,
          quantity,
          unit_cost,
          materials (name, unit)
        )
      `)
      .eq('id', shipmentId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ shipment: data });
  } catch (err) {
    console.error('Shipment PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Delete shipment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shipmentId = parseInt(id);

    // Delete items first (cascade should handle this, but be explicit)
    await supabaseAdmin
      .from('shipment_items')
      .delete()
      .eq('shipment_id', shipmentId);

    // Delete shipment
    const { error } = await supabaseAdmin
      .from('shipments')
      .delete()
      .eq('id', shipmentId);

    if (error) {
      console.error('Error deleting shipment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Shipment DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
