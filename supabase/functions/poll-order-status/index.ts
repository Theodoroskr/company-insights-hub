import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API4ALL_BASE = 'https://v3.api4all.io/a4a/3.0/api';

async function getApi4AllToken(_supabase: any): Promise<string> {
  // Always mint a fresh token per run (issuing a new token can invalidate older
  // ones, so a shared DB cache goes stale). Same auth as api4all-proxy.
  const clientId = Deno.env.get('API4ALL_CLIENT_ID') ?? 'F25Y0RU2M5';
  const username = Deno.env.get('API4ALL_USERNAME') ?? '';
  const password = Deno.env.get('API4ALL_PASSWORD') ?? '';
  const tokenRes = await fetch(`${API4ALL_BASE}/token/${clientId}`, {
    headers: { Authorization: `Basic ${btoa(`${username}:${password}`)}`, Accept: 'application/json' },
  });
  if (!tokenRes.ok) throw new Error(`API4All auth failed: ${tokenRes.status} ${await tokenRes.text()}`);
  const tokenData = await tokenRes.json();
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

// Fast follow-up after submission: wait DELAYS[attempt] seconds before hop attempt+1.
// ~30s, 1m, 2m, 3.5m, 5m, 6.5m, 8m, 9.5m — then the 15-min cron takes over.
const DELAYS = [30, 30, 60, 90, 90, 90, 90, 90];
const MAX_ATTEMPTS = DELAYS.length;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

/** Schedule the next targeted check (only for internal chains with budget left). */
function scheduleNext(orderItemId: string, attempt: number) {
  if (attempt < 1 || attempt >= MAX_ATTEMPTS) return;
  const delay = DELAYS[attempt] * 1000;
  const p = new Promise<void>((resolve) => setTimeout(resolve, delay)).then(() =>
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/poll-order-status`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_item_id: orderItemId, attempt: attempt + 1 }),
    }).then((r) => r.body?.cancel()).catch((e) => console.error('[poll] next hop failed:', e))
  );
  // @ts-ignore EdgeRuntime is provided by the Supabase runtime
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(p);
}

/** Notify the customer: in-app notification always; email best-effort. */
async function notifyCustomer(
  supabase: any,
  userId: string,
  opts: { orderItemId: string; orderId: string | null; companyName: string; productName: string; failed: boolean }
) {
  try {
    const kind = opts.failed ? 'report_failed' : 'report_ready';
    const title = opts.failed
      ? `Issue with your ${opts.productName} — ${opts.companyName}`
      : `${opts.productName} ready — ${opts.companyName}`;
    const body = opts.failed
      ? 'We could not complete this report automatically. Our team has been notified and will follow up.'
      : 'Your report is ready to view and download.';
    const { data: existing } = await supabase
      .from('notifications').select('id').eq('order_item_id', opts.orderItemId).eq('kind', kind).maybeSingle();
    if (existing) return;
    await supabase.from('notifications').insert({
      user_id: userId,
      order_id: opts.orderId,
      order_item_id: opts.orderItemId,
      kind,
      title,
      body,
      link: '/account/orders',
    });
    // App email is best-effort: the template/infrastructure may not be set up yet.
    try {
      const { data: prof } = await supabase.from('profiles').select('email, full_name').eq('id', userId).maybeSingle();
      if (prof?.email) {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templateName: 'report-ready',
            recipientEmail: prof.email,
            idempotencyKey: `report-${opts.orderItemId}-${opts.failed ? 'failed' : 'ready'}`,
            templateData: {
              name: prof.full_name || undefined,
              companyName: opts.companyName,
              productName: opts.productName,
              status: opts.failed ? 'failed' : 'ready',
            },
          }),
        });
      }
    } catch (e) {
      console.error('[poll] notification email skipped:', e);
    }
  } catch (e) {
    console.error('[poll] notifyCustomer failed:', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Optional targeted mode: { order_item_id, attempt? }
  let targetId: string | null = null;
  let attempt = 0;
  try {
    const body = req.method === 'POST' ? await req.json() : {};
    if (typeof body?.order_item_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.order_item_id)) targetId = body.order_item_id;
    if (Number.isInteger(body?.attempt)) attempt = Math.max(0, Math.min(body.attempt, MAX_ATTEMPTS));
  } catch { /* no body = scheduled scan */ }

  if (!targetId) {
    // Full scan is for the scheduler/backend or staff only
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const cronSecret = req.headers.get('x-cron-secret') ?? '';
    const { data: cronOk } = cronSecret ? await supabase.rpc('check_cron_secret', { _s: cronSecret }) : { data: false };
    if (token !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') && cronOk !== true) {
      const { data: u } = token ? await supabase.auth.getUser(token) : { data: null };
      const uid = u?.user?.id;
      const { data: staff } = uid ? await supabase.rpc('is_staff', { _user_id: uid }) : { data: false };
      if (!staff) return json({ error: 'Unauthorized' }, 401);
    }
  }

  if (targetId) {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const isService = token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!isService) {
      attempt = 0; // only internal calls may chain
      const { data: u } = await supabase.auth.getUser(token);
      const uid = u?.user?.id;
      if (!uid) return json({ error: 'Unauthorized' }, 401);
      const { data: row } = await supabase.from('order_items').select('orders:order_id(user_id)').eq('id', targetId).maybeSingle();
      const { data: staff } = await supabase.rpc('is_staff', { _user_id: uid });
      if ((row as any)?.orders?.user_id !== uid && !staff) return json({ error: 'Forbidden' }, 403);
    }
    // Single-flight: skip if this item was checked in the last 20s
    const { data: task } = await supabase.from('fulfillment_tasks').select('last_attempt_at')
      .eq('order_item_id', targetId).eq('type', 'poll_status').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (task?.last_attempt_at && Date.now() - new Date(task.last_attempt_at).getTime() < 20000) {
      scheduleNext(targetId, attempt);
      return json({ success: true, skipped: 'recently_checked' });
    }
  }

  try {
    // Safety net: paid standalone AML screening with no result after 5 minutes (one retry per run, errors excluded)
    if (!targetId) try {
      const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: scr } = await supabase
        .from('order_items')
        .select('id, fulfillment_status, products:product_id!inner(slug), orders:order_id!inner(status), screening_results(id)')
        .in('products.slug', ['company-aml-screening', 'aml-screening-with-directors'])
        .in('orders.status', ['paid', 'processing'])
        .in('fulfillment_status', ['pending', 'processing'])
        .lt('created_at', cutoff)
        .limit(20);
      const todo = (scr ?? []).filter((r: any) => !(r.screening_results ?? []).length);
      for (const r of todo) {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/complyadvantage-screen`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_item_id: r.id }),
        }).catch((e) => console.error('screening sweep', e));
      }
      if (todo.length) console.log(`poll-order-status: started ${todo.length} pending screenings`);
    } catch (e) { console.error('screening sweep error', e); }

    // Get all order items that need polling
    let q = supabase
      .from('order_items')
      .select('id, api4all_order_id, api4all_item_code, order_id, company_id, fulfillment_status, products:product_id(type, name), orders:order_id(user_id, order_ref), companies:company_id(name)')
      .in('fulfillment_status', ['submitted', 'processing'])
      .not('api4all_order_id', 'is', null);
    if (targetId) q = q.eq('id', targetId);
    const { data: items, error } = await q;

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
          const body = await statusRes.text();
          console.error(`Failed to get status for order ${api4allOrderId}: ${statusRes.status} ${body}`);
          for (const it of groupItems) results.push({ item_id: it.id, status: `http_${statusRes.status}`, action: body.slice(0, 200) });
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

            // Notify the customer: in-app + email
            await notifyCustomer(supabase, (item as any).orders?.user_id, {
              orderItemId: item.id,
              orderId: item.order_id,
              companyName: (item as any).companies?.name ?? 'your company',
              productName: (item as any).products?.name ?? 'Report',
              failed: false,
            });

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

            // Notify the customer: in-app + email
            await notifyCustomer(supabase, (item as any).orders?.user_id, {
              orderItemId: item.id,
              orderId: item.order_id,
              companyName: (item as any).companies?.name ?? 'your company',
              productName: (item as any).products?.name ?? 'Report',
              failed: true,
            });

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
        results.push({ item_id: api4allOrderId, status: 'error', action: String(orderErr).slice(0, 200) });
      }
    }

    if (targetId && !results.some((r) => r.action === 'fetch_report_triggered' || r.action === 'marked_failed')) {
      scheduleNext(targetId, attempt);
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
