import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/supabase-auth';
import { handleInstallerAccept, handleInstallerDecline } from '@/lib/auto-assign';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Installer accepts or declines a booking from the dashboard
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { booking_id, action } = body;

    if (!booking_id || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'booking_id and action (accept/decline) required' }, { status: 400 });
    }

    // Verify there's a pending confirmation request for this installer
    const { data: confirmRequest } = await supabaseAdmin
      .from('booking_confirmation_requests')
      .select('id')
      .eq('booking_id', booking_id)
      .eq('installer_id', user.id)
      .eq('channel', 'in_app')
      .eq('status', 'pending')
      .single();

    if (!confirmRequest) {
      return NextResponse.json({ error: 'Ingen väntande bekräftelse hittad' }, { status: 404 });
    }

    if (action === 'accept') {
      await handleInstallerAccept(booking_id, user.id);
      return NextResponse.json({ success: true, message: 'Bokning accepterad' });
    } else {
      const result = await handleInstallerDecline(booking_id, user.id);
      return NextResponse.json({
        success: true,
        message: 'Bokning avböjd',
        reassigned: result.reassigned,
      });
    }
  } catch (err) {
    console.error('Installer confirm POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
