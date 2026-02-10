import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleInstallerAccept, handleInstallerDecline } from '@/lib/auto-assign';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - View confirmation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const { data: confirmation, error } = await supabaseAdmin
      .from('booking_confirmation_requests')
      .select(`
        id, booking_id, installer_id, status, channel,
        bookings (
          scheduled_date, slot_type, num_installers,
          quote_requests (customer_name, customer_address)
        ),
        user_profiles (first_name, last_name)
      `)
      .eq('token', token)
      .single();

    if (error || !confirmation) {
      return NextResponse.json({ error: 'Bekräftelse ej hittad' }, { status: 404 });
    }

    const booking = confirmation.bookings as unknown as {
      scheduled_date: string;
      slot_type: string;
      num_installers: number;
      quote_requests: { customer_name: string; customer_address: string } | null;
    };
    const profile = confirmation.user_profiles as unknown as { first_name: string; last_name: string };

    const slotLabel = booking?.slot_type === 'morning' ? 'Förmiddag' : booking?.slot_type === 'afternoon' ? 'Eftermiddag' : 'Heldag';

    return NextResponse.json({
      status: confirmation.status,
      installer_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
      booking: {
        customer_name: booking?.quote_requests?.customer_name,
        customer_address: booking?.quote_requests?.customer_address,
        scheduled_date: booking?.scheduled_date,
        slot_type: slotLabel,
      },
    });
  } catch (err) {
    console.error('Confirm GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Accept or decline confirmation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'action must be accept or decline' }, { status: 400 });
    }

    // Find confirmation request
    const { data: confirmation, error } = await supabaseAdmin
      .from('booking_confirmation_requests')
      .select('id, booking_id, installer_id, status')
      .eq('token', token)
      .single();

    if (error || !confirmation) {
      return NextResponse.json({ error: 'Bekräftelse ej hittad' }, { status: 404 });
    }

    if (confirmation.status !== 'pending') {
      return NextResponse.json({ error: 'Redan besvarad' }, { status: 400 });
    }

    if (action === 'accept') {
      await handleInstallerAccept(confirmation.booking_id, confirmation.installer_id);
      return NextResponse.json({ success: true, message: 'Bokad och bekräftad!' });
    } else {
      const result = await handleInstallerDecline(confirmation.booking_id, confirmation.installer_id);
      return NextResponse.json({
        success: true,
        message: 'Avböjd',
        reassigned: result.reassigned,
      });
    }
  } catch (err) {
    console.error('Confirm POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
