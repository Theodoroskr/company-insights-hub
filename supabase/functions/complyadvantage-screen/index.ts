// ============================================================
// complyadvantage-screen
// Runs sanctions + PEP + adverse-media screening against
// ComplyAdvantage for the company plus all best-effort officers
// and shareholders/PSCs extracted from either:
//   - a UK Companies House bundle (officers / psc), or
//   - an API4ALL global report bundle (directors / shareholders /
//     representatives / officers — shapes vary by country).
// Persists results into screening_results + screening_entity_hits.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CA_BASE = "https://api.complyadvantage.com";
const FILTER_TYPES = ["sanction", "pep", "adverse-media", "warning", "fitness-probity"];

type Entity = {
  name: string;
  role: "company" | "officer" | "shareholder" | "psc";
};

interface CASearchResponse {
  status?: string;
  content?: {
    data?: {
      id?: number | string;
      ref?: string;
      total_hits?: number;
      total_matches?: number;
      share_url?: string;
      hits?: Array<{
        match_status?: string;
        score?: number;
        doc?: {
          id?: string;
          name?: string;
          types?: string[];
          sources?: string[];
          source_notes?: Record<string, unknown>;
        };
      }>;
    };
  };
}

function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object" && Array.isArray((v as Record<string, unknown>).items)) {
    return (v as { items: unknown[] }).items;
  }
  return [];
}

function pickName(o: Record<string, unknown>): string | undefined {
  const candidates = [
    "name", "full_name", "fullName", "display_name", "displayName",
    "person_name", "personName", "officer_name", "shareholder_name",
    "company_name", "companyName",
  ];
  for (const k of candidates) {
    const v = o[k];
    if (typeof v === "string" && v.trim().length > 1) return v.trim();
  }
  // composite first/last
  const first = (o.first_name ?? o.firstName ?? o.given_name) as string | undefined;
  const last = (o.last_name ?? o.lastName ?? o.surname ?? o.family_name) as string | undefined;
  if (first || last) {
    const composite = [first, last].filter(Boolean).join(" ").trim();
    if (composite.length > 1) return composite;
  }
  return undefined;
}

function isInactive(o: Record<string, unknown>): boolean {
  if (o.resigned_on || o.resignedOn) return true;
  if (o.ceased_on || o.ceasedOn || o.ceased) return true;
  const status = (o.status ?? o.state) as string | undefined;
  if (typeof status === "string") {
    const s = status.toLowerCase();
    if (s.includes("resigned") || s.includes("ceased") || s.includes("inactive")) return true;
  }
  return false;
}

