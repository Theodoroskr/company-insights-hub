// ============================================================
// Edge Function: search-companies
// Searches API4All for companies, caches results in Supabase.
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const API_BASE = 'https://v3.api4all.io/a4a/3.0/api';

// ── Supabase admin client (service role) ─────────────────────
function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
}

// ── Token management ─────────────────────────────────────────
async function getApiToken(sb: ReturnType<typeof getSupabase>): Promise<string> {
  const projectCode = Deno.env.get('API4ALL_PROJECT_CODE') ?? '';
  const username = Deno.env.get('API4ALL_USERNAME') ?? '';
  const password = Deno.env.get('API4ALL_PASSWORD') ?? '';

  // Check cached token
  const { data: tokenRow } = await sb
    .from('api4all_tokens')
    .select('access_token')
    .gt('expires_at', new Date(Date.now() + 5 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (tokenRow?.access_token) return tokenRow.access_token;

  // GET /token/{project_code} with Basic Auth (username:password)
  const credentials = btoa(`${username}:${password}`);
  const res = await fetch(`${API_BASE}/token/${encodeURIComponent(projectCode)}`, {
    method: 'GET',
    headers: { Authorization: `Basic ${credentials}`, Accept: 'application/json' },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API4All auth failed (${res.status}): ${txt}`);
  }

  const json = await res.json();
  const token: string = json.access_token;
  const expiresIn: number = json.expires_in ?? 3600;

  await sb.from('api4all_tokens').insert({
    access_token: token,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    project_code: projectCode,
  });

  return token;
}

// ── Slug generation ───────────────────────────────────────────
function generateSlug(name: string, regNo: string | null): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = regNo
    ? '-' + regNo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    : '';
  return base + suffix;
}

// ── Detect search type ────────────────────────────────────────
function isRegNoSearch(q: string): boolean {
  // Matches patterns like C1234, HE1234, BN123456, etc.
  return /^[A-Z]{1,4}\d+$/.test(q.trim().toUpperCase());
}

// ── Companies House UK search ─────────────────────────────────
const CH_BASE = 'https://api.company-information.service.gov.uk';

function chAuthHeader(): string {
  const key = Deno.env.get('COMPANIES_HOUSE_UK_API_KEY') ?? '';
  return 'Basic ' + btoa(`${key}:`);
}

async function searchCompaniesHouseUK(
  sb: ReturnType<typeof getSupabase>,
  q: string,
  tenantId: string,
): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(
    `${CH_BASE}/search/companies?q=${encodeURIComponent(q)}&items_per_page=20`,
    { headers: { Authorization: chAuthHeader(), Accept: 'application/json' } },
  );
  if (!res.ok) {
    console.error('[search-companies] CH UK error', res.status, await res.text().catch(() => ''));
    return [];
  }
  const json = await res.json();
  const items: Array<{
    company_number: string;
    title: string;
    company_status?: string;
    company_type?: string;
    address_snippet?: string;
  }> = json.items ?? [];

  const upserted: Array<Record<string, unknown>> = [];

  for (const it of items) {
    const baseSlug = generateSlug(it.title, it.company_number);
    let finalSlug = baseSlug;
    let attempt = 1;
    const icgCode = `GB:${it.company_number}`;

    while (true) {
      const { data: existing } = await sb
        .from('companies')
        .select('id, icg_code')
        .eq('slug', finalSlug)
        .maybeSingle();
      if (!existing || existing.icg_code === icgCode) break;
      attempt++;
      finalSlug = `${baseSlug}-${attempt}`;
    }

    const row = {
      tenant_id: tenantId || null,
      icg_code: icgCode,
      country_code: 'GB',
      name: it.title,
      reg_no: it.company_number,
      status: it.company_status ?? null,
      legal_form: it.company_type ?? null,
      registered_address: it.address_snippet ?? null,
      slug: finalSlug,
      cached_at: new Date().toISOString(),
    };

    const { data: upRow } = await sb
      .from('companies')
      .upsert(row, { onConflict: 'icg_code' })
      .select('id, icg_code, name, reg_no, vat_no, status, country_code, slug, cached_at, legal_form')
      .maybeSingle();

    if (upRow) upserted.push(upRow);
  }

  return upserted;
}

// ── Main handler ─────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const url = new URL(req.url);
    // Support both GET query params and POST body
    let q: string, country: string, tenantId: string, force = false;

    if (req.method === 'POST') {
      const body = await req.json();
      q = body.q ?? '';
      country = (body.country ?? '').toLowerCase();
      tenantId = body.tenant_id ?? '';
      force = body.fresh === true;
    } else {
      q = url.searchParams.get('q') ?? '';
      country = (url.searchParams.get('country') ?? '').toLowerCase();
      tenantId = url.searchParams.get('tenant_id') ?? '';
      force = url.searchParams.get('fresh') === 'true';
    }

    if (!q || q.length < 2) {
      return new Response(JSON.stringify({ results: [], count: 0, source: 'cache' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const sb = getSupabase();

    // ── 1. Cache check ──────────────────────────────────────
    if (!force) {
      let cacheQuery = sb
        .from('companies')
        .select('id, icg_code, name, reg_no, vat_no, status, country_code, slug, cached_at, legal_form')
        .gt('cached_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .or(`name.ilike.%${q}%,reg_no.ilike.%${q}%`)
        .limit(10);

      if (tenantId) cacheQuery = cacheQuery.eq('tenant_id', tenantId);
      if (country) cacheQuery = cacheQuery.eq('country_code', country.toUpperCase());

      const { data: cached } = await cacheQuery;

      if (cached && cached.length > 0) {
        const sorted = [...cached].sort((a, b) => {
          const aU = a.name.toUpperCase();
          const bU = b.name.toUpperCase();
          const qU = q.toUpperCase();
          const aScore = aU === qU ? 0 : aU.startsWith(qU) ? 1 : 2;
          const bScore = bU === qU ? 0 : bU.startsWith(qU) ? 1 : 2;
          return aScore !== bScore ? aScore - bScore : aU.localeCompare(bU);
        });

        return new Response(
          JSON.stringify({ results: sorted, count: sorted.length, source: 'cache' }),
          { headers: { ...CORS, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── 2. UK branch: route to Companies House ──────────────
    const countryCode = country || 'cy';
    if (countryCode === 'gb') {
      const ukResults = await searchCompaniesHouseUK(sb, q, tenantId);
      return new Response(
        JSON.stringify({ results: ukResults, count: ukResults.length, source: 'api4all' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // ── 3. Get API4ALL token (non-UK countries) ─────────────
    let token: string;
    try {
      token = await getApiToken(sb);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Search temporarily unavailable', results: [], count: 0 }),
        { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    // ── 4. Call API4All ─────────────────────────────────────
    const searchType = isRegNoSearch(q) ? 'reg_no' : 'name';
    const apiUrl = `${API_BASE}/search/${encodeURIComponent(countryCode)}/${searchType}/${encodeURIComponent(q)}`;

    const apiRes = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (!apiRes.ok) {
      // Return stale cache if available on API failure
      const { data: stale } = await sb
        .from('companies')
        .select('id, icg_code, name, reg_no, vat_no, status, country_code, slug, cached_at, legal_form')
        .or(`name.ilike.%${q}%,reg_no.ilike.%${q}%`)
        .limit(10);

      return new Response(
        JSON.stringify({ results: stale ?? [], count: stale?.length ?? 0, source: 'cache', warning: 'Stale data' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    // API4ALL sometimes returns PHP print_r ("Array(...)") instead of JSON.
    // Read as text first, then parse defensively to avoid crashing.
    const rawText = await apiRes.text();
    let apiJson: { results?: unknown[] } = {};
    try {
      apiJson = JSON.parse(rawText);
    } catch {
      console.error('[search-companies] Non-JSON response from API4ALL:', rawText.slice(0, 200));
      return new Response(
        JSON.stringify({ results: [], count: 0, source: 'api4all', warning: 'Upstream returned non-JSON' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }
    const rawResults: Array<{
      id?: string;
      code: string;
      country: string;
      name: string;
      reg_no?: string;
      vat_no?: string;
      status?: string;
      legal_form?: string;
    }> = apiJson.results ?? [];

    if (rawResults.length === 0) {
      return new Response(
        JSON.stringify({ results: [], count: 0, source: 'api4all' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    // ── 4. Upsert into companies table ──────────────────────
    const upserted: Array<Record<string, unknown>> = [];

    for (const r of rawResults) {
      const baseSlug = generateSlug(r.name, r.reg_no ?? null);

      // Check slug uniqueness — try base slug first, then append numbers
      let finalSlug = baseSlug;
      let attempt = 1;
      while (true) {
        const { data: existing } = await sb
          .from('companies')
          .select('id, icg_code')
          .eq('slug', finalSlug)
          .maybeSingle();

        if (!existing || existing.icg_code === r.code) break;
        attempt++;
        finalSlug = `${baseSlug}-${attempt}`;
      }

      const row = {
        tenant_id: tenantId || null,
        icg_code: r.code,
        country_code: (r.country ?? countryCode).toUpperCase(),
        name: r.name,
        reg_no: r.reg_no ?? null,
        vat_no: r.vat_no ?? null,
        status: r.status ?? null,
        legal_form: r.legal_form ?? null,
        slug: finalSlug,
        cached_at: new Date().toISOString(),
      };

      const { data: upsertedRow } = await sb
        .from('companies')
        .upsert(row, { onConflict: 'icg_code' })
        .select('id, icg_code, name, reg_no, vat_no, status, country_code, slug, cached_at, legal_form')
        .maybeSingle();

      if (upsertedRow) upserted.push(upsertedRow);
    }

    return new Response(
      JSON.stringify({ results: upserted, count: upserted.length, source: 'api4all' }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message, results: [], count: 0 }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
