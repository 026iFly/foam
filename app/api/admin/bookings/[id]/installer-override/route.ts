import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleInstallerAccept, handleInstallerDecline } from '@/lib/auto-assign';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/bookings/:id/installer-override
 *
 * Admin manually overrides an installer's confirmation status.
 * Requires authenticated admin session.
 *
 * Body: { installerId: string, action: "accept" | "decline" }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingId = parseInt(id, 10);

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    const body = await request.json();
    const { installerId, action } = body;

    if (!installerId) {
      return NextResponse.json({ error: 'installerId is required' }, { status: 400 });
    }
    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "accept" or "decline"' },
        { status: 400 }
      );
    }

    // Verify booking exists
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, status')
      .eq('id', bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify installer is assigned
    const { data: assignment } = await supabaseAdmin
      .from('booking_installers')
      .select('installer_id, status')
      .eq('booking_id', bookingId)
      .eq('installer_id', installerId)
      .single();

    if (!assignment) {
      return NextResponse.json(
        { error: 'Installer not assigned to this booking' },
        { status: 404 }
      );
    }

    // Force the status (admin override bypasses the pending check)
    if (action === 'accept') {
      await handleInstallerAccept(bookingId, installerId);
    } else {
      await handleInstallerDecline(bookingId, installerId);
    }

    // Mark all confirmation requests for this installer as responded (admin override)
    await supabaseAdmin
      .from('booking_confirmation_requests')
      .update({
        status: action === 'accept' ? 'accepted' : 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('booking_id', bookingId)
      .eq('installer_id', installerId)
      .eq('status', 'pending');

    return NextResponse.json({
      success: true,
      overriddenFrom: assignment.status,
      overriddenTo: action === 'accept' ? 'accepted' : 'declined',
    });
  } catch (err) {
    console.error('Admin installer override error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
