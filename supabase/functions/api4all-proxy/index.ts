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

    const token = await getToken();
    const url   = `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;

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
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
