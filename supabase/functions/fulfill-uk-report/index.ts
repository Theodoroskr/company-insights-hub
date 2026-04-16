// ============================================================
// fulfill-uk-report
// Instantly fulfils a UK Company Report order_item by pulling
// profile + officers + filings + charges + PSC from Companies
// House and saving the bundle into generated_reports.
// No API4ALL involved.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CH_BASE = "https://api.company-information.service.gov.uk";

function authHeader() {
  const key = (Deno.env.get("COMPANIES_HOUSE_UK_API_KEY") ?? "").trim();
  if (!key) throw new Error("COMPANIES_HOUSE_UK_API_KEY not configured");
  return "Basic " + btoa(`${key}:`);
}

async function chFetch<T = unknown>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${CH_BASE}${path}`, {
      headers: { Authorization: authHeader(), Accept: "application/json" },
    });
    if (!res.ok) {
      console.error(`[fulfill-uk-report] CH ${res.status} on ${path}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error(`[fulfill-uk-report] CH error on ${path}:`, e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { order_item_id } = await req.json();
    if (!order_item_id) throw new Error("order_item_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load the item + product + company
    const { data: item, error: itemErr } = await supabase
      .from("order_items")
      .select(`
        id, fulfillment_status,
        products:product_id ( id, slug, type ),
        companies:company_id ( id, country_code, reg_no, name )
      `)
      .eq("id", order_item_id)
      .maybeSingle();

    if (itemErr || !item) throw new Error("order_item not found");

    const product = item.products as { slug?: string; type?: string } | null;
    const company = item.companies as {
      id: string; country_code?: string; reg_no?: string; name?: string;
    } | null;

    if (!company || (company.country_code ?? "").toUpperCase() !== "GB" || !company.reg_no) {
      throw new Error("UK report requires a GB company with a reg_no");
    }
    if (product?.slug !== "uk-company-report") {
      throw new Error("This function only fulfils uk-company-report items");
    }
    if (item.fulfillment_status === "fulfilled" || item.fulfillment_status === "completed") {
      return new Response(JSON.stringify({ success: true, alreadyFulfilled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const num = company.reg_no;
    const [profile, officers, filings, charges, psc] = await Promise.all([
      chFetch<Record<string, unknown>>(`/company/${num}`),
      chFetch<{ items?: unknown[] }>(`/company/${num}/officers`),
      chFetch<{ items?: unknown[]; total_count?: number }>(`/company/${num}/filing-history?items_per_page=25`),
      chFetch<{ items?: unknown[]; total_count?: number }>(`/company/${num}/charges`),
      chFetch<{ items?: unknown[]; total_results?: number }>(`/company/${num}/persons-with-significant-control`),
    ]);

    if (!profile) throw new Error("Companies House profile fetch failed");

    const bundle = {
      generated_at: new Date().toISOString(),
      source: "companies-house-uk",
      company: profile,
      officers: officers?.items ?? [],
      filings: filings?.items ?? [],
      filings_total: filings?.total_count ?? 0,
      charges: charges?.items ?? [],
      charges_total: charges?.total_count ?? 0,
      psc: psc?.items ?? [],
      psc_total: psc?.total_results ?? 0,
    };

    // Save the report
    const { data: report, error: repErr } = await supabase
      .from("generated_reports")
      .insert({
        order_item_id: item.id,
        company_id: company.id,
        report_type: "kyb",
        api4all_raw_json: bundle,
        download_expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      })
      .select("id, download_token")
      .single();

    if (repErr) throw repErr;

    // Mark item completed
    await supabase
      .from("order_items")
      .update({
        fulfillment_status: "completed",
        verified_at: new Date().toISOString(),
        verified_by: "system:companies-house-uk",
      })
      .eq("id", item.id);

    // Audit log (best effort)
    await supabase.from("audit_logs").insert({
      action: "fulfill_uk_report",
      entity_type: "order_item",
      entity_id: item.id,
      payload: { company: company.name, reg_no: num, report_id: report.id },
    }).then(() => {}, () => {});

    return new Response(
      JSON.stringify({
        success: true,
        report_id: report.id,
        download_token: report.download_token,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("fulfill-uk-report error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
