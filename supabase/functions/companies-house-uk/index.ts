// Companies House UK proxy
// Docs: https://developer-specs.company-information.service.gov.uk/
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCallerUser, isServiceCall } from "../_shared/order-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CH_BASE = "https://api.company-information.service.gov.uk";
const CACHE_TTL_HOURS = 24;
// Public callers may only look up companies already listed on the site.
const PUBLIC_ACTIONS = new Set(["officers", "filing-history", "charges", "psc"]);
const FILING_CATEGORIES = new Set(["accounts", "confirmation-statement", "officers", "incorporation", "address", "capital", "mortgage", "annual-return"]);
const RESPONSE_TTL_MS = 60 * 60 * 1000;
const responseCache = new Map<string, { at: number; data: unknown }>();

function authHeader() {
  const raw = Deno.env.get("COMPANIES_HOUSE_UK_API_KEY");
  if (!raw) throw new Error("COMPANIES_HOUSE_UK_API_KEY not configured");
  const key = raw.trim();
  // Log non-sensitive metadata to help diagnose 401s
  // Companies House uses HTTP Basic with the API key as the username and an empty password.
  return "Basic " + btoa(`${key}:`);
}

async function chFetch(path: string) {
  const res = await fetch(`${CH_BASE}${path}`, {
    headers: { Authorization: authHeader(), Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[CH UK] ${res.status} on ${path}: ${text.slice(0, 200)}`);
    throw new Error(`Companies House API ${res.status}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, query, companyNumber, itemsPerPage = 20, startIndex = 0, category } =
      await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (companyNumber !== undefined && !/^[A-Za-z0-9]{6,10}$/.test(String(companyNumber))) {
      throw new Error("Invalid company number");
    }
    if (query !== undefined && String(query).length > 200) throw new Error("Query too long");
    if (category !== undefined && !FILING_CATEGORIES.has(String(category))) throw new Error("Invalid category");
    const perPage = Math.min(Math.max(Number(itemsPerPage) || 20, 1), 100);
    const start = Math.min(Math.max(Number(startIndex) || 0, 0), 10000);

    // Access: open-ended search and live profile fetches are backend/staff only.
    // Everyone else may only read records for UK companies already on the site.
    let privileged = isServiceCall(req);
    if (!privileged) {
      const uid = await getCallerUser(req, supabase);
      if (uid) {
        const { data: staff } = await supabase.rpc("is_staff", { _user_id: uid });
        privileged = staff === true;
      }
    }
    if (!privileged) {
      if (!PUBLIC_ACTIONS.has(String(action))) {
        return new Response(JSON.stringify({ success: false, error: "Not allowed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403,
        });
      }
      const num = String(companyNumber ?? "").toUpperCase();
      const { data: known } = await supabase
        .from("companies").select("id").eq("country_code", "GB")
        .or(`reg_no.eq.${num},icg_code.eq.GB:${num}`).limit(1).maybeSingle();
      if (!known) {
        return new Response(JSON.stringify({ success: false, error: "Company not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404,
        });
      }
    }

    // Short-lived cache so repeat page views don't hit the registry again.
    const cacheKey = `${action}|${String(companyNumber ?? "").toUpperCase()}|${perPage}|${start}|${category ?? ""}`;
    const hit = action !== "search" && action !== "profile" ? responseCache.get(cacheKey) : undefined;
    if (hit && Date.now() - hit.at < RESPONSE_TTL_MS) {
      return new Response(JSON.stringify({ success: true, data: hit.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    let data: unknown;

    switch (action) {
      case "search": {
        if (!query) throw new Error("query is required");
        data = await chFetch(
          `/search/companies?q=${encodeURIComponent(query)}&items_per_page=${perPage}&start_index=${start}`,
        );
        // Log search
        await supabase.from("search_logs").insert({
          query,
          country_code: "GB",
          results_count: (data as any)?.total_results ?? 0,
        }).then(() => {}, () => {});
        break;
      }

      case "profile": {
        if (!companyNumber) throw new Error("companyNumber is required");
        const icgKey = `GB:${companyNumber}`;
        // Try cache
        const { data: cached } = await supabase
          .from("companies")
          .select("*")
          .eq("country_code", "GB")
          .eq("icg_code", icgKey)
          .maybeSingle();

        const fresh =
          cached?.cached_at &&
          new Date(cached.cached_at).getTime() >
            Date.now() - CACHE_TTL_HOURS * 3600 * 1000;

        if (fresh) {
          data = { source: "cache", company: cached };
          break;
        }

        const profile = await chFetch(`/company/${companyNumber}`);
        const officers = await chFetch(`/company/${companyNumber}/officers`).catch(
          () => ({ items: [] }),
        );

        const upsert = {
          icg_code: icgKey,
          country_code: "GB",
          name: profile.company_name,
          reg_no: profile.company_number,
          legal_form: profile.type,
          status: profile.company_status,
          registered_address: [
            profile.registered_office_address?.address_line_1,
            profile.registered_office_address?.address_line_2,
            profile.registered_office_address?.locality,
            profile.registered_office_address?.postal_code,
            profile.registered_office_address?.country,
          ].filter(Boolean).join(", "),
          directors_json: officers.items ?? [],
          raw_source_json: profile,
          cached_at: new Date().toISOString(),
        };

        const { data: saved } = await supabase
          .from("companies")
          .upsert(upsert, { onConflict: "country_code,icg_code" })
          .select()
          .single();

        data = { source: "live", company: saved ?? upsert };
        break;
      }

      case "officers": {
        if (!companyNumber) throw new Error("companyNumber is required");
        data = await chFetch(`/company/${companyNumber}/officers`);
        break;
      }

      case "filing-history": {
        if (!companyNumber) throw new Error("companyNumber is required");
        let path =
          `/company/${companyNumber}/filing-history?items_per_page=${perPage}&start_index=${start}`;
        if (category) path += `&category=${encodeURIComponent(category)}`;
        data = await chFetch(path);
        break;
      }

      case "charges": {
        if (!companyNumber) throw new Error("companyNumber is required");
        data = await chFetch(`/company/${companyNumber}/charges`);
        break;
      }

      case "psc": {
        if (!companyNumber) throw new Error("companyNumber is required");
        data = await chFetch(
          `/company/${companyNumber}/persons-with-significant-control`,
        );
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    if (action !== "search" && action !== "profile") {
      if (responseCache.size > 500) responseCache.clear();
      responseCache.set(cacheKey, { at: Date.now(), data });
    }
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("companies-house-uk error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
