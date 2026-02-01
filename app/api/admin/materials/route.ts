import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all materials with stock projections
export async function GET() {
  try {
    // First get materials
    const { data: materials, error: materialsError } = await supabaseAdmin
      .from('materials')
      .select('*')
      .order('name', { ascending: true });

    if (materialsError) {
      console.error('Error fetching materials:', materialsError);
      return NextResponse.json({ error: materialsError.message }, { status: 500 });
    }

    // For each material, calculate projections
    const materialsWithProjections = await Promise.all(
      (materials || []).map(async (material) => {
        // Get reserved quantities from bookings in next 7 and 30 days
        const now = new Date();
        const in7Days = new Date(now);
        in7Days.setDate(in7Days.getDate() + 7);
        const in30Days = new Date(now);
        in30Days.setDate(in30Days.getDate() + 30);

        // Reserved in 7 days
        const { data: reserved7 } = await supabaseAdmin
          .from('booking_materials')
          .select('estimated_quantity, bookings!inner(scheduled_date, status)')
          .eq('material_id', material.id)
          .gte('bookings.scheduled_date', now.toISOString().split('T')[0])
          .lt('bookings.scheduled_date', in7Days.toISOString().split('T')[0])
          .neq('bookings.status', 'cancelled')
          .neq('bookings.status', 'completed');

        // Reserved in 30 days
        const { data: reserved30 } = await supabaseAdmin
          .from('booking_materials')
          .select('estimated_quantity, bookings!inner(scheduled_date, status)')
          .eq('material_id', material.id)
          .gte('bookings.scheduled_date', now.toISOString().split('T')[0])
          .lt('bookings.scheduled_date', in30Days.toISOString().split('T')[0])
          .neq('bookings.status', 'cancelled')
          .neq('bookings.status', 'completed');

        // Incoming in 7 days
        const { data: incoming7 } = await supabaseAdmin
          .from('shipment_items')
          .select('quantity, shipments!inner(expected_date, status)')
          .eq('material_id', material.id)
          .gte('shipments.expected_date', now.toISOString().split('T')[0])
          .lt('shipments.expected_date', in7Days.toISOString().split('T')[0])
          .in('shipments.status', ['ordered', 'shipped']);

        // Incoming in 30 days
        const { data: incoming30 } = await supabaseAdmin
          .from('shipment_items')
          .select('quantity, shipments!inner(expected_date, status)')
          .eq('material_id', material.id)
          .gte('shipments.expected_date', now.toISOString().split('T')[0])
          .lt('shipments.expected_date', in30Days.toISOString().split('T')[0])
          .in('shipments.status', ['ordered', 'shipped']);

        const reserved7Days = (reserved7 || []).reduce((sum, r) => sum + (r.estimated_quantity || 0), 0);
        const reserved30Days = (reserved30 || []).reduce((sum, r) => sum + (r.estimated_quantity || 0), 0);
        const incoming7Days = (incoming7 || []).reduce((sum, r) => sum + (r.quantity || 0), 0);
        const incoming30Days = (incoming30 || []).reduce((sum, r) => sum + (r.quantity || 0), 0);

        return {
          ...material,
          is_low: material.current_stock <= material.minimum_stock,
          reserved_7_days: reserved7Days,
          reserved_30_days: reserved30Days,
          incoming_7_days: incoming7Days,
          incoming_30_days: incoming30Days,
          stock_in_7_days: material.current_stock - reserved7Days + incoming7Days,
          stock_in_30_days: material.current_stock - reserved30Days + incoming30Days,
        };
      })
    );

    return NextResponse.json({ materials: materialsWithProjections });
  } catch (err) {
    console.error('Materials GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Create new material
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, sku, unit, current_stock, minimum_stock, unit_cost, supplier, lead_time_days } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('materials')
      .insert({
        name,
        sku: sku || null,
        unit: unit || 'kg',
        current_stock: current_stock || 0,
        minimum_stock: minimum_stock || 0,
        unit_cost: unit_cost || null,
        supplier: supplier || null,
        lead_time_days: lead_time_days || 7,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating material:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ material: data });
  } catch (err) {
    console.error('Materials POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
