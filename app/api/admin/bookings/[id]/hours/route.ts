import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAuthenticated } from '@/lib/supabase-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUT - Set actual_hours and debitable_hours per installer
export async function PUT(
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
    const { hours } = body as {
      hours: Array<{
        installer_id: string;
        actual_hours: number;
        debitable_hours: number;
      }>;
    };

    if (!hours || !Array.isArray(hours)) {
      return NextResponse.json({ error: 'hours array required' }, { status: 400 });
    }

    // Update each installer's hours
    for (const entry of hours) {
      await supabaseAdmin
        .from('booking_installers')
        .update({
          actual_hours: entry.actual_hours,
          debitable_hours: entry.debitable_hours,
        })
        .eq('booking_id', bookingId)
        .eq('installer_id', entry.installer_id);
    }

    // Mark overbooking as resolved
    await supabaseAdmin
      .from('bookings')
      .update({ overbooking_resolved: true })
      .eq('id', bookingId);

    // Complete the overbooking task if exists
    await supabaseAdmin
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('booking_id', bookingId)
      .like('title', '%fakturerbara timmar%')
      .eq('status', 'pending');

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Hours PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
