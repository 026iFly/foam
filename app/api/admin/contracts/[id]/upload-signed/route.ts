import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Upload signed contract PDF
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contractId = parseInt(id);

    // Get contract to find installer_id
    const { data: contract, error: fetchError } = await supabaseAdmin
      .from('installer_contracts')
      .select('installer_id')
      .eq('id', contractId)
      .single();

    if (fetchError || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = `${contract.installer_id}/signed/${contractId}-${Date.now()}.pdf`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('installer-contracts')
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Update contract record
    const { error: updateError } = await supabaseAdmin
      .from('installer_contracts')
      .update({
        signed_pdf_path: filePath,
        status: 'signed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, path: filePath });
  } catch (err) {
    console.error('Upload signed contract error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
