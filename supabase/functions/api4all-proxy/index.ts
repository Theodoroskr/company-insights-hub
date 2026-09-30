// ============================================================
// Edge Function: api4all-proxy
// Securely proxies requests to v3.api4all.io using server-side
// credentials. Handles token creation and refresh automatically.
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const API_BASE = 'https://v3.api4all.io/a4a/3.0/api';
const CLIENT_ID = Deno.env.get('API4ALL_CLIENT_ID') ?? 'F25Y0RU2M5';
const USERNAME  = Deno.env.get('API4ALL_USERNAME')  ?? '';
const PASSWORD  = Deno.env.get('API4ALL_PASSWORD')  ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Token cache (in-memory per isolate) ──────────────────────
let cachedToken: string | null = null;
let tokenExpiry = 0;
let cachedRefresh: string | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  // Try refresh first if we have a refresh token
  if (cachedRefresh) {
    try {
      const res = await fetch(`${API_BASE}/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refresh_token: cachedRefresh,
          client_id: CLIENT_ID,
          client_secret: '',
        }),
      });
      if (res.ok) {
        const json = await res.json();
        cachedToken  = json.access_token;
        cachedRefresh = json.refresh_token ?? cachedRefresh;
        tokenExpiry  = Date.now() + (json.expires_in ?? 3600) * 1000 - 60_000;
        return cachedToken!;
      }
    } catch (_) { /* fall through to full auth */ }
  }

  // Full authentication using Basic auth
  const credentials = btoa(`${USERNAME}:${PASSWORD}`);
  const res = await fetch(`${API_BASE}/token/${CLIENT_ID}`, {
    method: 'GET',
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API4ALL auth failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  cachedToken   = json.access_token;
  cachedRefresh = json.refresh_token ?? null;
  tokenExpiry   = Date.now() + (json.expires_in ?? 3600) * 1000 - 60_000;
  return cachedToken!;
}

// ── Main handler ─────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { path, method = 'GET', body = null } = await req.json();

    if (!path || typeof path !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing path' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Public browser callers may only run read-only lookups (report
    // availability dates, search). Everything else is backend-only.
    const norm = path.startsWith('/') ? path : '/' + path;
    const bearerTok = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const isService = bearerTok && bearerTok === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const PUBLIC_READ = /^\/(reports\/dates\/[A-Za-z0-9%._-]{1,64}|search\/[a-z]{2}\/(name|vat_no|reg_no)\/[^/?#]{1,200})$/;
    if (!isService && (String(method).toUpperCase() !== 'GET' || body || !PUBLIC_READ.test(norm) || norm.includes('..'))) {
      return new Response(JSON.stringify({ error: 'Request not allowed' }), {
        status: 403,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const token = await getToken();
    const url   = `${API_BASE}${norm}`;

    const upstream = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Expires: '0',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseBody = await upstream.text();

    return new Response(responseBody, {
      status: upstream.status,
      headers: {
        ...CORS,
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('api4all-proxy error:', message);
    return new Response(JSON.stringify({ error: 'Upstream request failed' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
