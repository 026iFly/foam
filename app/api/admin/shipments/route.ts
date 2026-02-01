import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all shipments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabaseAdmin
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
      .order('expected_date', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    } else {
      // By default, only show non-received shipments
      query = query.in('status', ['ordered', 'shipped']);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching shipments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ shipments: data || [] });
  } catch (err) {
    console.error('Shipments GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Create new shipment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supplier, order_number, expected_date, notes, items } = body;

    if (!expected_date) {
      return NextResponse.json(
        { error: 'expected_date is required' },
        { status: 400 }
      );
    }

    // Create shipment
    const { data: shipment, error: shipmentError } = await supabaseAdmin
      .from('shipments')
      .insert({
        supplier: supplier || null,
        order_number: order_number || null,
        expected_date,
        status: 'ordered',
        notes: notes || null,
      })
      .select()
      .single();

    if (shipmentError) {
      console.error('Error creating shipment:', shipmentError);
      return NextResponse.json({ error: shipmentError.message }, { status: 500 });
    }

    // Add items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      const shipmentItems = items.map((item: { material_id: number; quantity: number; unit_cost?: number }) => ({
        shipment_id: shipment.id,
        material_id: item.material_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost || null,
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('shipment_items')
        .insert(shipmentItems);

      if (itemsError) {
        console.error('Error adding shipment items:', itemsError);
        // Don't fail the whole request
      }
    }

    return NextResponse.json({ shipment });
  } catch (err) {
    console.error('Shipments POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
