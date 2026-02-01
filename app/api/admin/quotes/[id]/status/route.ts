import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/supabase-auth';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_STATUSES = ['pending', 'reviewed', 'sent', 'accepted', 'rejected', 'expired'];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const quoteId = parseInt(id);
    const body = await request.json();
    const { status, notes } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Ogiltig status. Tillåtna: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Get current quote
    const { data: quote, error: fetchError } = await supabaseAdmin
      .from('quote_requests')
      .select('status, status_history')
      .eq('id', quoteId)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json({ error: 'Offert ej hittad' }, { status: 404 });
    }

    // Build status history entry
    const historyEntry = {
      from_status: quote.status,
      to_status: status,
      changed_at: new Date().toISOString(),
      changed_by: 'admin',
      notes: notes || null,
    };

    // Get existing history or create new array
    const existingHistory = quote.status_history || [];
    const newHistory = [...existingHistory, historyEntry];

    // Update the quote
    const updateData: Record<string, unknown> = {
      status,
      status_history: newHistory,
    };

    // If setting to accepted, also set accepted_at
    if (status === 'accepted') {
      updateData.offer_accepted_at = new Date().toISOString();
    }

    // If setting to sent, also set sent_at
    if (status === 'sent') {
      updateData.offer_sent_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from('quote_requests')
      .update(updateData)
      .eq('id', quoteId);

    if (updateError) {
      console.error('Error updating quote status:', updateError);
      return NextResponse.json(
        { error: 'Kunde inte uppdatera status' },
        { status: 500 }
      );
    }

    console.log(`Quote ${quoteId} status changed: ${quote.status} -> ${status}`);

    return NextResponse.json({
      success: true,
      previous_status: quote.status,
      new_status: status,
      history: newHistory,
    });
  } catch (error) {
    console.error('Error changing quote status:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod' },
      { status: 500 }
    );
  }
}

// GET status history
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const quoteId = parseInt(id);

    const { data: quote, error } = await supabaseAdmin
      .from('quote_requests')
      .select('status, status_history, offer_sent_at, offer_accepted_at, offer_rejected_at, signed_at, signed_name, signed_ip')
      .eq('id', quoteId)
      .single();

    if (error || !quote) {
      return NextResponse.json({ error: 'Offert ej hittad' }, { status: 404 });
    }

    return NextResponse.json({
      current_status: quote.status,
      history: quote.status_history || [],
      timestamps: {
        sent_at: quote.offer_sent_at,
        accepted_at: quote.offer_accepted_at,
        rejected_at: quote.offer_rejected_at,
        signed_at: quote.signed_at,
      },
      signature: quote.signed_name ? {
        name: quote.signed_name,
        ip: quote.signed_ip,
        at: quote.signed_at,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching status history:', error);
    return NextResponse.json({ error: 'Ett fel uppstod' }, { status: 500 });
  }
}
