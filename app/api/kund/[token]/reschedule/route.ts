import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Reschedule booking
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { new_date } = body;

    if (!new_date) {
      return NextResponse.json({ error: 'Nytt datum krävs' }, { status: 400 });
    }

    // Find booking
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('id, scheduled_date, status')
      .eq('customer_token', token)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: 'Bokning ej hittad' }, { status: 404 });
    }

    if (booking.status !== 'scheduled') {
      return NextResponse.json({ error: 'Bokningen kan inte ändras' }, { status: 400 });
    }

    // Check reschedule window
    const { data: companyInfo } = await supabaseAdmin
      .from('company_info')
      .select('reschedule_days_before')
      .limit(1)
      .single();

    const rescheduleDaysBefore = companyInfo?.reschedule_days_before || 7;
    const daysUntil = Math.ceil(
      (new Date(booking.scheduled_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil < rescheduleDaysBefore) {
      return NextResponse.json(
        { error: `Ombokning måste ske minst ${rescheduleDaysBefore} dagar innan` },
        { status: 400 }
      );
    }

    // Update booking date
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ scheduled_date: new_date, updated_at: new Date().toISOString() })
      .eq('id', booking.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Remove current installer assignments (they'll need to be reassigned)
    await supabaseAdmin
      .from('booking_installers')
      .delete()
      .eq('booking_id', booking.id);

    return NextResponse.json({
      success: true,
      message: 'Bokningen har ombokats',
      new_date,
    });
  } catch (err) {
    console.error('Reschedule POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
