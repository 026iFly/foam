import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUT - Batch update priority order
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { priorities } = body;

    if (!Array.isArray(priorities)) {
      return NextResponse.json(
        { error: 'priorities must be an array of { id, priority_order }' },
        { status: 400 }
      );
    }

    // Update each installer's priority
    const updates = priorities.map(
      (p: { id: string; priority_order: number }) =>
        supabaseAdmin
          .from('user_profiles')
          .update({ priority_order: p.priority_order })
          .eq('id', p.id)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Priority update error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
