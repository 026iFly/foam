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

// GET - List quotes/quote requests
export async function GET(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const id = searchParams.get('id');

    // If specific ID requested
    if (id) {
      const { data: quote, error } = await supabaseAdmin
        .from('quote_requests')
        .select(`
          *,
          bookings (
            id,
            booking_type,
            scheduled_date,
            scheduled_time,
            status
          )
        `)
        .eq('id', parseInt(id))
        .single();

      if (error) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
      }

      // Extract foam usage details from calculation_data for bot consumption
      // calculation_data is a CalculationData object with recommendations[]
      const calcData = quote.calculation_data as {
        recommendations?: Array<{
          partName?: string;
          area?: number;
          totalThickness?: number;
          closedCellThickness?: number;
          openCellThickness?: number;
          closedCellKg?: number;
          openCellKg?: number;
          configType?: string;
        }>;
        totals?: {
          totalArea?: number;
          totalClosedCellKg?: number;
          totalOpenCellKg?: number;
        };
      } | null;

      const foamDetails = calcData?.recommendations?.map(part => ({
        partName: part.partName ?? null,
        area_m2: part.area ?? null,
        thickness_mm: part.totalThickness ?? null,
        closedCellThickness_mm: part.closedCellThickness ?? null,
        openCellThickness_mm: part.openCellThickness ?? null,
        closedCellKg: part.closedCellKg ?? null,
        openCellKg: part.openCellKg ?? null,
        configType: part.configType ?? null,
      })) ?? [];

      const foamTotals = calcData?.totals ? {
        totalArea_m2: calcData.totals.totalArea ?? null,
        totalClosedCellKg: calcData.totals.totalClosedCellKg ?? null,
        totalOpenCellKg: calcData.totals.totalOpenCellKg ?? null,
      } : null;

      const totalInclVat = quote.total_incl_vat ?? null;
      const rotDeduction = quote.rot_deduction ?? 0;

      return NextResponse.json({
        success: true,
        quote: {
          ...quote,
          // Backwards-compatible aliases
          total_price_incl_vat: totalInclVat,
          price_after_rot: totalInclVat != null ? totalInclVat - rotDeduction : null,
          // Structured foam data for the bot
          foamDetails,
          foamTotals,
        },
      });
    }

    // List quotes
    let query = supabaseAdmin
      .from('quote_requests')
      .select(`
        id,
        quote_number,
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        status,
        total_incl_vat,
        total_area,
        apply_rot_deduction,
        rot_deduction,
        created_at,
        email_sent_at
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,quote_number.ilike.%${search}%`);
    }

    const { data: quotes, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format for easier consumption
    const formatted = quotes?.map(q => {
      const totalPrice = q.total_incl_vat ?? null;
      const rotDed = q.rot_deduction ?? 0;
      return {
        id: q.id,
        quoteNumber: q.quote_number,
        customerName: q.customer_name,
        customerEmail: q.customer_email,
        customerPhone: q.customer_phone,
        customerAddress: q.customer_address,
        status: q.status,
        totalPrice,
        totalArea: q.total_area ?? null,
        hasRot: q.apply_rot_deduction,
        priceAfterRot: totalPrice != null ? totalPrice - rotDed : null,
        createdAt: q.created_at,
        sentAt: q.email_sent_at,
      };
    });

    return NextResponse.json({
      success: true,
      count: formatted?.length || 0,
      quotes: formatted || [],
    });
  } catch (err) {
    console.error('n8n quotes GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT - Update quote status
export async function PUT(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Quote ID required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updateData.status = status;
    if (notes !== undefined) updateData.internal_notes = notes;

    const { data: quote, error } = await supabaseAdmin
      .from('quote_requests')
      .update(updateData)
      .eq('id', id)
      .select('id, quote_number, status')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (err) {
    console.error('n8n quotes PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
