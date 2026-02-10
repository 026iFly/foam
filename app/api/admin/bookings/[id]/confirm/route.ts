import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/supabase-auth';
import { createClient } from '@supabase/supabase-js';
import {
  isGoogleCalendarConfigured,
  updateCalendarEvent,
  BookingWithCustomer,
} from '@/lib/google-calendar';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const bookingId = parseInt(id, 10);

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    const body = await request.json();
    const { materials } = body as {
      materials: Array<{ material_id: number; actual_quantity: number }>;
    };

    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      return NextResponse.json({ error: 'Materials array is required' }, { status: 400 });
    }

    // Fetch booking with quote info
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        quote_requests (
          id,
          customer_name,
          customer_address,
          customer_phone,
          customer_email,
          quote_number
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Bokning ej hittad' }, { status: 404 });
    }

    if (booking.status === 'completed') {
      return NextResponse.json({ error: 'Bokningen är redan slutförd' }, { status: 400 });
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Bokningen är avbokad' }, { status: 400 });
    }

    // Process each material: update booking_materials, deduct stock, record transaction
    const updatedStockLevels: Array<{ material_id: number; new_stock: number }> = [];

    for (const mat of materials) {
      // Update actual_quantity in booking_materials
      await supabaseAdmin
        .from('booking_materials')
        .update({ actual_quantity: mat.actual_quantity })
        .eq('booking_id', bookingId)
        .eq('material_id', mat.material_id);

      // Get current stock
      const { data: material } = await supabaseAdmin
        .from('materials')
        .select('current_stock, name')
        .eq('id', mat.material_id)
        .single();

      if (material) {
        const newStock = (material.current_stock || 0) - mat.actual_quantity;

        // Update material stock
        await supabaseAdmin
          .from('materials')
          .update({ current_stock: newStock })
          .eq('id', mat.material_id);

        // Record stock transaction
        await supabaseAdmin
          .from('stock_transactions')
          .insert({
            material_id: mat.material_id,
            quantity: -mat.actual_quantity,
            transaction_type: 'installation',
            reference_type: 'booking',
            reference_id: bookingId,
            transaction_date: new Date().toISOString().split('T')[0],
            notes: `Installation: ${booking.quote_requests?.customer_name || 'Okänd kund'} (${material.name})`,
          });

        updatedStockLevels.push({ material_id: mat.material_id, new_stock: newStock });
      }
    }

    // Update booking status to completed
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking status:', updateError);
      return NextResponse.json({ error: 'Kunde inte uppdatera bokningsstatus' }, { status: 500 });
    }

    // Sync Google Calendar
    if (isGoogleCalendarConfigured() && booking.google_event_id) {
      try {
        const { data: bookingMaterials } = await supabaseAdmin
          .from('booking_materials')
          .select(`estimated_quantity, materials (name)`)
          .eq('booking_id', bookingId);

        const bookingForCalendar: BookingWithCustomer = {
          id: booking.id,
          quote_id: booking.quote_id,
          booking_type: booking.booking_type,
          scheduled_date: booking.scheduled_date,
          scheduled_time: booking.scheduled_time,
          status: 'completed',
          notes: booking.notes,
          google_event_id: booking.google_event_id,
          customer_name: booking.quote_requests?.customer_name,
          customer_address: booking.quote_requests?.customer_address,
          customer_phone: booking.quote_requests?.customer_phone,
          customer_email: booking.quote_requests?.customer_email,
          materials: bookingMaterials?.map((bm) => {
            const m = bm.materials as unknown as { name: string } | null;
            return {
              name: m?.name || 'Unknown',
              estimated_quantity: bm.estimated_quantity,
            };
          }),
        };

        await updateCalendarEvent(booking.google_event_id, bookingForCalendar);
      } catch (calendarErr) {
        console.error('Error syncing to Google Calendar:', calendarErr);
      }
    }

    // Create invoice task
    const customerName = booking.quote_requests?.customer_name || 'Okänd kund';
    const quoteNumber = booking.quote_requests?.quote_number || '';
    const taskTitle = quoteNumber
      ? `Skapa och skicka faktura: ${customerName} (${quoteNumber})`
      : `Skapa och skicka faktura: ${customerName}`;

    const { data: task } = await supabaseAdmin
      .from('tasks')
      .insert({
        title: taskTitle,
        description: `Installation slutförd. Skapa och skicka faktura till ${customerName}.`,
        priority: 'high',
        task_type: 'invoice',
        quote_id: booking.quote_id,
        status: 'pending',
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      message: 'Installation bekräftad och lager uppdaterat',
      booking_id: bookingId,
      task_id: task?.id,
      updated_stock: updatedStockLevels,
    });
  } catch (error) {
    console.error('Error confirming installation:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid bekräftelse av installation' },
      { status: 500 }
    );
  }
}
