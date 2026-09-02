import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/supabase-auth';
import { supabase } from '@/lib/supabase';
import { isFortnoxConnected } from '@/lib/fortnox';
import { createInstallationInvoiceDraft } from '@/lib/fortnox-invoice';

// POST /api/admin/quotes/[id]/create-fortnox-invoice
// Creates a Fortnox project + draft invoice for the quote (admin only).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const quoteId = parseInt(id);

  if (!(await isFortnoxConnected())) {
    return NextResponse.json({ error: 'Fortnox är inte anslutet.' }, { status: 400 });
  }

  // Dedupe + ensure the fortnox_ref column exists (migration guard) BEFORE any
  // write to Fortnox, so we never create an orphaned invoice we can't record.
  const { data: existing, error: colError } = await supabase
    .from('quote_requests')
    .select('fortnox_ref')
    .eq('id', quoteId)
    .single();

  if (colError) {
    return NextResponse.json(
      { error: 'Databasen saknar kolumnen fortnox_ref. Kör migreringen add-quote-fortnox-ref.sql först.' },
      { status: 400 }
    );
  }
  if (existing?.fortnox_ref?.documentNumber) {
    return NextResponse.json({ success: true, alreadyExists: true, ref: existing.fortnox_ref });
  }

  try {
    const result = await createInstallationInvoiceDraft(quoteId);
    const ref = { ...result, createdAt: new Date().toISOString() };
    await supabase.from('quote_requests').update({ fortnox_ref: ref }).eq('id', quoteId);
    return NextResponse.json({ success: true, ref });
  } catch (err) {
    console.error('Create Fortnox invoice error:', err);
    const msg = err instanceof Error ? err.message : 'Okänt fel';
    return NextResponse.json({ error: `Kunde inte skapa faktura: ${msg}` }, { status: 500 });
  }
}
