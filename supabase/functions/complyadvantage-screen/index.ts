// ============================================================
// complyadvantage-screen
// Runs sanctions + PEP + adverse-media screening against
// ComplyAdvantage for the company, all active officers and all
// active PSCs of a UK report bundle. Persists results into
// screening_results + screening_entity_hits.
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
  role: "company" | "officer" | "psc";
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

function extractEntities(bundle: Record<string, unknown>): Entity[] {
  const entities: Entity[] = [];

  // Company
  const profile = (bundle.company ?? bundle.profile ?? {}) as Record<string, unknown>;
  const companyName = (profile.company_name ?? profile.name) as string | undefined;
  if (companyName) entities.push({ name: companyName, role: "company" });

  // Active officers
  const officers = asArray(bundle.officers);
  for (const o of officers) {
    const oo = o as Record<string, unknown>;
    if (oo.resigned_on) continue;
    const name = oo.name as string | undefined;
    if (name) entities.push({ name, role: "officer" });
  }

  // Active PSCs
  const psc = asArray(bundle.psc);
  for (const p of psc) {
    const pp = p as Record<string, unknown>;
    if (pp.ceased_on || pp.ceased) continue;
    const name = pp.name as string | undefined;
    if (name) entities.push({ name, role: "psc" });
  }

  // Dedup on name+role
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
      .select("id, api4all_raw_json")
      .eq("order_item_id", order_item_id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (repErr || !report?.api4all_raw_json) throw new Error("No generated report bundle for order_item");

    const entities = extractEntities(report.api4all_raw_json as Record<string, unknown>);
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

    // Upsert: delete pending row first if any, then insert summary
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
