import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUT - Reorder terms
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { terms } = body;

    if (!Array.isArray(terms)) {
      return NextResponse.json({ error: 'Terms array is required' }, { status: 400 });
    }

    // Update each term's order_index
    for (const term of terms) {
      const { error } = await supabaseAdmin
        .from('terms_conditions')
        .update({ order_index: term.order_index })
        .eq('id', term.id);

      if (error) {
        console.error('Error reordering term:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Terms reorder error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
