// Recommends the most suitable report / KYB package for a buyer's needs using Lovable AI.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createResponsesCall } from "../_shared/responses.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id",
  "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

function visible(p: any, cc: string) {
  const scope = p.country_scope ?? "global";
  const allowed: string[] = p.allowed_countries ?? [];
  if (allowed.length) return allowed.includes(cc);
  if (scope === "global" || !scope) return true;
  if (scope === "cy-only") return cc === "CY";
  if (scope === "uk-only") return cc === "GB";
  if (scope === "eu-only")
    return ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"].includes(cc);
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { country, needs } = await req.json();
    const cc = String(country ?? "").toUpperCase().slice(0, 2);
    const text = String(needs ?? "").trim().slice(0, 2000);
    if (!cc || text.length < 5) return json({ error: "Please choose a country and describe your needs." }, 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured." }, 500);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await sb
      .from("products")
      .select("slug,name,type,description,base_price,service_fee,is_instant,delivery_sla_hours,country_scope,allowed_countries,what_is_included")
      .eq("is_active", true)
      .neq("type", "monitoring");
    if (error) throw error;
    const seen = new Set<string>();
    const catalog = (data ?? []).filter((p) => visible(p, cc) && !seen.has(p.slug) && seen.add(p.slug));
    if (!catalog.length) return json({ error: "No products are available for this country." }, 404);

    const list = catalog
      .map((p) => `- slug: ${p.slug} | ${p.name} | type ${p.type} | €${Number(p.base_price) + Number(p.service_fee ?? 0)} | ${p.is_instant ? "instant" : `~${p.delivery_sla_hours}h`} | ${(p.description ?? "").slice(0, 200)}`)
      .join("\n");

    const { result } = createResponsesCall(
      req,
      { baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, model: "openai/gpt-6-astra" },
      [
        { role: "user", content: `Company country: ${cc}\nBuyer needs: ${text}\n\nCatalog:\n${list}` },
      ],
      "You are a company-intelligence advisor. Pick the single most suitable product from the catalog for the buyer's due-diligence needs, plus up to 2 alternatives. Only use slugs from the catalog. Reply with JSON only: {\"recommended\":\"slug\",\"reason\":\"2-3 sentences\",\"alternatives\":[{\"slug\":\"slug\",\"reason\":\"one sentence\"}]}",
    );
    const out = await result.text;
    const match = out.match(/\{[\s\S]*\}/);
    let parsed: any = null;
    try { parsed = match ? JSON.parse(match[0]) : null; } catch { /* handled below */ }
    const slugs = new Set(catalog.map((p) => p.slug));
    if (!parsed || !slugs.has(parsed.recommended)) return json({ error: "Couldn't produce a recommendation. Please add more detail." }, 502);
    const alternatives = (Array.isArray(parsed.alternatives) ? parsed.alternatives : [])
      .filter((a: any) => slugs.has(a?.slug) && a.slug !== parsed.recommended)
      .slice(0, 2);
    return json({ recommended: parsed.recommended, reason: String(parsed.reason ?? ""), alternatives });
  } catch (err: any) {
    const status = err?.statusCode ?? err?.status;
    if (status === 429) return json({ error: "Too many requests — please try again in a moment." }, 429);
    if (status === 402) return json({ error: "AI credits are exhausted. Please add credits in Settings → Plans & credits." }, 402);
    if (status === 403) return json({ error: err?.message ?? "AI access denied." }, 403);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
