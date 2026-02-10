import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get contract details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('installer_contracts')
      .select(`
        *,
        user_profiles (first_name, last_name, email, installer_type)
      `)
      .eq('id', parseInt(id))
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contract: data });
  } catch (err) {
    console.error('Contract GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT - Update contract
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, valid_from, valid_to, notes, draft_pdf_path, signed_pdf_path } = body;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) updateData.status = status;
    if (valid_from !== undefined) updateData.valid_from = valid_from;
    if (valid_to !== undefined) updateData.valid_to = valid_to;
    if (notes !== undefined) updateData.notes = notes;
    if (draft_pdf_path !== undefined) updateData.draft_pdf_path = draft_pdf_path;
    if (signed_pdf_path !== undefined) updateData.signed_pdf_path = signed_pdf_path;

    const { data, error } = await supabaseAdmin
      .from('installer_contracts')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contract: data });
  } catch (err) {
    console.error('Contract PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
