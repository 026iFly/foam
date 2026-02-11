import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get booking details for customer portal (lookup via quote's customer_token)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find quote by customer token
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quote_requests')
      .select(`
        id, customer_name, customer_address, customer_email, customer_phone,
        total_excl_vat, adjusted_total_excl_vat, total_incl_vat, adjusted_total_incl_vat,
        rot_deduction, apply_rot_deduction, num_installers, quote_number,
        calculation_data, adjusted_data, rot_customer_info, rot_max_per_person, rot_customer_max
      `)
      .eq('customer_token', token)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Offert ej hittad' }, { status: 404 });
    }

    // Find linked booking(s) — may be zero if customer hasn't booked yet
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('id, scheduled_date, scheduled_time, status, booking_type, num_installers, slot_type, customer_booked_at, notes')
      .eq('quote_id', quote.id)
      .eq('booking_type', 'installation')
      .order('created_at', { ascending: false })
      .limit(1);

    const booking = bookings?.[0] || null;

    // Get assigned installers if booking exists
    let installers: Array<{ first_name: string; is_lead: boolean; confirmed: boolean }> = [];
    if (booking) {
      const { data: assignments } = await supabaseAdmin
        .from('booking_installers')
        .select(`
          is_lead, status,
          user_profiles (first_name)
        `)
        .eq('booking_id', booking.id)
        .neq('status', 'declined');

      installers = (assignments || []).map((a) => ({
        first_name: (a.user_profiles as unknown as { first_name: string })?.first_name || 'Installatör',
        is_lead: a.is_lead,
        confirmed: a.status === 'accepted',
      }));
    }

    // Get company settings for reschedule window
    const { data: companyInfo } = await supabaseAdmin
      .from('company_info')
      .select('reschedule_days_before')
      .limit(1)
      .single();

    const rescheduleDaysBefore = companyInfo?.reschedule_days_before || 7;
    let canReschedule = false;
    if (booking?.scheduled_date) {
      const daysUntilBooking = Math.ceil(
        (new Date(booking.scheduled_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      canReschedule = daysUntilBooking >= rescheduleDaysBefore &&
        (booking.status === 'scheduled' || booking.status === 'confirmed');
    }

    // Parse ROT customer info if present
    let rotCustomerInfo = null;
    if (quote.rot_customer_info) {
      try {
        rotCustomerInfo = typeof quote.rot_customer_info === 'string'
          ? JSON.parse(quote.rot_customer_info)
          : quote.rot_customer_info;
      } catch { /* ignore parse errors */ }
    }

    return NextResponse.json({
      booking: booking ? {
        id: booking.id,
        scheduled_date: booking.scheduled_date,
        scheduled_time: booking.scheduled_time,
        status: booking.status,
        booking_type: booking.booking_type,
        slot_type: booking.slot_type,
        num_installers: booking.num_installers,
        customer_booked_at: booking.customer_booked_at,
      } : null,
      customer: {
        name: quote.customer_name,
        address: quote.customer_address,
        email: quote.customer_email,
        phone: quote.customer_phone,
      },
      quote: {
        quote_number: quote.quote_number,
        total_incl_vat: quote.adjusted_total_incl_vat || quote.total_incl_vat,
        rot_deduction: quote.rot_deduction,
        apply_rot_deduction: quote.apply_rot_deduction,
        rot_max_per_person: quote.rot_max_per_person,
        rot_customer_max: quote.rot_customer_max,
      },
      rot_customer_info: rotCustomerInfo,
      installers,
      can_reschedule: canReschedule,
      reschedule_deadline_days: rescheduleDaysBefore,
      has_booking: !!booking,
    });
  } catch (err) {
    console.error('Customer booking GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
