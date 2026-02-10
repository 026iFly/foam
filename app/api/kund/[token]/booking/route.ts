import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get booking details for customer portal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find booking by customer token
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        id, scheduled_date, scheduled_time, status, booking_type,
        num_installers, slot_type, customer_booked_at, notes,
        quote_requests (
          customer_name, customer_address, customer_email, customer_phone,
          total_excl_vat, adjusted_total_excl_vat, total_incl_vat, adjusted_total_incl_vat,
          rot_deduction, apply_rot_deduction, num_installers, quote_number,
          calculation_data, adjusted_data
        )
      `)
      .eq('customer_token', token)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: 'Bokning ej hittad' }, { status: 404 });
    }

    // Get assigned installers (only first names for privacy)
    const { data: assignments } = await supabaseAdmin
      .from('booking_installers')
      .select(`
        is_lead, status,
        user_profiles (first_name)
      `)
      .eq('booking_id', booking.id)
      .neq('status', 'declined');

    const quoteData = booking.quote_requests as unknown as Record<string, unknown>;

    // Get company settings for reschedule window
    const { data: companyInfo } = await supabaseAdmin
      .from('company_info')
      .select('reschedule_days_before')
      .limit(1)
      .single();

    const rescheduleDaysBefore = companyInfo?.reschedule_days_before || 7;
    const daysUntilBooking = booking.scheduled_date
      ? Math.ceil((new Date(booking.scheduled_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;
    const canReschedule = daysUntilBooking >= rescheduleDaysBefore && (booking.status === 'scheduled' || booking.status === 'confirmed');

    return NextResponse.json({
      booking: {
        id: booking.id,
        scheduled_date: booking.scheduled_date,
        scheduled_time: booking.scheduled_time,
        status: booking.status,
        booking_type: booking.booking_type,
        slot_type: booking.slot_type,
        num_installers: booking.num_installers,
        customer_booked_at: booking.customer_booked_at,
      },
      customer: {
        name: quoteData?.customer_name,
        address: quoteData?.customer_address,
        email: quoteData?.customer_email,
        phone: quoteData?.customer_phone,
      },
      quote: {
        quote_number: quoteData?.quote_number,
        total_incl_vat: quoteData?.adjusted_total_incl_vat || quoteData?.total_incl_vat,
        rot_deduction: quoteData?.rot_deduction,
      },
      installers: (assignments || []).map((a) => ({
        first_name: (a.user_profiles as unknown as { first_name: string })?.first_name || 'Installatör',
        is_lead: a.is_lead,
        confirmed: a.status === 'accepted',
      })),
      can_reschedule: canReschedule,
      reschedule_deadline_days: rescheduleDaysBefore,
    });
  } catch (err) {
    console.error('Customer booking GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
