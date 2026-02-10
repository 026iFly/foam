import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleInstallerAccept, handleInstallerDecline } from '@/lib/auto-assign';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Discord bot sends confirmation via webhook
// Expected body: { installer_email, booking_id, action: 'accept' | 'decline' }
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

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'action must be accept or decline' }, { status: 400 });
    }

    // Find installer by email
    const { data: installer } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('email', installer_email)
      .single();

    if (!installer) {
      return NextResponse.json({ error: 'Installer not found' }, { status: 404 });
    }

    if (action === 'accept') {
      await handleInstallerAccept(booking_id, installer.id);
    } else {
      await handleInstallerDecline(booking_id, installer.id);
    }

    // Update discord channel confirmation request
    await supabaseAdmin
      .from('booking_confirmation_requests')
      .update({
        status: action === 'accept' ? 'accepted' : 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('booking_id', booking_id)
      .eq('installer_id', installer.id)
      .eq('channel', 'discord')
      .eq('status', 'pending');

    return NextResponse.json({
      success: true,
      message: action === 'accept' ? 'Bokning accepterad' : 'Bokning avböjd',
    });
  } catch (err) {
    console.error('Discord confirm webhook error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
