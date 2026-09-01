import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/fortnox';

// GET /api/fortnox/callback — Fortnox redirects here after the admin approves.
// CSRF is enforced via the state cookie set in /api/fortnox/connect.
export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.intellifoam.se';
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const cookieState = request.cookies.get('fortnox_oauth_state')?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(`${base}/admin/settings?fortnox=error`);
  }

  try {
    await exchangeCodeForTokens(code);
    const res = NextResponse.redirect(`${base}/admin/settings?fortnox=connected`);
    res.cookies.delete('fortnox_oauth_state');
    return res;
  } catch (err) {
    console.error('Fortnox callback error:', err);
    return NextResponse.redirect(`${base}/admin/settings?fortnox=error`);
  }
}
