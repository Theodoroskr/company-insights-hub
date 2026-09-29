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

const STANDALONE_SLUGS = ["company-aml-screening", "aml-screening-with-directors"];
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

// Only regulator / enforcement sources count as "warning"/"fitness-probity".
// Generic crime lists (sex offender registries, most-wanted, warrants) are dropped:
// they match common names and produce false positives.
const REGULATORY_SOURCE = /(fca|sec-|sec_|finra|ofac|ofsi|hmt|esma|eba|fincen|central-bank|centralbank|cysec|regulator|enforcement|final-notice|disqualif|prohibit|penalt|debarr|world-bank|interpol-red)/i;
const CRIME_NOISE = /(sex-offender|sex_offender|most-wanted|mostwanted|warrant|absconder|inmate|arrest|police|sheriff|troopers|bureau-of-investigation)/i;

function categoriseHitTypes(types: string[] | undefined, sources: string[] | undefined): string[] {
  if (!types) return [];
  const srcs = sources ?? [];
  const regulatory = srcs.some((s) => REGULATORY_SOURCE.test(s) && !CRIME_NOISE.test(s));
  const out = new Set<string>();
  for (const t of types) {
    if (t === "sanction" || t === "pep") out.add(t);
    else if ((t === "warning" || t === "fitness-probity") && regulatory) out.add("warning");
    // adverse-media intentionally excluded
  }
  return [...out];
}

function strengthFromScore(score?: number, matchStatus?: string): string {
  if (matchStatus === "true_positive") return "exact";
  if ((score ?? 0) >= 0.95) return "exact";
  if ((score ?? 0) >= 0.8) return "strong";
  if ((score ?? 0) >= 0.6) return "medium";
  return "weak";
}

