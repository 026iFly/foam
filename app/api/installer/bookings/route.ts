import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/supabase-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get installer's assigned bookings
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all booking assignments for this installer
    const { data: assignments, error } = await supabaseAdmin
      .from('booking_installers')
      .select(`
        is_lead, status,
        bookings (
          id, booking_type, scheduled_date, scheduled_time, status, slot_type,
          quote_requests (customer_name, customer_address)
        )
      `)
      .eq('installer_id', user.id)
      .neq('status', 'declined');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const bookings = (assignments || [])
      .filter(a => a.bookings)
      .map(a => {
        const b = a.bookings as unknown as {
          id: number;
          booking_type: string;
          scheduled_date: string;
          scheduled_time: string | null;
          status: string;
          slot_type: string;
          quote_requests: { customer_name: string; customer_address: string } | null;
        };
        return {
          id: b.id,
          booking_type: b.booking_type,
          scheduled_date: b.scheduled_date,
          scheduled_time: b.scheduled_time,
          status: b.status,
          slot_type: b.slot_type || 'full',
          is_lead: a.is_lead,
          assignment_status: a.status,
          customer_name: b.quote_requests?.customer_name || '',
          customer_address: b.quote_requests?.customer_address || '',
        };
      });

    return NextResponse.json({ bookings });
  } catch (err) {
    console.error('Installer bookings GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
