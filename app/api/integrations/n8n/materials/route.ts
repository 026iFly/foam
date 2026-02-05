import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple API key auth for n8n
function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = process.env.N8N_API_KEY;

  if (!expectedKey) {
    return true;
  }

  return apiKey === expectedKey;
}

// GET - List materials and stock levels
export async function GET(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeShipments = searchParams.get('include_shipments') === 'true';

    // Get materials with current stock
    const { data: materials, error: materialsError } = await supabaseAdmin
      .from('materials')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (materialsError) {
      return NextResponse.json({ error: materialsError.message }, { status: 500 });
    }

    // Get pending shipments if requested
    let pendingShipments: Array<{
      id: number;
      material_id: number;
      quantity_kg: number;
      expected_date: string;
      status: string;
    }> = [];

    if (includeShipments) {
      const { data: shipments } = await supabaseAdmin
        .from('material_shipments')
        .select('id, material_id, quantity_kg, expected_date, status')
        .in('status', ['ordered', 'in_transit'])
        .order('expected_date', { ascending: true });

      pendingShipments = shipments || [];
    }

    // Format materials with stock status
    const formatted = materials?.map(m => {
      const stockPercentage = m.reorder_threshold_kg
        ? Math.round((m.current_stock_kg / m.reorder_threshold_kg) * 100)
        : null;

      const incoming = pendingShipments
        .filter(s => s.material_id === m.id)
        .reduce((sum, s) => sum + s.quantity_kg, 0);

      return {
        id: m.id,
        name: m.name,
        unit: m.unit,
        currentStock: m.current_stock_kg,
        reorderThreshold: m.reorder_threshold_kg,
        stockPercentage,
        stockStatus: stockPercentage !== null
          ? stockPercentage < 50 ? 'low' : stockPercentage < 100 ? 'ok' : 'good'
          : 'unknown',
        incomingStock: incoming,
        pendingShipments: includeShipments
          ? pendingShipments.filter(s => s.material_id === m.id)
          : undefined,
      };
    }) || [];

    // Low stock alerts
    const lowStock = formatted.filter(m => m.stockStatus === 'low');

    return NextResponse.json({
      success: true,
      count: formatted.length,
      lowStockCount: lowStock.length,
      materials: formatted,
      lowStockAlerts: lowStock,
    });
  } catch (err) {
    console.error('n8n materials GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT - Update stock level
export async function PUT(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, current_stock_kg, adjustment, reason } = body;

    if (!id) {
      return NextResponse.json({ error: 'Material ID required' }, { status: 400 });
    }

    // Get current stock
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('materials')
      .select('current_stock_kg, name')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // Calculate new stock
    let newStock: number;
    if (current_stock_kg !== undefined) {
      newStock = current_stock_kg;
    } else if (adjustment !== undefined) {
      newStock = current.current_stock_kg + adjustment;
    } else {
      return NextResponse.json({ error: 'Provide current_stock_kg or adjustment' }, { status: 400 });
    }

    // Update stock
    const { error: updateError } = await supabaseAdmin
      .from('materials')
      .update({
        current_stock_kg: newStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the adjustment
    await supabaseAdmin
      .from('stock_adjustments')
      .insert({
        material_id: id,
        previous_stock: current.current_stock_kg,
        new_stock: newStock,
        adjustment: newStock - current.current_stock_kg,
        reason: reason || 'Updated via API',
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle(); // Don't fail if table doesn't exist

    return NextResponse.json({
      success: true,
      material: {
        id,
        name: current.name,
        previousStock: current.current_stock_kg,
        newStock,
        adjustment: newStock - current.current_stock_kg,
      },
    });
  } catch (err) {
    console.error('n8n materials PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