async function caSearch(apiKey: string, ent: Entity): Promise<CASearchResponse> {
  const res = await fetch(`${CA_BASE}/searches?api_key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      search_term: ent.name,
      fuzziness: 0.2,
      exact_match: false,
      share_url: 0,
      filters: {
        types: ["sanction", "pep", "warning", "fitness-probity"],
        entity_type: ent.role === "company" ? "company" : "person",
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ComplyAdvantage ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as CASearchResponse;
}

async function notify(supabase: any, userId: string | undefined, orderItemId: string, orderId: string | null, companyName: string, overall: string | null) {
  if (!userId) return;
  try {
    const failed = overall === null;
    const kind = failed ? "screening_failed" : "screening_ready";
    const { data: ex } = await supabase.from("notifications").select("id").eq("order_item_id", orderItemId).eq("kind", kind).maybeSingle();
    if (ex) return;
    const label = overall === "hit" ? "Hit" : overall === "review" ? "Review" : "Clear";
    await supabase.from("notifications").insert({
      user_id: userId, order_id: orderId, order_item_id: orderItemId, kind,
      title: failed ? `Screening could not be completed — ${companyName}` : `AML screening complete: ${label} — ${companyName}`,
      body: failed ? "Our team has been alerted and will re-run it." : "View the full sanctions, PEP and enforcement results.",
      link: `/account/reports/${orderItemId}`,
    });
  } catch (e) { console.error("notify error", e); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let ctx: { supabase?: any; itemId?: string; userId?: string; orderId?: string | null; name?: string; standalone?: boolean } = {};
  try {
    const { order_item_id } = await req.json();
    if (!order_item_id) throw new Error("order_item_id is required");

    const apiKey = (Deno.env.get("COMPLYADVANTAGE_API_KEY") ?? "").trim();
    if (!apiKey) throw new Error("COMPLYADVANTAGE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Entitlement: only run for items where screening was paid for
    const { data: ent } = await supabase
      .from("order_items")
      .select("screening_addon, company_id, products:product_id(slug), order_id, orders!inner(status, user_id)")
      .eq("id", order_item_id)
      .maybeSingle();
    const entRow = ent as unknown as {
      screening_addon?: boolean;
      company_id?: string | null;
      products?: { slug?: string } | null;
      orders?: { status?: string; user_id?: string } | null;
      order_id?: string | null;
    } | null;
    const slug = entRow?.products?.slug ?? "";
    const standalone = STANDALONE_SLUGS.includes(slug);
    const companyOnly = slug === "company-aml-screening";
    const paidFor = !!entRow && (entRow.screening_addon === true || slug === "enhanced-uk-kyb-report" || standalone);
    const orderOk = !!entRow?.orders && ["paid", "processing", "completed", "fulfilled"].includes(entRow.orders.status ?? "");
    if (!paidFor || !orderOk) {
      return new Response(JSON.stringify({ success: false, error: "Screening not purchased for this item" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    let force = false;
    if (token && token !== Deno.env.get("SUPABASE_ANON_KEY") && token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      const { data: u } = await supabase.auth.getUser(token);
      let staff = false;
      if (u?.user) {
        const { data: ok } = await supabase.rpc("has_permission", { _user_id: u.user.id, _section: "fulfillment", _need_edit: true });
        staff = ok === true; force = staff;
      }
      if (!staff && u?.user && entRow?.orders?.user_id && u.user.id !== entRow.orders.user_id) {
        return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Skip if already screened
    const { data: existing } = await supabase
      .from("screening_results")
      .select("id, overall_status")
      .eq("order_item_id", order_item_id)
      .maybeSingle();
    if (!force && existing && existing.overall_status !== "error" && existing.overall_status !== "pending") {
      return new Response(JSON.stringify({ success: true, alreadyScreened: true, id: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    ctx = { supabase, itemId: order_item_id, userId: entRow?.orders?.user_id, orderId: entRow?.order_id ?? null, standalone };
    if (standalone) await supabase.from("order_items").update({ fulfillment_status: "processing" }).eq("id", order_item_id);

    // Load report bundle for this order_item (standalone screening has none)
    const { data: report } = await supabase
      .from("generated_reports")
      .select("id, api4all_raw_json, company_id")
      .eq("order_item_id", order_item_id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!report && !standalone) throw new Error("No generated report bundle for order_item");

    let bundle = (report?.api4all_raw_json ?? {}) as Record<string, unknown>;
    const companyId = report?.company_id ?? entRow?.company_id ?? null;
    let companyName: string | undefined;
    if (companyId) {
      const { data: c } = await supabase
        .from("companies")
        .select("name, directors_json, raw_source_json")
        .eq("id", companyId)
        .maybeSingle();
      companyName = c?.name ?? undefined;
      ctx.name = companyName;
      if (!report && c) {
        const raw = (c.raw_source_json ?? {}) as Record<string, unknown>;
        bundle = { ...raw, name: c.name, directors_json: c.directors_json ?? undefined };
      }
    }
    let entities = extractEntities(bundle ?? {});
    if (!entities.some((e) => e.role === "company") && companyName) {
      entities.unshift({ name: companyName, role: "company" });
    }
    if (companyOnly) entities = entities.filter((e) => e.role === "company").slice(0, 1);
    if (entities.length === 0) throw new Error("No entities to screen");

    let totalSanctions = 0;
    let totalPep = 0;
    let totalAdverse = 0;
    const hitsRows: Array<Record<string, unknown>> = [];
    const rawAll: Array<{ entity: Entity; response: CASearchResponse }> = [];

    for (const ent of entities) {
      try {
        const resp = await caSearch(apiKey, ent);
        rawAll.push({ entity: ent, response: resp });
        const hits = resp.content?.data?.hits ?? [];

        for (const h of hits) {
          const strength = strengthFromScore(h.score, h.match_status);
          if (strength === "weak" || h.match_status === "false_positive") continue;
          const types = categoriseHitTypes(h.doc?.types, h.doc?.sources);
          for (const t of types) {
            if (t === "sanction") totalSanctions++;
            else if (t === "pep") totalPep++;
            else if (t === "warning") totalAdverse++; // regulatory enforcement only
            hitsRows.push({
              entity_name: ent.name,
              entity_role: ent.role,
              hit_type: t,
              match_strength: strength,
              source_lists: (h.doc?.sources ?? []).filter((s) => !CRIME_NOISE.test(s)),
              share_url: null,
              raw_match: { name: h.doc?.name, types: h.doc?.types, score: h.score, match_status: h.match_status },
            });
          }
        }
      } catch (e) {
        console.error(`[complyadvantage-screen] ${ent.name}:`, e);
      }
    }

    if (rawAll.length === 0) throw new Error("Screening service did not respond for any entity");
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

    if (standalone) {
      await supabase.from("order_items").update({ fulfillment_status: "completed" }).eq("id", order_item_id);
    }
    await notify(supabase, ctx.userId, order_item_id, ctx.orderId ?? null, companyName ?? "your company", overall);

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
    if (ctx.supabase && ctx.itemId) {
      const sb = ctx.supabase;
      await sb.from("screening_results").delete().eq("order_item_id", ctx.itemId).in("overall_status", ["error", "pending"]).then(() => {}, () => {});
      await sb.from("screening_results").insert({ order_item_id: ctx.itemId, overall_status: "error", total_hits: 0, sanctions_hits: 0, pep_hits: 0, adverse_media_hits: 0, entities_screened: 0, error: message, screened_at: new Date().toISOString() }).then(() => {}, () => {});
      if (ctx.standalone) await sb.from("order_items").update({ fulfillment_status: "failed" }).eq("id", ctx.itemId);
      await notify(sb, ctx.userId, ctx.itemId, ctx.orderId ?? null, ctx.name ?? "your company", null);
    }
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
