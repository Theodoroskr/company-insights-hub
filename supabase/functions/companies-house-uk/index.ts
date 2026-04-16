// Companies House UK proxy
// Docs: https://developer-specs.company-information.service.gov.uk/
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CH_BASE = "https://api.company-information.service.gov.uk";
const CACHE_TTL_HOURS = 24;

function authHeader() {
  const raw = Deno.env.get("COMPANIES_HOUSE_UK_API_KEY");
  if (!raw) throw new Error("COMPANIES_HOUSE_UK_API_KEY not configured");
  const key = raw.trim();
  // Log non-sensitive metadata to help diagnose 401s
  console.log(
    `[CH UK] key length=${key.length} starts="${key.slice(0, 4)}..." ends="...${key.slice(-2)}"`,
  );
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
    throw new Error(`Companies House API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, query, companyNumber, itemsPerPage = 20, startIndex = 0 } =
      await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let data: unknown;

    switch (action) {
      case "search": {
        if (!query) throw new Error("query is required");
        data = await chFetch(
          `/search/companies?q=${encodeURIComponent(query)}&items_per_page=${itemsPerPage}&start_index=${startIndex}`,
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
        const cacheKey = `GB:${companyNumber}`;
        // Try cache
        const { data: cached } = await supabase
          .from("companies")
          .select("*")
          .eq("country_code", "GB")
          .eq("icg_code", cacheKey)
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
          icg_code: cacheKey,
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
        data = await chFetch(
          `/company/${companyNumber}/filing-history?items_per_page=${itemsPerPage}`,
        );
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
