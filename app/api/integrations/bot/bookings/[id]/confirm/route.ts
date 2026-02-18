import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleInstallerAccept, handleInstallerDecline } from '@/lib/auto-assign';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifyApiKey(request: NextRequest): boolean {
  const apiKey =
    request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = process.env.N8N_API_KEY;
  if (!expectedKey) return true;
  return apiKey === expectedKey;
}

/** Derive aggregate installer confirmation status for a booking */
async function getBookingWithInstallerStatus(bookingId: number) {
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select(`
      id, status, scheduled_date, scheduled_time, slot_type,
      booking_installers (
        installer_id, is_lead, status, responded_at,
        user_profiles (first_name, last_name, email)
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
    user_profiles: { first_name: string; last_name: string; email: string } | null;
  };
  const installers = (
    (booking.booking_installers as unknown as BookingInstaller[]) || []
  ).map((bi) => ({
    installerId: bi.installer_id,
    installerName:
      `${bi.user_profiles?.first_name || ''} ${bi.user_profiles?.last_name || ''}`.trim() ||
      bi.user_profiles?.email ||
      'Okänd',
    status: bi.status,
    respondedAt: bi.responded_at,
    isLead: bi.is_lead,
  }));

  // Compute aggregate status:
  // accepted = all non-declined have accepted (or booking is confirmed)
  // rejected  = some declined, none pending or accepted to fill slots
  // pending   = any installer still pending
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

  const quote = booking.quote_requests as unknown as
    | { customer_name: string; customer_address: string }
    | null;

  return {
    id: booking.id,
    status: booking.status,
    installerStatus,
    scheduledDate: booking.scheduled_date,
    scheduledTime: booking.scheduled_time,
    slotType: booking.slot_type,
    customerName: quote?.customer_name || null,
    installers,
  };
}

/**
 * POST /api/integrations/bot/bookings/:id/confirm
 *
 * OpenClaw integration contract — installer accept/reject with full idempotency.
 *
 * Request body:
 *   action        "accept" | "reject"   (required)
 *   installerId   UUID                  (required)
 *   installerName string                (optional, for audit)
 *   source        "openclaw"|"discord"|"email"|"in_app"  (optional)
 *   messageId     string                (optional, for audit)
 *   respondedAt   ISO-8601              (optional, defaults to now)
 *
 * Response 200:
 *   { success, alreadyResponded, booking: { id, status, installerStatus, installers: [...] } }
 *
 * Error codes:
 *   400 INVALID_ACTION | MISSING_INSTALLER_ID
 *   401 Unauthorized
 *   404 BOOKING_NOT_FOUND | INSTALLER_NOT_ASSIGNED
 *   409 ALREADY_RESPONDED_DIFFERENTLY
 *   500 Server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const bookingId = parseInt(id);
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { error: 'Invalid booking ID', code: 'INVALID_BOOKING_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, installerId, source, messageId, respondedAt } = body;

    if (!action || !['accept', 'reject', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "accept" or "reject"', code: 'INVALID_ACTION' },
        { status: 400 }
      );
    }
    if (!installerId) {
      return NextResponse.json(
        { error: 'installerId is required', code: 'MISSING_INSTALLER_ID' },
        { status: 400 }
      );
    }

    // Normalise: both "reject" and "decline" mean decline
    const normalizedAction: 'accept' | 'decline' =
      action === 'accept' ? 'accept' : 'decline';

    // Verify booking exists
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, status')
      .eq('id', bookingId)
      .single();

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found', code: 'BOOKING_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify installer is assigned to this booking
    const { data: assignment } = await supabaseAdmin
      .from('booking_installers')
      .select('installer_id, status, responded_at, is_lead')
      .eq('booking_id', bookingId)
      .eq('installer_id', installerId)
      .single();

    if (!assignment) {
      return NextResponse.json(
        {
          error: 'Installer not assigned to this booking',
          code: 'INSTALLER_NOT_ASSIGNED',
        },
        { status: 404 }
      );
    }

    // --- Idempotency ---
    if (assignment.status !== 'pending') {
      const alreadyAction = assignment.status === 'accepted' ? 'accept' : 'decline';

      if (alreadyAction === normalizedAction) {
        // Same answer — return current state, no DB writes
        const bookingData = await getBookingWithInstallerStatus(bookingId);
        return NextResponse.json({
          success: true,
          alreadyResponded: true,
          booking: bookingData,
        });
      } else {
        // Conflicting answer — 409
        return NextResponse.json(
          {
            error: `Already responded with "${assignment.status}" — cannot change to "${normalizedAction}"`,
            code: 'ALREADY_RESPONDED_DIFFERENTLY',
            currentStatus: assignment.status,
            currentRespondedAt: assignment.responded_at,
          },
          { status: 409 }
        );
      }
    }

    // --- Audit: update the matching confirmation_request with channel/source/messageId ---
    if (source || messageId) {
      const channelMap: Record<string, string> = {
        openclaw: 'discord',
        discord: 'discord',
        email: 'email',
        in_app: 'in_app',
      };
      const channel = channelMap[source || 'openclaw'] || 'discord';
      await supabaseAdmin
        .from('booking_confirmation_requests')
        .update({ responded_at: respondedAt || new Date().toISOString() })
        .eq('booking_id', bookingId)
        .eq('installer_id', installerId)
        .eq('channel', channel)
        .eq('status', 'pending');
    }

    // --- Execute ---
    if (normalizedAction === 'accept') {
      await handleInstallerAccept(bookingId, installerId);
    } else {
      await handleInstallerDecline(bookingId, installerId);
    }

    const bookingData = await getBookingWithInstallerStatus(bookingId);

    return NextResponse.json({
      success: true,
      alreadyResponded: false,
      booking: bookingData,
    });
  } catch (err) {
    console.error('Bot booking confirm error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
