// Checks the health of every external API the platform depends on.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Status = "healthy" | "degraded" | "down" | "not_configured";
interface Result { id: string; name: string; description: string; status: Status; responseMs: number | null; details: string }

const env = (k: string) => (Deno.env.get(k) ?? "").trim();

async function timed(
  id: string, name: string, description: string,
  fn: () => Promise<{ status: Status; details: string }>,
): Promise<Result> {
  const start = Date.now();
  try {
    const r = await Promise.race([
      fn(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Timed out after 10s")), 10000)),
    ]);
    return { id, name, description, ...r, responseMs: r.status === "not_configured" ? null : Date.now() - start };
  } catch (e) {
    return { id, name, description, status: "down", responseMs: Date.now() - start, details: e instanceof Error ? e.message : String(e) };
  }
}

const httpStatus = (res: Response, okMsg: string): { status: Status; details: string } =>
  res.ok ? { status: "healthy", details: okMsg }
  : res.status >= 500 ? { status: "down", details: `HTTP ${res.status}` }
  : { status: "degraded", details: `HTTP ${res.status}${res.status === 401 || res.status === 403 ? " — credentials rejected" : ""}` };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Admin-only
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: role } = await userClient.rpc("get_my_role");
  if (!role || !["admin", "super_admin"].includes(String(role))) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

  const checks = await Promise.all([
    timed("api4all", "API4ALL", "v3.api4all.io — company search, profiles & report orders", async () => {
      const u = env("API4ALL_USERNAME"), p = env("API4ALL_PASSWORD"), code = env("API4ALL_PROJECT_CODE");
      if (!u || !p || !code) return { status: "not_configured", details: "API4ALL credentials missing" };
      const res = await fetch(`https://v3.api4all.io/a4a/3.0/api/token/${encodeURIComponent(code)}`, {
        headers: { Authorization: `Basic ${btoa(`${u}:${p}`)}`, Accept: "application/json" },
      });
      await res.text();
      return httpStatus(res, "Sign-in token issued");
    }),
    timed("companies_house_uk", "Companies House UK", "UK company data & instant UK reports", async () => {
      const key = env("COMPANIES_HOUSE_UK_API_KEY");
      if (!key) return { status: "not_configured", details: "API key missing" };
      const res = await fetch("https://api.company-information.service.gov.uk/search/companies?q=tesco&items_per_page=1", {
        headers: { Authorization: "Basic " + btoa(`${key}:`), Accept: "application/json" },
      });
      await res.text();
      return httpStatus(res, "Search responded");
    }),
    timed("complyadvantage", "ComplyAdvantage", "AML, sanctions & PEP screening", async () => {
      const key = env("COMPLYADVANTAGE_API_KEY");
      if (!key) return { status: "not_configured", details: "API key missing" };
      const res = await fetch(`https://api.complyadvantage.com/searches?per_page=1&api_key=${encodeURIComponent(key)}`);
      await res.text();
      return httpStatus(res, "API responded");
    }),
    timed("stripe", "Stripe", "Card payments", async () => {
      const key = env("STRIPE_SECRET_KEY");
      if (!key) return { status: "not_configured", details: "Live payments not set up (test checkout in use)" };
      const res = await fetch("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${key}` } });
      await res.text();
      return httpStatus(res, key.startsWith("sk_live") ? "Live mode" : "Test mode");
    }),
    timed("ai_gateway", "Lovable AI", "\"Which report?\" advisor", async () => {
      const key = env("LOVABLE_API_KEY");
      if (!key) return { status: "not_configured", details: "AI key missing" };
      const res = await fetch("https://ai.gateway.lovable.dev/v1/models", { headers: { Authorization: `Bearer ${key}` } });
      await res.text();
      return res.status === 404 ? { status: "healthy", details: "Gateway reachable" } : httpStatus(res, "Gateway reachable");
    }),
    timed("fx_rates", "Exchange rates", "api.exchangerate.host — currency conversion", async () => {
      const res = await fetch("https://api.exchangerate.host/latest?base=EUR&symbols=USD");
      const body = await res.json().catch(() => null);
      if (!res.ok) return httpStatus(res, "");
      if (body && body.success === false) return { status: "degraded", details: body.error?.info ?? body.error?.type ?? "Provider returned an error" };
      return { status: "healthy", details: "Rates returned" };
    }),
    timed("database", "Database", "Orders, products & customer data", async () => {
      const { error } = await admin.from("products").select("id", { head: true, count: "exact" });
      return error ? { status: "down", details: error.message } : { status: "healthy", details: "Query succeeded" };
    }),
    timed("storage", "File storage", "Report PDF downloads (\"reports\" bucket)", async () => {
      const { data, error } = await admin.storage.getBucket("reports");
      if (error || !data) return { status: "degraded", details: "\"reports\" bucket missing — PDF downloads will fail" };
      return { status: "healthy", details: "Bucket available" };
    }),
  ]);

  return new Response(JSON.stringify({ checkedAt: new Date().toISOString(), checks }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
