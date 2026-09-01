/**
 * Fortnox integration (OAuth2 + REST client).
 *
 * Invoices are issued from the connected Fortnox company (Intelliray AB).
 * The app creates DRAFT invoices; a human reviews and sends them in Fortnox,
 * which owns the invoice numbering and files ROT to Skatteverket.
 *
 * Setup (one-time): register an integration in the Fortnox Developer portal,
 * set the redirect URI to <site>/api/fortnox/callback, put the credentials in
 * FORTNOX_CLIENT_ID / FORTNOX_CLIENT_SECRET, then click "Anslut Fortnox" in
 * admin settings and approve access for the Intelliray AB company.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const AUTH_URL = 'https://apps.fortnox.se/oauth-v1/auth';
const TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';
const API_BASE = 'https://api.fortnox.se/3';
// Scopes: invoices (write), customers (upsert), company info (for verification)
export const FORTNOX_SCOPES = 'invoice customer companyinformation';

const TOKEN_SETTINGS_KEY = 'fortnox_oauth';

export function getFortnoxConfig() {
  const clientId = process.env.FORTNOX_CLIENT_ID;
  const clientSecret = process.env.FORTNOX_CLIENT_SECRET;
  const redirectUri =
    process.env.FORTNOX_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.intellifoam.se'}/api/fortnox/callback`;
  return { clientId, clientSecret, redirectUri };
}

export function isFortnoxConfigured(): boolean {
  const { clientId, clientSecret } = getFortnoxConfig();
  return !!(clientId && clientSecret);
}

interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
}

async function readTokens(): Promise<StoredTokens | null> {
  const { data } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', TOKEN_SETTINGS_KEY)
    .single();
  if (!data?.value) return null;
  const v = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
  if (!v?.refresh_token) return null;
  return v as StoredTokens;
}

async function writeTokens(tokens: StoredTokens): Promise<void> {
  await supabaseAdmin
    .from('system_settings')
    .upsert({ key: TOKEN_SETTINGS_KEY, value: tokens }, { onConflict: 'key' });
}

export async function isFortnoxConnected(): Promise<boolean> {
  return (await readTokens()) !== null;
}

export async function disconnectFortnox(): Promise<void> {
  await supabaseAdmin.from('system_settings').delete().eq('key', TOKEN_SETTINGS_KEY);
}

/** Build the Fortnox authorization URL to redirect the admin to. */
export function buildAuthorizationUrl(state: string): string {
  const { clientId, redirectUri } = getFortnoxConfig();
  const params = new URLSearchParams({
    client_id: clientId || '',
    redirect_uri: redirectUri,
    scope: FORTNOX_SCOPES,
    state,
    access_type: 'offline',
    response_type: 'code',
    account_type: 'service',
  });
  return `${AUTH_URL}?${params.toString()}`;
}

function basicAuthHeader(): string {
  const { clientId, clientSecret } = getFortnoxConfig();
  return 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

/** Exchange the authorization code for tokens and persist them. */
export async function exchangeCodeForTokens(code: string): Promise<void> {
  const { redirectUri } = getFortnoxConfig();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    throw new Error(`Fortnox token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  await writeTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
  });
}

/** Refresh the access token using the stored refresh token (which rotates). */
async function refreshAccessToken(refreshToken: string): Promise<StoredTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Fortnox token refresh failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const tokens: StoredTokens = {
    access_token: data.access_token,
    // Fortnox rotates the refresh token on every use; fall back to the old one
    // only if the response omits it.
    refresh_token: data.refresh_token || refreshToken,
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  await writeTokens(tokens);
  return tokens;
}

async function getValidAccessToken(): Promise<string> {
  const tokens = await readTokens();
  if (!tokens) throw new Error('Fortnox is not connected');
  // Refresh a minute before expiry for safety
  if (Date.now() >= tokens.expires_at - 60_000) {
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    return refreshed.access_token;
  }
  return tokens.access_token;
}

/** Authorized Fortnox API call. Returns parsed JSON; throws on error. */
export async function fortnoxFetch(
  path: string,
  init: RequestInit = {}
): Promise<unknown> {
  const accessToken = await getValidAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = body?.ErrorInformation?.message || text || res.statusText;
    throw new Error(`Fortnox API ${path} failed: ${res.status} ${msg}`);
  }
  return body;
}

/** Fetch the connected company name (used to confirm the right Fortnox account). */
export async function getFortnoxCompanyName(): Promise<string | null> {
  try {
    const data = (await fortnoxFetch('/companyinformation')) as {
      CompanyInformation?: { CompanyName?: string };
    };
    return data?.CompanyInformation?.CompanyName || null;
  } catch {
    return null;
  }
}
