// ============================================================
// fx-rates
// Returns daily-cached EUR-base FX rates for the supported
// display currencies. Source: exchangerate.host (free, no key).
// ============================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPPORTED = ["EUR", "GBP", "USD", "CHF", "AED"] as const;
type Currency = typeof SUPPORTED[number];

// Conservative fallback rates (1 EUR = X CCY) used if upstream fails.
// Updated: 2025-Q1 ballpark. Not for accounting — just to keep UI working.
const FALLBACK: Record<Currency, number> = {
  EUR: 1,
  GBP: 0.85,
  USD: 1.08,
  CHF: 0.96,
  AED: 3.97,
};

interface CacheEntry {
  fetchedAt: number;
  rates: Record<Currency, number>;
}

let cache: CacheEntry | null = null;
const TTL_MS = 6 * 60 * 60 * 1000; // 6h

async function fetchLive(): Promise<Record<Currency, number>> {
  const symbols = SUPPORTED.filter((c) => c !== "EUR").join(",");
  const url = `https://api.exchangerate.host/latest?base=EUR&symbols=${symbols}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fx upstream ${res.status}`);
  const json = await res.json();
  const r = (json?.rates ?? {}) as Record<string, number>;
  const out: Record<Currency, number> = { ...FALLBACK };
  for (const c of SUPPORTED) {
    if (c === "EUR") continue;
    if (typeof r[c] === "number" && r[c] > 0) out[c] = r[c];
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const now = Date.now();
    if (!cache || now - cache.fetchedAt > TTL_MS) {
      try {
        const rates = await fetchLive();
        cache = { fetchedAt: now, rates };
      } catch (e) {
        console.error("[fx-rates] upstream failed, using fallback:", e);
        cache = { fetchedAt: now, rates: FALLBACK };
      }
    }

    return new Response(
      JSON.stringify({
        base: "EUR",
        rates: cache.rates,
        fetched_at: new Date(cache.fetchedAt).toISOString(),
        supported: SUPPORTED,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ base: "EUR", rates: FALLBACK, error: message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
