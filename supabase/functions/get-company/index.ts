// ============================================================
// Edge Function: get-company
// Returns a company by slug with stale-while-revalidate logic.
// Now also fetches director/secretary names from /information.
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const API_BASE = 'https://v3.api4all.io/a4a/3.0/api';
const STALE_HOURS = 24;

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
}

async function getApiToken(sb: ReturnType<typeof getSupabase>): Promise<string> {
  const projectCode = Deno.env.get('API4ALL_PROJECT_CODE') ?? '';
  const username = Deno.env.get('API4ALL_USERNAME') ?? '';
  const password = Deno.env.get('API4ALL_PASSWORD') ?? '';

  const { data: tokenRow } = await sb
    .from('api4all_tokens')
    .select('access_token')
    .gt('expires_at', new Date(Date.now() + 5 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (tokenRow?.access_token) return tokenRow.access_token;

  const credentials = btoa(`${username}:${password}`);
  const res = await fetch(`${API_BASE}/token/${encodeURIComponent(projectCode)}`, {
    method: 'GET',
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!res.ok) throw new Error(`API4All auth failed (${res.status})`);

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

// ── Extract directors/secretaries from information response ───
function extractDirectors(raw: Record<string, unknown>): Array<{ name: string; role: string }> {
  const directors: Array<{ name: string; role: string }> = [];

  // Try common response shapes from API4ALL information endpoint
  const tryExtract = (obj: unknown, defaultRole: string) => {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (typeof item === 'string') {
          directors.push({ name: item, role: defaultRole });
        } else if (item && typeof item === 'object') {
          const name = (item as Record<string, unknown>).name ?? (item as Record<string, unknown>).full_name ?? '';
          const role = (item as Record<string, unknown>).role ?? (item as Record<string, unknown>).position ?? defaultRole;
          if (name) directors.push({ name: String(name), role: String(role) });
        }
      }
    }
  };

  // Check various possible field names from the API response
  tryExtract(raw.directors, 'Director');
  tryExtract(raw.secretaries, 'Secretary');
  tryExtract(raw.officers, 'Officer');

  // Also check nested data object
  if (raw.data && typeof raw.data === 'object') {
    const data = raw.data as Record<string, unknown>;
    tryExtract(data.directors, 'Director');
    tryExtract(data.secretaries, 'Secretary');
    tryExtract(data.officers, 'Officer');
  }

  // Check for a generic "persons" or "officials" array
  tryExtract(raw.persons, 'Officer');
  tryExtract(raw.officials, 'Officer');

  return directors;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const url = new URL(req.url);
    let slug: string, tenantId: string;

    if (req.method === 'POST') {
      const body = await req.json();
      slug = body.slug ?? '';
      tenantId = body.tenant_id ?? '';
    } else {
      slug = url.searchParams.get('slug') ?? '';
      tenantId = url.searchParams.get('tenant_id') ?? '';
    }

    if (!slug) {
      return new Response(JSON.stringify({ company: null, error: 'missing_slug' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const sb = getSupabase();

    // ── 1. Look up in DB ──────────────────────────────────
    let dbQuery = sb.from('companies').select('*').eq('slug', slug);
    if (tenantId) dbQuery = dbQuery.eq('tenant_id', tenantId);
    const { data: company } = await dbQuery.maybeSingle();

    if (!company) {
      return new Response(JSON.stringify({ company: null, error: 'not_found' }), {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Check freshness ────────────────────────────────
    const cachedAt = company.cached_at ? new Date(company.cached_at) : null;
    const isStale =
      !cachedAt || Date.now() - cachedAt.getTime() > STALE_HOURS * 60 * 60 * 1000;

    // Also check if directors are missing
    const needsDirectors = !company.directors_json || (Array.isArray(company.directors_json) && company.directors_json.length === 0);

    if (!isStale && !needsDirectors) {
      return new Response(JSON.stringify({ company, source: 'cache' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Refresh from API ───────────────────────────────
    const countryCode = (company.country_code ?? 'cy').toLowerCase();

    // ── 3a. UK branch: refresh from Companies House ────────
    if (countryCode === 'gb') {
      try {
        const chKey = Deno.env.get('COMPANIES_HOUSE_UK_API_KEY') ?? '';
        const auth = 'Basic ' + btoa(`${chKey}:`);
        const cn = company.reg_no ?? company.icg_code?.replace(/^GB:/, '') ?? '';
        if (cn) {
          const [profRes, offRes] = await Promise.all([
            fetch(`https://api.company-information.service.gov.uk/company/${cn}`, {
              headers: { Authorization: auth, Accept: 'application/json' },
            }),
            fetch(`https://api.company-information.service.gov.uk/company/${cn}/officers`, {
              headers: { Authorization: auth, Accept: 'application/json' },
            }),
          ]);

          const updateFields: Record<string, unknown> = {
            cached_at: new Date().toISOString(),
          };

          if (profRes.ok) {
            const profile = await profRes.json();
            updateFields.name = profile.company_name ?? company.name;
            updateFields.status = profile.company_status ?? company.status;
            updateFields.legal_form = profile.type ?? company.legal_form;
            updateFields.registered_address = [
              profile.registered_office_address?.address_line_1,
              profile.registered_office_address?.address_line_2,
              profile.registered_office_address?.locality,
              profile.registered_office_address?.postal_code,
              profile.registered_office_address?.country,
            ].filter(Boolean).join(', ') || company.registered_address;
            updateFields.raw_source_json = profile;
          }

          if (offRes.ok) {
            const off = await offRes.json();
            const items = (off.items ?? []) as Array<{ name?: string; officer_role?: string; resigned_on?: string }>;
            const directors = items
              .filter((o) => !o.resigned_on)
              .map((o) => ({
                name: o.name ?? '',
                role: o.officer_role
                  ? o.officer_role
                      .split('-')
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ')
                  : 'Officer',
              }))
              .filter((d) => d.name);
            if (directors.length > 0) updateFields.directors_json = directors;
          }

          const { data: refreshed } = await sb
            .from('companies')
            .update(updateFields)
            .eq('id', company.id)
            .select('*')
            .maybeSingle();

          if (refreshed) {
            return new Response(JSON.stringify({ company: refreshed, source: 'refreshed' }), {
              headers: { ...CORS, 'Content-Type': 'application/json' },
            });
          }
        }
      } catch (err) {
        console.error('[get-company] CH UK refresh failed:', err);
      }

      return new Response(JSON.stringify({ company, source: 'cache' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── 3b. API4ALL branch (non-UK) ────────────────────────
    try {
      const token = await getApiToken(sb);

      // Fetch search results + information endpoint in parallel
      const searchUrl = `${API_BASE}/search/${countryCode}/name/${encodeURIComponent(company.name)}`;
      const regNo = company.reg_no;
      const infoUrl = regNo
        ? `${API_BASE}/information/${countryCode}/reg_no/${encodeURIComponent(regNo)}`
        : null;

      const headers = { Authorization: `Bearer ${token}` };

      const [searchRes, infoRes] = await Promise.all([
        fetch(searchUrl, { headers }),
        infoUrl ? fetch(infoUrl, { headers }) : Promise.resolve(null),
      ]);

      const updateFields: Record<string, unknown> = {
        cached_at: new Date().toISOString(),
      };

      // Process search results
      if (searchRes.ok) {
        const apiJson = await searchRes.json();
        const match = (apiJson.results ?? []).find(
          (r: { code: string }) => r.code === company.icg_code
        );
        if (match) {
          updateFields.status = match.status ?? company.status;
          updateFields.name = match.name ?? company.name;
          updateFields.vat_no = match.vat_no ?? company.vat_no;
        }
      }

      // Process information response for directors
      if (infoRes && infoRes.ok) {
        try {
          const infoJson = await infoRes.json();
          // Store raw response for future use
          updateFields.raw_source_json = infoJson;

          const directors = extractDirectors(infoJson);
          if (directors.length > 0) {
            updateFields.directors_json = directors;
          }
        } catch (_) {
          // Info parsing failed, skip
        }
      }

      const { data: refreshed } = await sb
        .from('companies')
        .update(updateFields)
        .eq('id', company.id)
        .select('*')
        .maybeSingle();

      if (refreshed) {
        return new Response(JSON.stringify({ company: refreshed, source: 'refreshed' }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }
    } catch (_) {
      // Refresh failed — return stale data
    }

    return new Response(JSON.stringify({ company, source: 'cache' }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ company: null, error: message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
