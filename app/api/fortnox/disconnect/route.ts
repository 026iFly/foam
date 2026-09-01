import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/supabase-auth';
import { disconnectFortnox } from '@/lib/fortnox';

// POST /api/fortnox/disconnect — remove stored tokens (admin only)
export async function POST() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await disconnectFortnox();
  return NextResponse.json({ success: true });
}
