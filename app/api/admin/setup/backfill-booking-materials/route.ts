import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/supabase-auth';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Backfill booking_materials for existing installation bookings
export async function POST() {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all installation bookings with quotes
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('id, quote_id')
      .eq('booking_type', 'installation')
      .not('quote_id', 'is', null);

    if (bookingsError) {
      return NextResponse.json({ error: bookingsError.message }, { status: 500 });
    }

    // Get existing booking_materials to avoid duplicates
    const { data: existingMaterials } = await supabaseAdmin
      .from('booking_materials')
      .select('booking_id');

    const bookingsWithMaterials = new Set((existingMaterials || []).map(m => m.booking_id));

    // Get material IDs
    const { data: materials } = await supabaseAdmin
      .from('materials')
      .select('id, name');

    const openCellMaterial = materials?.find(m =>
      m.name.toLowerCase().includes('öppen') || m.name.toLowerCase().includes('open')
    );
    const closedCellMaterial = materials?.find(m =>
      m.name.toLowerCase().includes('sluten') || m.name.toLowerCase().includes('closed')
    );

    if (!openCellMaterial && !closedCellMaterial) {
      return NextResponse.json({
        error: 'No foam materials found. Add materials named "Öppen cellskum" and "Sluten cellskum" first.',
      }, { status: 400 });
    }

    let backfilledCount = 0;
    const errors: string[] = [];

    for (const booking of bookings || []) {
      // Skip if already has materials
      if (bookingsWithMaterials.has(booking.id)) continue;

      // Fetch quote calculation data
      const { data: quote } = await supabaseAdmin
        .from('quote_requests')
        .select('calculation_data, adjusted_data')
        .eq('id', booking.quote_id)
        .single();

      if (!quote) continue;

      const dataStr = quote.adjusted_data || quote.calculation_data;
      if (!dataStr) continue;

      try {
        const calcData = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
        const totals = calcData.totals;

        if (!totals) continue;

        const bookingMaterials = [];

        // Add open cell foam if needed
        if (totals.totalOpenCellKg > 0 && openCellMaterial) {
          bookingMaterials.push({
            booking_id: booking.id,
            material_id: openCellMaterial.id,
            estimated_quantity: Math.round(totals.totalOpenCellKg * 10) / 10,
          });
        }

        // Add closed cell foam if needed
        if (totals.totalClosedCellKg > 0 && closedCellMaterial) {
          bookingMaterials.push({
            booking_id: booking.id,
            material_id: closedCellMaterial.id,
            estimated_quantity: Math.round(totals.totalClosedCellKg * 10) / 10,
          });
        }

        // Insert material requirements
        if (bookingMaterials.length > 0) {
          const { error: insertError } = await supabaseAdmin
            .from('booking_materials')
            .insert(bookingMaterials);

          if (insertError) {
            errors.push(`Booking ${booking.id}: ${insertError.message}`);
          } else {
            backfilledCount++;
          }
        }
      } catch (parseErr) {
        errors.push(`Booking ${booking.id}: Could not parse calculation data`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfilled ${backfilledCount} bookings with material requirements`,
      backfilled: backfilledCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Backfill error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET - Check status
export async function GET() {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Count installation bookings
    const { count: totalBookings } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('booking_type', 'installation')
      .not('quote_id', 'is', null);

    // Count bookings with materials
    const { data: bookingsWithMaterials } = await supabaseAdmin
      .from('booking_materials')
      .select('booking_id');

    const uniqueBookingsWithMaterials = new Set((bookingsWithMaterials || []).map(m => m.booking_id)).size;

    return NextResponse.json({
      totalInstallationBookings: totalBookings || 0,
      bookingsWithMaterials: uniqueBookingsWithMaterials,
      bookingsMissingMaterials: (totalBookings || 0) - uniqueBookingsWithMaterials,
    });
  } catch (err) {
    console.error('Status check error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
