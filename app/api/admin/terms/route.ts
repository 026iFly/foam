import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all terms
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('terms_conditions')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching terms:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ terms: data || [] });
  } catch (err) {
    console.error('Terms GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Create new term
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Get the highest order_index
    const { data: maxData } = await supabaseAdmin
      .from('terms_conditions')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1);

    const nextIndex = (maxData?.[0]?.order_index || 0) + 1;

    const { data, error } = await supabaseAdmin
      .from('terms_conditions')
      .insert({
        text: text.trim(),
        order_index: nextIndex,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating term:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ term: data });
  } catch (err) {
    console.error('Terms POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
