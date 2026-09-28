import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API4ALL_BASE = 'https://v3.api4all.io/a4a/3.0/api';

async function getApi4AllToken(supabase: any): Promise<string> {
  const { data: existingToken } = await supabase
    .from('api4all_tokens')
    .select('access_token')
    .gt('expires_at', new Date(Date.now() + 5 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingToken?.access_token) return existingToken.access_token;

  const username = Deno.env.get('API4ALL_USERNAME') ?? '';
  const password = Deno.env.get('API4ALL_PASSWORD') ?? '';
  const projectCode = Deno.env.get('API4ALL_PROJECT_CODE') ?? '';
  // Same auth as api4all-proxy: GET /token/{project_code} with Basic auth
  const tokenRes = await fetch(`${API4ALL_BASE}/token/${encodeURIComponent(projectCode)}`, {
    headers: { Authorization: `Basic ${btoa(`${username}:${password}`)}`, Accept: 'application/json' },
  });
  if (!tokenRes.ok) throw new Error(`API4All auth failed: ${tokenRes.status} ${await tokenRes.text()}`);
  const tokenData = await tokenRes.json();
  await supabase.from('api4all_tokens').insert({
    access_token: tokenData.access_token,
    expires_at: new Date(Date.now() + ((tokenData.expires_in ?? 3600) - 300) * 1000).toISOString(),
    project_code: projectCode || null,
  });
  return tokenData.access_token;
}

/** API4ALL embeds the report as base64 of UTF-16LE JSON. */
function decodeReport(b64: string): unknown {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  let text = new TextDecoder('utf-16le').decode(bytes).replace(/^\uFEFF/, '');
  try { return JSON.parse(text); } catch {
    text = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(text);
  }
}

const DONE = new Set(['ready', 'completed', 'delivered']);
const FAILED = new Set(['failed', 'cancelled', 'canceled', 'rejected']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // Get all order items that need polling
    const { data: items, error } = await supabase
      .from('order_items')
      .select('id, api4all_order_id, api4all_item_code, order_id, company_id, fulfillment_status, products:product_id(type)')
      .in('fulfillment_status', ['submitted', 'processing'])
      .not('api4all_order_id', 'is', null);

    if (error) throw error;

    console.log(`poll-order-status: checking ${items?.length ?? 0} items`);

    if (!items?.length) {
      return new Response(
        JSON.stringify({ success: true, checked: 0, message: 'No items to poll' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = await getApi4AllToken(supabase);
    const results: Array<{ item_id: string; status: string; action: string }> = [];

    // Group by api4all_order_id to minimize API calls
    const orderGroups = new Map<string, typeof items>();
    for (const item of items) {
      if (!item.api4all_order_id) continue;
      if (!orderGroups.has(item.api4all_order_id)) {
        orderGroups.set(item.api4all_order_id, []);
      }
      orderGroups.get(item.api4all_order_id)!.push(item);
    }

    for (const [api4allOrderId, groupItems] of orderGroups) {
      try {
        const statusRes = await fetch(`${API4ALL_BASE}/orders/id/${api4allOrderId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!statusRes.ok) {
          console.error(`Failed to get status for order ${api4allOrderId}: ${statusRes.status}`);
          continue;
        }

        const statusData = await statusRes.json();
        const apiOrder = statusData.orders?.[0] ?? statusData;
        const apiOrderStatus: string = String(apiOrder?.status ?? '');
        const apiItems: Array<{ id: string | number; reference?: string; status?: string; report?: string }> =
          Array.isArray(apiOrder?.details) ? apiOrder.details : Array.isArray(apiOrder?.items) ? apiOrder.items : [];

        for (const item of groupItems) {
          const apiItem = apiItems.find((ai) => String(ai.id) === item.api4all_item_code || ai.reference === item.id);
          const itemStatus = String(apiItem?.status ?? apiOrderStatus);
          const st = itemStatus.toLowerCase();

          if (DONE.has(st)) {
            let stored = false;
            if (apiItem?.report) {
              try {
                const reportJson = decodeReport(apiItem.report);
                const { data: existing } = await supabase
                  .from('generated_reports').select('id').eq('order_item_id', item.id).maybeSingle();
                if (!existing) {
                  const { error: insErr } = await supabase.from('generated_reports').insert({
                    order_item_id: item.id,
                    company_id: (item as any).company_id ?? null,
                    report_type: (item as any).products?.type ?? 'structure',
                    api4all_raw_json: reportJson,
                    download_token: crypto.randomUUID(),
                    download_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
                    generated_at: new Date().toISOString(),
                    version: 1,
                  });
                  if (insErr) throw insErr;
                }
                await supabase.from('order_items').update({ fulfillment_status: 'completed' }).eq('id', item.id);
                stored = true;
              } catch (e) {
                console.error(`[poll] could not store embedded report for ${item.id}:`, e);
              }
            }
            if (!stored) {
              await supabase.from('order_items').update({ fulfillment_status: 'completed_api' }).eq('id', item.id);
              await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-report`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ order_item_id: item.id }),
              });
            }
            // Close the parent order when every item is done
            const { data: siblings } = await supabase
              .from('order_items').select('fulfillment_status').eq('order_id', item.order_id);
            if (siblings?.every((i: any) => ['completed', 'failed'].includes(i.fulfillment_status))) {
              const anyFail = siblings.some((i: any) => i.fulfillment_status === 'failed');
              await supabase.from('orders').update({ status: anyFail ? 'partial' : 'completed' }).eq('id', item.order_id);
            }
            // If the customer added the screening add-on, trigger ComplyAdvantage
            // (fire-and-forget — fetch-report has already saved the bundle)
            try {
              const { data: itemRow } = await supabase
                .from('order_items')
                .select('screening_addon')
                .eq('id', item.id)
                .maybeSingle();
              if (itemRow?.screening_addon) {
                fetch(
                  `${Deno.env.get('SUPABASE_URL')}/functions/v1/complyadvantage-screen`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ order_item_id: item.id }),
                  },
                ).catch((e) => console.error('[poll] screening trigger failed:', e));
              }
            } catch (e) {
              console.error('[poll] screening lookup failed:', e);
            }

            results.push({ item_id: item.id, status: itemStatus, action: 'fetch_report_triggered' });

            // Update fulfillment task
            await supabase
              .from('fulfillment_tasks')
              .update({ status: 'completed', last_attempt_at: new Date().toISOString() })
              .eq('order_item_id', item.id)
              .eq('type', 'poll_status');

          } else if (FAILED.has(st)) {
            await supabase
              .from('order_items')
              .update({ fulfillment_status: 'failed' })
              .eq('id', item.id);

            await supabase
              .from('fulfillment_tasks')
              .update({ status: 'failed', last_attempt_at: new Date().toISOString() })
              .eq('order_item_id', item.id)
              .eq('type', 'poll_status');

            results.push({ item_id: item.id, status: itemStatus, action: 'marked_failed' });

          } else {
            // Still processing — increment attempts
            await supabase
              .from('order_items')
              .update({ fulfillment_status: 'processing' })
              .eq('id', item.id)
              .eq('fulfillment_status', 'submitted');

            await supabase
              .from('fulfillment_tasks')
              .update({
                last_attempt_at: new Date().toISOString(),
              })
              .eq('order_item_id', item.id)
              .eq('type', 'poll_status');

            results.push({ item_id: item.id, status: itemStatus, action: 'still_processing' });
          }
        }
      } catch (orderErr) {
        console.error(`Error checking order ${api4allOrderId}:`, orderErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, checked: items.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('poll-order-status error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
