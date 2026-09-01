import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, readOAuthState } from '@/lib/fortnox';

// GET /api/fortnox/callback — Fortnox redirects here after the admin approves.
// CSRF is enforced via the state value (stored server-side, with a cookie
// fallback). On failure we pass a short reason so the admin page can show it.
export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.intellifoam.se';
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const fortnoxError = searchParams.get('error');
  const cookieState = request.cookies.get('fortnox_oauth_state')?.value;

  const fail = (reason: string) =>
    NextResponse.redirect(`${base}/admin/settings?fortnox=error&reason=${encodeURIComponent(reason)}`);

  if (fortnoxError) {
    return fail(`fortnox:${fortnoxError}`);
  }
  if (!code) {
    return fail('no_code');
  }

  const storedState = await readOAuthState();
  const stateOk = !!state && (state === cookieState || state === storedState);
  if (!stateOk) {
    return fail('state_mismatch');
  }

  try {
    await exchangeCodeForTokens(code);
    const res = NextResponse.redirect(`${base}/admin/settings?fortnox=connected`);
    res.cookies.delete('fortnox_oauth_state');
    return res;
  } catch (err) {
    console.error('Fortnox callback error:', err);
    const msg = err instanceof Error ? err.message : 'exchange_failed';
    return fail(`exchange:${msg.slice(0, 140)}`);
  }
}