function extractEntities(bundle: Record<string, unknown>): Entity[] {
  const entities: Entity[] = [];

  // Company name (UK CH shape, API4ALL shape, fallback)
  const profile = (bundle.company ?? bundle.profile ?? bundle.companyProfile ?? bundle) as Record<string, unknown>;
  const companyName =
    (profile.company_name as string | undefined) ??
    (profile.name as string | undefined) ??
    (profile.companyName as string | undefined);
  if (companyName) entities.push({ name: companyName, role: "company" });

  // Officers (UK CH + generic API4ALL)
  const officerSources: unknown[] = [
    bundle.officers, bundle.directors, bundle.directors_json,
    bundle.representatives, bundle.management,
  ];
  for (const src of officerSources) {
    for (const o of asArray(src)) {
      const oo = o as Record<string, unknown>;
      if (isInactive(oo)) continue;
      const name = pickName(oo);
      if (name) entities.push({ name, role: "officer" });
    }
  }

  // PSC (UK)
  for (const p of asArray(bundle.psc)) {
    const pp = p as Record<string, unknown>;
    if (isInactive(pp)) continue;
    const name = pickName(pp);
    if (name) entities.push({ name, role: "psc" });
  }

  // Shareholders / UBOs (API4ALL shapes)
  const shareholderSources: unknown[] = [
    bundle.shareholders, bundle.shareholders_json,
    bundle.ubos, bundle.beneficial_owners, bundle.beneficialOwners,
  ];
  for (const src of shareholderSources) {
    for (const s of asArray(src)) {
      const ss = s as Record<string, unknown>;
      if (isInactive(ss)) continue;
      const name = pickName(ss);
      if (name) entities.push({ name, role: "shareholder" });
    }
  }

  // Dedup on name+role (case-insensitive)
  const seen = new Set<string>();
  return entities.filter((e) => {
    const k = `${e.role}:${e.name.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function categoriseHitTypes(types: string[] | undefined): string[] {
  if (!types) return [];
  return types.filter((t) => FILTER_TYPES.includes(t));
}

function strengthFromScore(score?: number, matchStatus?: string): string {
  if (matchStatus === "true_positive") return "exact";
  if (matchStatus === "potential_match" || matchStatus === "unknown") {
    if ((score ?? 0) >= 0.85) return "strong";
    if ((score ?? 0) >= 0.6) return "medium";
    return "weak";
  }
  if ((score ?? 0) >= 0.95) return "exact";
  if ((score ?? 0) >= 0.8) return "strong";
  if ((score ?? 0) >= 0.6) return "medium";
  return "weak";
}

async function caSearch(apiKey: string, term: string): Promise<CASearchResponse> {
  const res = await fetch(`${CA_BASE}/searches?api_key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      search_term: term,
      fuzziness: 0.6,
      share_url: 1,
      filters: { types: FILTER_TYPES },
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ComplyAdvantage ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as CASearchResponse;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { order_item_id } = await req.json();
    if (!order_item_id) throw new Error("order_item_id is required");

    const apiKey = (Deno.env.get("COMPLYADVANTAGE_API_KEY") ?? "").trim();
    if (!apiKey) throw new Error("COMPLYADVANTAGE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Skip if already screened
    const { data: existing } = await supabase
      .from("screening_results")
      .select("id, overall_status")
      .eq("order_item_id", order_item_id)
      .maybeSingle();
    if (existing && existing.overall_status !== "error" && existing.overall_status !== "pending") {
      return new Response(JSON.stringify({ success: true, alreadyScreened: true, id: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load report bundle for this order_item
    const { data: report, error: repErr } = await supabase
      .from("generated_reports")
      .select("id, api4all_raw_json, company_id")
      .eq("order_item_id", order_item_id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (repErr || !report) throw new Error("No generated report bundle for order_item");

    let bundle = (report.api4all_raw_json ?? {}) as Record<string, unknown>;

    // Fallback: if bundle has no name at all, try to read company name from companies table
    if (!bundle || Object.keys(bundle).length === 0) {
      bundle = {};
    }
    let entities = extractEntities(bundle);
    if (entities.length === 0 && report.company_id) {
      const { data: c } = await supabase
        .from("companies")
        .select("name")
        .eq("id", report.company_id)
        .maybeSingle();
      if (c?.name) entities = [{ name: c.name, role: "company" }];
    }
    if (entities.length === 0) throw new Error("No entities to screen");

    let totalSanctions = 0;
    let totalPep = 0;
    let totalAdverse = 0;
    const hitsRows: Array<Record<string, unknown>> = [];
    const rawAll: Array<{ entity: Entity; response: CASearchResponse }> = [];

    for (const ent of entities) {
      try {
        const resp = await caSearch(apiKey, ent.name);
        rawAll.push({ entity: ent, response: resp });
        const hits = resp.content?.data?.hits ?? [];
        const shareUrl = resp.content?.data?.share_url;

        for (const h of hits) {
          const types = categoriseHitTypes(h.doc?.types);
          for (const t of types) {
            if (t === "sanction") totalSanctions++;
            else if (t === "pep") totalPep++;
            else if (t === "adverse-media") totalAdverse++;
            hitsRows.push({
              entity_name: ent.name,
              entity_role: ent.role,
              hit_type: t,
              match_strength: strengthFromScore(h.score, h.match_status),
              source_lists: h.doc?.sources ?? [],
              share_url: shareUrl ?? null,
              raw_match: h,
            });
          }
        }
      } catch (e) {
        console.error(`[complyadvantage-screen] ${ent.name}:`, e);
      }
    }

    const totalHits = totalSanctions + totalPep + totalAdverse;
    const overall =
      totalSanctions > 0 ? "hit" :
      totalPep > 0 || totalAdverse > 0 ? "review" :
      "clear";

    if (existing?.id) {
      await supabase.from("screening_results").delete().eq("id", existing.id);
    }

    const { data: inserted, error: insErr } = await supabase
      .from("screening_results")
      .insert({
        order_item_id,
        overall_status: overall,
        total_hits: totalHits,
        sanctions_hits: totalSanctions,
        pep_hits: totalPep,
        adverse_media_hits: totalAdverse,
        entities_screened: entities.length,
        raw_response: { entities, results: rawAll },
        screened_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    if (hitsRows.length > 0) {
      const rows = hitsRows.map((r) => ({ ...r, screening_result_id: inserted.id }));
      const { error: hitErr } = await supabase.from("screening_entity_hits").insert(rows);
      if (hitErr) console.error("hit insert error:", hitErr);
    }

    await supabase.from("audit_logs").insert({
      action: "complyadvantage_screen",
      entity_type: "order_item",
      entity_id: order_item_id,
      payload: { entities: entities.length, total_hits: totalHits, overall },
    }).then(() => {}, () => {});

    return new Response(
      JSON.stringify({
        success: true,
        screening_id: inserted.id,
        overall_status: overall,
        entities_screened: entities.length,
        total_hits: totalHits,
        sanctions_hits: totalSanctions,
        pep_hits: totalPep,
        adverse_media_hits: totalAdverse,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("complyadvantage-screen error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
