import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAllAvailability } from '@/lib/installer-availability';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get available slots for booking/rebooking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find quote by customer token to get num_installers
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quote_requests')
      .select('id, num_installers')
      .eq('customer_token', token)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Offert ej hittad' }, { status: 404 });
    }

    // Check if there's an existing booking with slot_type
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('slot_type')
      .eq('quote_id', quote.id)
      .eq('booking_type', 'installation')
      .limit(1);

    const numInstallers = quote.num_installers || 2;
    const slotType = ((bookings?.[0]?.slot_type) || 'full') as 'full' | 'morning' | 'afternoon';

    // Look ahead 8 weeks
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + 1); // Tomorrow at earliest
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 56); // 8 weeks

    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = toDate.toISOString().split('T')[0];

    const availability = await getAllAvailability(fromStr, toStr, slotType);

    // Find dates where enough installers are available
    const availableSlots: string[] = [];

    for (const [date, installers] of Object.entries(availability)) {
      // Skip weekends
      const dayOfWeek = new Date(date).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const availableCount = installers.filter((i) => i.available).length;
      if (availableCount >= numInstallers) {
        availableSlots.push(date);
      }
    }

    return NextResponse.json({
      available_dates: availableSlots,
      slot_type: slotType,
      num_installers: numInstallers,
    });
  } catch (err) {
    console.error('Available slots GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
