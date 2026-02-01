import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to get material conversion rates from settings
async function getMaterialConversionRates(): Promise<{ signed: number; sent: number; pending: number }> {
  const { data } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', 'material_conversion_rates')
    .single();

  if (data?.value) {
    const rates = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    return {
      signed: (rates.signed ?? 100) / 100,
      sent: (rates.sent ?? 30) / 100,
      pending: (rates.pending ?? 5) / 100,
    };
  }
  return { signed: 1.0, sent: 0.3, pending: 0.05 };
}

// Helper to calculate projected material needs from quotes WITHOUT bookings
// These are assumed to happen ~30 days from now
async function getProjectedMaterialFromUnbookedQuotes(conversionRates: { signed: number; sent: number; pending: number }) {
  // Get quotes that are in the pipeline
  const { data: quotes } = await supabaseAdmin
    .from('quote_requests')
    .select('id, status, calculation_data, adjusted_data')
    .in('status', ['pending', 'reviewed', 'quoted', 'sent', 'accepted']);

  // Get quote IDs that already have installation bookings (these are handled separately)
  const { data: bookedQuotes } = await supabaseAdmin
    .from('bookings')
    .select('quote_id')
    .eq('booking_type', 'installation')
    .neq('status', 'cancelled');

  const bookedQuoteIds = new Set((bookedQuotes || []).map(b => b.quote_id));

  let projectedClosedKg = 0;
  let projectedOpenKg = 0;

  for (const quote of quotes || []) {
    // Skip if already has installation booked (will be counted from booking_materials)
    if (bookedQuoteIds.has(quote.id)) continue;

    // Determine conversion rate based on status
    let rate = conversionRates.pending;
    if (quote.status === 'sent') rate = conversionRates.sent;
    if (quote.status === 'accepted') rate = conversionRates.signed;

    // Parse calculation data (prefer adjusted if available)
    const dataStr = quote.adjusted_data || quote.calculation_data;
    if (!dataStr) continue;

    try {
      const data = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
      const totals = data.totals;
      if (totals) {
        projectedClosedKg += (totals.totalClosedCellKg || 0) * rate;
        projectedOpenKg += (totals.totalOpenCellKg || 0) * rate;
      }
    } catch {
      // Skip malformed data
    }
  }

  return { projectedClosedKg, projectedOpenKg };
}

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

    // Get conversion rates and projected needs from unbooked quotes
    const conversionRates = await getMaterialConversionRates();
    const { projectedClosedKg, projectedOpenKg } = await getProjectedMaterialFromUnbookedQuotes(conversionRates);

    // For each material, calculate projections
    const materialsWithProjections = await Promise.all(
      (materials || []).map(async (material) => {
        const now = new Date();
        const in7Days = new Date(now);
        in7Days.setDate(in7Days.getDate() + 7);
        const in30Days = new Date(now);
        in30Days.setDate(in30Days.getDate() + 30);

        // CONFIRMED: Reserved from booked installations in next 7 days (100% certain)
        const { data: reserved7 } = await supabaseAdmin
          .from('booking_materials')
          .select('estimated_quantity, bookings!inner(scheduled_date, status)')
          .eq('material_id', material.id)
          .gte('bookings.scheduled_date', now.toISOString().split('T')[0])
          .lt('bookings.scheduled_date', in7Days.toISOString().split('T')[0])
          .neq('bookings.status', 'cancelled')
          .neq('bookings.status', 'completed');

        // CONFIRMED: Reserved from booked installations in next 30 days (100% certain)
        const { data: reserved30 } = await supabaseAdmin
          .from('booking_materials')
          .select('estimated_quantity, bookings!inner(scheduled_date, status)')
          .eq('material_id', material.id)
          .gte('bookings.scheduled_date', now.toISOString().split('T')[0])
          .lt('bookings.scheduled_date', in30Days.toISOString().split('T')[0])
          .neq('bookings.status', 'cancelled')
          .neq('bookings.status', 'completed');

        // Incoming shipments in 7 days
        const { data: incoming7 } = await supabaseAdmin
          .from('shipment_items')
          .select('quantity, shipments!inner(expected_date, status)')
          .eq('material_id', material.id)
          .gte('shipments.expected_date', now.toISOString().split('T')[0])
          .lt('shipments.expected_date', in7Days.toISOString().split('T')[0])
          .in('shipments.status', ['ordered', 'shipped']);

        // Incoming shipments in 30 days
        const { data: incoming30 } = await supabaseAdmin
          .from('shipment_items')
          .select('quantity, shipments!inner(expected_date, status)')
          .eq('material_id', material.id)
          .gte('shipments.expected_date', now.toISOString().split('T')[0])
          .lt('shipments.expected_date', in30Days.toISOString().split('T')[0])
          .in('shipments.status', ['ordered', 'shipped']);

        // Sum up confirmed bookings
        const confirmedReserved7Days = (reserved7 || []).reduce((sum, r) => sum + (r.estimated_quantity || 0), 0);
        const confirmedReserved30Days = (reserved30 || []).reduce((sum, r) => sum + (r.estimated_quantity || 0), 0);
        const incoming7Days = (incoming7 || []).reduce((sum, r) => sum + (r.quantity || 0), 0);
        const incoming30Days = (incoming30 || []).reduce((sum, r) => sum + (r.quantity || 0), 0);

        // Match material to projected needs from unbooked quotes (assumed ~30 days out)
        const nameLower = material.name.toLowerCase();
        let projectedFromQuotes = 0;
        if (nameLower.includes('öppen') || nameLower.includes('open')) {
          projectedFromQuotes = Math.round(projectedOpenKg);
        } else if (nameLower.includes('sluten') || nameLower.includes('closed')) {
          projectedFromQuotes = Math.round(projectedClosedKg);
        }

        // 7-day projection: Only confirmed bookings (unbooked quotes assumed to be 30+ days out)
        const stock7Days = material.current_stock - confirmedReserved7Days + incoming7Days;

        // 30-day projection: Confirmed bookings + projected from unbooked quotes
        const stock30Days = material.current_stock - confirmedReserved30Days - projectedFromQuotes + incoming30Days;

        return {
          ...material,
          is_low: material.current_stock <= material.minimum_stock,
          // Confirmed from booked installations
          confirmed_7_days: confirmedReserved7Days,
          confirmed_30_days: confirmedReserved30Days,
          // Incoming shipments
          incoming_7_days: incoming7Days,
          incoming_30_days: incoming30Days,
          // Projected from unbooked quotes (with conversion rates applied)
          projected_from_quotes: projectedFromQuotes,
          // Stock projections
          stock_in_7_days: stock7Days,
          stock_in_30_days: stock30Days,
          // Warning flags
          low_in_7_days: stock7Days < material.minimum_stock,
          low_in_30_days: stock30Days < material.minimum_stock,
        };
      })
    );

    return NextResponse.json({
      materials: materialsWithProjections,
      projections: {
        closedCellKg: Math.round(projectedClosedKg),
        openCellKg: Math.round(projectedOpenKg),
        conversionRates,
      }
    });
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
