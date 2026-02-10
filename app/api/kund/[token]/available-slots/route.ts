import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAllAvailability } from '@/lib/installer-availability';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get available slots for rebooking/self-booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find booking to get num_installers and slot_type
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('id, num_installers, slot_type')
      .eq('customer_token', token)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: 'Bokning ej hittad' }, { status: 404 });
    }

    const numInstallers = booking.num_installers || 2;
    const slotType = (booking.slot_type || 'full') as 'full' | 'morning' | 'afternoon';

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
