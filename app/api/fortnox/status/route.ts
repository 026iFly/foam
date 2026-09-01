import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/supabase-auth';
import { isFortnoxConfigured, isFortnoxConnected, getFortnoxCompanyName } from '@/lib/fortnox';

// GET /api/fortnox/status — connection status for the admin settings UI
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const configured = isFortnoxConfigured();
  const connected = configured && (await isFortnoxConnected());
  let company: string | null = null;
  if (connected) {
    company = await getFortnoxCompanyName();
  }
  return NextResponse.json({ configured, connected, company });
}
