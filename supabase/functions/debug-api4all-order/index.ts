// Debug helper: submits a minimal API4ALL order payload and returns the raw
// upstream response (status, headers, body) so we can diagnose HTML/PHP errors
// coming back from API4ALL without going through the full checkout flow.
//
// Usage (POST):
//   {
//     "icg_code": "CY-HE12345",            // required: company code in API4ALL
//     "product": "GR_BASIC_REPORT",        // required: API4ALL product code
//     "speed": "Normal" | "Urgent",        // optional, default Normal
//     "fresh_investigation": 0 | 1,        // optional, default 0
//     "reference": "debug-<timestamp>"     // optional, order reference
//   }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API4ALL_BASE = 'https://v3.api4all.io/a4a/3.0/api';

async function getApi4AllToken(): Promise<string> {
  const username = Deno.env.get('API4ALL_USERNAME');
  const password = Deno.env.get('API4ALL_PASSWORD');
  const projectCode = Deno.env.get('API4ALL_PROJECT_CODE') || 'F25Y0RU2M5';

  if (!username || !password) {
    throw new Error('API4ALL credentials not configured');
  }

  const credentials = btoa(`${username}:${password}`);
  const tokenRes = await fetch(`${API4ALL_BASE}/token/${projectCode}`, {
    method: 'GET',
    headers: { Authorization: `Basic ${credentials}` },
  });

  const tokenText = await tokenRes.text();
  if (!tokenRes.ok) {
    throw new Error(`API4All auth failed: ${tokenRes.status} - ${tokenText.slice(0, 300)}`);
  }
  const tokenData = JSON.parse(tokenText);
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      icg_code,
      product,
      speed = 'Normal',
      fresh_investigation = 0,
      reference = `debug-${Date.now()}`,
    } = body ?? {};

    if (!icg_code || !product) {
      return new Response(
        JSON.stringify({ error: 'icg_code and product are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = await getApi4AllToken();

    const orderPayload = {
      reference,
      items: [
        {
          code: icg_code,
          reference: `debug-item-${Date.now()}`,
          language: 'EN',
          product,
          format: 'JSON',
          speed: speed === 'Urgent' ? 'Urgent' : 'Normal',
          freshinvestigation: fresh_investigation ? 1 : 0,
          comments: '',
        },
      ],
    };

    const upstream = await fetch(`${API4ALL_BASE}/orders/create/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Expires': '0',
      },
      body: JSON.stringify(orderPayload),
    });

    const rawBody = await upstream.text();
    const responseHeaders: Record<string, string> = {};
    upstream.headers.forEach((v, k) => { responseHeaders[k] = v; });

    let parsed: unknown = null;
    let parseError: string | null = null;
    try {
      parsed = JSON.parse(rawBody);
    } catch (e) {
      parseError = e instanceof Error ? e.message : String(e);
    }

    return new Response(
      JSON.stringify({
        sent: {
          url: `${API4ALL_BASE}/orders/create/`,
          payload: orderPayload,
        },
        upstream: {
          status: upstream.status,
          statusText: upstream.statusText,
          headers: responseHeaders,
          contentType: responseHeaders['content-type'] ?? null,
          bodyLength: rawBody.length,
          rawBody, // full body so we can see HTML/PHP errors
          parsed,
          parseError,
        },
      }, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('debug-api4all-order error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
