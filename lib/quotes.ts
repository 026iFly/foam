import { supabase } from './supabase';
import crypto from 'crypto';
import type {
  QuoteRequest,
  CreateQuoteRequestInput,
  UpdateQuoteRequestInput,
  QuoteListFilters,
  QuoteListResponse,
  QuoteStatus,
} from './types/quote';

// Generate a unique quote number
export async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { count, error } = await supabase
    .from('quote_requests')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`)
    .lt('created_at', `${year + 1}-01-01`);

  if (error) {
    console.error('Error counting quotes:', error);
    throw error;
  }

  const nextNumber = ((count || 0) + 1).toString().padStart(4, '0');
  return `OFF-${year}-${nextNumber}`;
}

// Create a new quote request
export async function createQuoteRequest(input: CreateQuoteRequestInput): Promise<number> {
  const { data, error } = await supabase
    .from('quote_requests')
    .insert({
      customer_name: input.customer_name,
      customer_email: input.customer_email,
      customer_phone: input.customer_phone || null,
      customer_address: input.customer_address,
      project_type: input.project_type || null,
      message: input.message || null,
      calculation_data: input.calculation_data,
      climate_zone: input.climate_zone || null,
      indoor_temp: input.indoor_temp || null,
      indoor_rh: input.indoor_rh || null,
      has_three_phase: input.has_three_phase || false,
      apply_rot_deduction: input.apply_rot_deduction || false,
      total_area: input.total_area || null,
      total_excl_vat: input.total_excl_vat ? Math.round(input.total_excl_vat) : null,
      total_incl_vat: input.total_incl_vat ? Math.round(input.total_incl_vat) : null,
      rot_deduction: input.rot_deduction ? Math.round(input.rot_deduction) : 0,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating quote:', error);
    throw error;
  }

  return data.id;
}

// Get a single quote request by ID
export async function getQuoteRequest(id: number): Promise<QuoteRequest | undefined> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return undefined;
    }
    console.error('Error fetching quote:', error);
    throw error;
  }

  // Convert PostgreSQL booleans and JSONB to expected format
  return data ? convertQuoteFromDb(data) : undefined;
}

// List quote requests with filtering and pagination
export async function listQuoteRequests(filters: QuoteListFilters = {}): Promise<QuoteListResponse> {
  const { status, search, limit = 50, offset = 0 } = filters;

  // Build the query
  let query = supabase
    .from('quote_requests')
    .select('*', { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error listing quotes:', error);
    throw error;
  }

  const quotes = (data || []).map(convertQuoteFromDb);

  return {
    quotes,
    total: count || 0,
    limit,
    offset,
  };
}

// Update a quote request
export async function updateQuoteRequest(id: number, input: UpdateQuoteRequestInput): Promise<boolean> {
  const updates: Record<string, unknown> = {};

  if (input.status !== undefined) updates.status = input.status;
  if (input.admin_notes !== undefined) updates.admin_notes = input.admin_notes;
  if (input.adjusted_data !== undefined) {
    updates.adjusted_data = typeof input.adjusted_data === 'string'
      ? JSON.parse(input.adjusted_data)
      : input.adjusted_data;
  }
  if (input.adjusted_total_excl_vat !== undefined) updates.adjusted_total_excl_vat = input.adjusted_total_excl_vat;
  if (input.adjusted_total_incl_vat !== undefined) updates.adjusted_total_incl_vat = input.adjusted_total_incl_vat;
  if (input.quote_number !== undefined) updates.quote_number = input.quote_number;
  if (input.quote_pdf_path !== undefined) updates.quote_pdf_path = input.quote_pdf_path;
  if (input.quote_valid_until !== undefined) updates.quote_valid_until = input.quote_valid_until;
  if (input.email_sent_at !== undefined) updates.email_sent_at = input.email_sent_at;
  if (input.rot_customer_info !== undefined) {
    updates.rot_customer_info = typeof input.rot_customer_info === 'string'
      ? JSON.parse(input.rot_customer_info)
      : input.rot_customer_info;
  }
  if (input.rot_info_token !== undefined) updates.rot_info_token = input.rot_info_token;

  if (Object.keys(updates).length === 0) {
    return false;
  }

  const { error } = await supabase
    .from('quote_requests')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating quote:', error);
    throw error;
  }

  return true;
}

// Delete a quote request
export async function deleteQuoteRequest(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('quote_requests')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting quote:', error);
    throw error;
  }

  return true;
}

// Get quote counts by status
export async function getQuoteCounts(): Promise<Record<QuoteStatus | 'all', number>> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('status');

  if (error) {
    console.error('Error getting quote counts:', error);
    throw error;
  }

  const counts: Record<QuoteStatus | 'all', number> = {
    all: data?.length || 0,
    pending: 0,
    reviewed: 0,
    quoted: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
  };

  for (const row of data || []) {
    const status = row.status as QuoteStatus;
    if (status in counts) {
      counts[status]++;
    }
  }

  return counts;
}

// Mark quote as reviewed
export async function markQuoteReviewed(id: number): Promise<boolean> {
  return updateQuoteRequest(id, { status: 'reviewed' });
}

// Generate quote number and mark as quoted
export async function markQuoteQuoted(id: number): Promise<string | null> {
  const quoteNumber = await generateQuoteNumber();
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30); // 30 days validity

  const success = await updateQuoteRequest(id, {
    status: 'quoted',
    quote_number: quoteNumber,
    quote_valid_until: validUntil.toISOString().split('T')[0],
  });

  return success ? quoteNumber : null;
}

// Mark quote as sent
export async function markQuoteSent(id: number): Promise<boolean> {
  return updateQuoteRequest(id, {
    status: 'sent',
    email_sent_at: new Date().toISOString(),
  });
}

// Generate a unique ROT info token
export async function generateRotInfoToken(id: number): Promise<string | null> {
  const token = crypto.randomBytes(32).toString('hex');

  const { error } = await supabase
    .from('quote_requests')
    .update({ rot_info_token: token })
    .eq('id', id);

  if (error) {
    console.error('Error generating ROT token:', error);
    return null;
  }

  return token;
}

// Get quote by ROT token
export async function getQuoteByRotToken(token: string): Promise<QuoteRequest | undefined> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('*')
    .eq('rot_info_token', token)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return undefined;
    }
    console.error('Error fetching quote by ROT token:', error);
    throw error;
  }

  return data ? convertQuoteFromDb(data) : undefined;
}

// Save ROT customer info
export async function saveRotCustomerInfo(id: number, rotInfo: string): Promise<boolean> {
  const { error } = await supabase
    .from('quote_requests')
    .update({ rot_customer_info: JSON.parse(rotInfo) })
    .eq('id', id);

  if (error) {
    console.error('Error saving ROT info:', error);
    return false;
  }

  return true;
}

// Helper function to convert database row to QuoteRequest type
function convertQuoteFromDb(row: Record<string, unknown>): QuoteRequest {
  return {
    ...row,
    // Convert JSONB fields to strings for backward compatibility
    calculation_data: typeof row.calculation_data === 'string'
      ? row.calculation_data
      : JSON.stringify(row.calculation_data),
    adjusted_data: row.adjusted_data
      ? (typeof row.adjusted_data === 'string'
        ? row.adjusted_data
        : JSON.stringify(row.adjusted_data))
      : null,
    rot_customer_info: row.rot_customer_info
      ? (typeof row.rot_customer_info === 'string'
        ? row.rot_customer_info
        : JSON.stringify(row.rot_customer_info))
      : null,
    // Convert boolean fields
    has_three_phase: row.has_three_phase ? 1 : 0,
    apply_rot_deduction: row.apply_rot_deduction ? 1 : 0,
  } as QuoteRequest;
}
