import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAuthenticated } from '@/lib/supabase-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch recent notification logs
export async function GET(request: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabaseAdmin
      .from('notification_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (channel) query = query.eq('channel', channel);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get system status
    const emailConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    const discordConfigured = !!process.env.DISCORD_WEBHOOK_URL;

    return NextResponse.json({
      logs: data || [],
      status: {
        email_configured: emailConfigured,
        discord_configured: discordConfigured,
      },
    });
  } catch (err) {
    console.error('Diagnostics GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
