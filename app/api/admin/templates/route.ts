import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all templates
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('message_templates')
      .select('*')
      .order('type', { ascending: true });

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ templates: data || [] });
  } catch (err) {
    console.error('Templates GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Create new template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, name, subject, body: templateBody, is_default } = body;

    if (!type || !name || !subject || !templateBody) {
      return NextResponse.json(
        { error: 'type, name, subject, and body are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('message_templates')
      .insert({
        type,
        name,
        subject,
        body: templateBody,
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ template: data });
  } catch (err) {
    console.error('Templates POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
