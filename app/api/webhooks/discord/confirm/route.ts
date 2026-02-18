import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleInstallerAccept, handleInstallerDecline } from '@/lib/auto-assign';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Same helper as the bot confirm endpoint — derive aggregate installer status */
async function getBookingWithInstallerStatus(bookingId: number) {
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select(`
      id, status, scheduled_date, scheduled_time, slot_type,
      booking_installers (
        installer_id, is_lead, status, responded_at,
        user_profiles (first_name, last_name)
      ),
      quote_requests (customer_name, customer_address)
    `)
    .eq('id', bookingId)
    .single();

  if (!booking) return null;

  type BookingInstaller = {
    installer_id: string;
    is_lead: boolean;
    status: string;
    responded_at: string | null;
    user_profiles: { first_name: string; last_name: string } | null;
  };
  const installers = (
    (booking.booking_installers as unknown as BookingInstaller[]) || []
  ).map((bi) => ({
    installerId: bi.installer_id,
    installerName:
      `${bi.user_profiles?.first_name || ''} ${bi.user_profiles?.last_name || ''}`.trim() ||
      'Okänd',
    status: bi.status,
    respondedAt: bi.responded_at,
    isLead: bi.is_lead,
  }));

  const active = installers.filter((i) => i.status !== 'declined');
  const hasPending = active.some((i) => i.status === 'pending');
  const hasDeclined = installers.some((i) => i.status === 'declined');

  let installerStatus: 'pending' | 'accepted' | 'rejected';
  if (booking.status === 'confirmed' || (active.length > 0 && !hasPending)) {
    installerStatus = 'accepted';
  } else if (hasDeclined && active.length === 0) {
    installerStatus = 'rejected';
  } else {
    installerStatus = 'pending';
  }

  return {
    id: booking.id,
    status: booking.status,
    installerStatus,
    installers,
  };
}

/**
 * POST /api/webhooks/discord/confirm
 *
 * Called by Discord bot / OpenClaw when installer reacts in Discord channel.
 *
 * Body: { installer_email, booking_id, action: "accept" | "decline" }
 * Response: { success, alreadyResponded, booking: { id, status, installerStatus, installers } }
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.N8N_API_KEY && apiKey !== 'intellifoam_n8n_2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { installer_email, booking_id, action } = body;

    if (!installer_email || !booking_id || !action) {
      return NextResponse.json(
        { error: 'installer_email, booking_id, and action required' },
        { status: 400 }
      );
    }
    if (!['accept', 'decline', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be accept or decline' },
        { status: 400 }
      );
    }

    const normalizedAction: 'accept' | 'decline' =
      action === 'accept' ? 'accept' : 'decline';

    // Find installer by email
    const { data: installer } = await supabaseAdmin
      .from('user_profiles')
      .select('id, first_name, last_name')
      .eq('email', installer_email)
      .single();

    if (!installer) {
      return NextResponse.json(
        { error: 'Installer not found', code: 'INSTALLER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check assignment and idempotency
    const { data: assignment } = await supabaseAdmin
      .from('booking_installers')
      .select('status, responded_at')
      .eq('booking_id', booking_id)
      .eq('installer_id', installer.id)
      .single();

    if (!assignment) {
      return NextResponse.json(
        { error: 'Installer not assigned to this booking', code: 'INSTALLER_NOT_ASSIGNED' },
        { status: 404 }
      );
    }

    if (assignment.status !== 'pending') {
      const alreadyAction = assignment.status === 'accepted' ? 'accept' : 'decline';
      const bookingData = await getBookingWithInstallerStatus(booking_id);

      if (alreadyAction === normalizedAction) {
        return NextResponse.json({
          success: true,
          alreadyResponded: true,
          message: action === 'accept' ? 'Redan bekräftad' : 'Redan avböjd',
          booking: bookingData,
        });
      }
      return NextResponse.json(
        {
          error: `Already responded with "${assignment.status}"`,
          code: 'ALREADY_RESPONDED_DIFFERENTLY',
          currentStatus: assignment.status,
        },
        { status: 409 }
      );
    }

    // Execute
    if (normalizedAction === 'accept') {
      await handleInstallerAccept(booking_id, installer.id);
    } else {
      await handleInstallerDecline(booking_id, installer.id);
    }

    // Mark the discord confirmation request as responded
    await supabaseAdmin
      .from('booking_confirmation_requests')
      .update({
        status: normalizedAction === 'accept' ? 'accepted' : 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('booking_id', booking_id)
      .eq('installer_id', installer.id)
      .eq('channel', 'discord')
      .eq('status', 'pending');

    const bookingData = await getBookingWithInstallerStatus(booking_id);

    return NextResponse.json({
      success: true,
      alreadyResponded: false,
      message: normalizedAction === 'accept' ? 'Bokning accepterad' : 'Bokning avböjd',
      booking: bookingData,
    });
  } catch (err) {
    console.error('Discord confirm webhook error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
