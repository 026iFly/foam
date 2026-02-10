import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Download contract PDF (draft or signed)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'draft'; // 'draft' or 'signed'

    const { data: contract, error } = await supabaseAdmin
      .from('installer_contracts')
      .select('draft_pdf_path, signed_pdf_path')
      .eq('id', parseInt(id))
      .single();

    if (error || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    const path = type === 'signed' ? contract.signed_pdf_path : contract.draft_pdf_path;

    if (!path) {
      return NextResponse.json({ error: `No ${type} PDF available` }, { status: 404 });
    }

    // Download from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from('installer-contracts')
      .download(path);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="contract-${id}-${type}.pdf"`,
      },
    });
  } catch (err) {
    console.error('Download contract error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
