import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API4ALL_BASE = 'https://v3.api4all.io/a4a/3.0/api';

async function getApi4AllToken(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: existingToken } = await supabase
    .from('api4all_tokens')
    .select('access_token, expires_at')
    .gt('expires_at', new Date(Date.now() + 5 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existingToken?.access_token) return existingToken.access_token;

  const username = Deno.env.get('API4ALL_USERNAME');
  const password = Deno.env.get('API4ALL_PASSWORD');
  const projectCode = Deno.env.get('API4ALL_PROJECT_CODE');

  const tokenRes = await fetch(`${API4ALL_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, project_code: projectCode }),
  });

  if (!tokenRes.ok) throw new Error(`API4All auth failed: ${tokenRes.status}`);

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  await serviceClient.from('api4all_tokens').insert({
    access_token: accessToken,
    expires_at: new Date(Date.now() + 55 * 60 * 1000).toISOString(),
    project_code: projectCode ?? null,
  });

  return accessToken;
}

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
      .select('id, api4all_order_id, api4all_item_code, order_id, fulfillment_status')
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
        const statusRes = await fetch(`${API4ALL_BASE}/order/id/${api4allOrderId}`, {
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
        const apiOrderStatus: string = statusData.status ?? statusData.orders?.[0]?.status ?? '';
        const apiItems: Array<{ id: number; status: string; report_url?: string }> =
          statusData.items ?? statusData.orders?.[0]?.items ?? [];

        for (const item of groupItems) {
          // Find matching item in response
          const apiItem = apiItems.find((ai) => String(ai.id) === item.api4all_item_code);
          const itemStatus = apiItem?.status ?? apiOrderStatus;

          if (itemStatus === 'Completed') {
            // Trigger fetch-report
            await supabase
              .from('order_items')
              .update({ fulfillment_status: 'completed_api' })
              .eq('id', item.id);

            // Call fetch-report function
            const fetchReportUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-report`;
            await fetch(fetchReportUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ order_item_id: item.id }),
            });

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

          } else if (itemStatus === 'Failed' || itemStatus === 'Cancelled') {
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
                attempts: supabase.rpc ? undefined : undefined, // handled below
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
