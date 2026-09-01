import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { isAuthenticated } from '@/lib/supabase-auth';
import { buildAuthorizationUrl, isFortnoxConfigured } from '@/lib/fortnox';

// GET /api/fortnox/connect — start the OAuth flow (admin only)
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isFortnoxConfigured()) {
    return NextResponse.json(
      { error: 'Fortnox är inte konfigurerad. Sätt FORTNOX_CLIENT_ID och FORTNOX_CLIENT_SECRET.' },
      { status: 400 }
    );
  }

  const state = crypto.randomBytes(16).toString('hex');
  const res = NextResponse.redirect(buildAuthorizationUrl(state));
  res.cookies.set('fortnox_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return res;
}
