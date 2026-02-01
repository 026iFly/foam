import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/supabase-auth';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const shipmentId = parseInt(id);

    // Get the shipment with its items
    const { data: shipment, error: shipmentError } = await supabaseAdmin
      .from('shipments')
      .select(`
        *,
        shipment_items (
          id,
          material_id,
          quantity
        )
      `)
      .eq('id', shipmentId)
      .single();

    if (shipmentError || !shipment) {
      return NextResponse.json(
        { error: 'Leverans ej hittad' },
        { status: 404 }
      );
    }

    if (shipment.status === 'received') {
      return NextResponse.json(
        { error: 'Leveransen är redan mottagen' },
        { status: 400 }
      );
    }

    // Update stock levels for each item
    for (const item of shipment.shipment_items || []) {
      // Get current material stock
      const { data: material } = await supabaseAdmin
        .from('materials')
        .select('current_stock')
        .eq('id', item.material_id)
        .single();

      if (material) {
        const newStock = (material.current_stock || 0) + item.quantity;

        // Update material stock
        await supabaseAdmin
          .from('materials')
          .update({ current_stock: newStock })
          .eq('id', item.material_id);

        // Create stock transaction record
        await supabaseAdmin
          .from('stock_transactions')
          .insert({
            material_id: item.material_id,
            quantity: item.quantity,
            transaction_type: 'incoming',
            notes: `Leverans mottagen: ${shipment.supplier || 'Okänd'} (Order: ${shipment.order_number || 'N/A'})`,
            shipment_id: shipmentId,
          });
      }
    }

    // Update shipment status
    const { error: updateError } = await supabaseAdmin
      .from('shipments')
      .update({
        status: 'received',
        received_date: new Date().toISOString(),
      })
      .eq('id', shipmentId);

    if (updateError) {
      console.error('Error updating shipment status:', updateError);
      return NextResponse.json(
        { error: 'Kunde inte uppdatera leveransstatus' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Leverans mottagen och lager uppdaterat',
      items_processed: (shipment.shipment_items || []).length,
    });
  } catch (error) {
    console.error('Error receiving shipment:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid mottagning' },
      { status: 500 }
    );
  }
}
