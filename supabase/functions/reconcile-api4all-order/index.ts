import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API4ALL_BASE = 'https://v3.api4all.io/a4a/3.0/api';

async function getApi4AllToken(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: existing } = await supabase
    .from('api4all_tokens')
    .select('access_token, expires_at')
    .gt('expires_at', new Date(Date.now() + 5 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (existing?.access_token) return existing.access_token as string;

  const username = Deno.env.get('API4ALL_USERNAME');
  const password = Deno.env.get('API4ALL_PASSWORD');
  const projectCode = Deno.env.get('API4ALL_PROJECT_CODE') || 'F25Y0RU2M5';
  if (!username || !password) throw new Error('API4ALL credentials not configured');

  const credentials = btoa(`${username}:${password}`);
  const tokenRes = await fetch(`${API4ALL_BASE}/token/${projectCode}`, {
    method: 'GET',
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!tokenRes.ok) throw new Error(`API4All auth failed: ${tokenRes.status}`);
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token as string;
  const expiresAt = new Date(Date.now() + 55 * 60 * 1000).toISOString();
  await supabase.from('api4all_tokens').insert({
    access_token: accessToken,
    expires_at: expiresAt,
    project_code: projectCode,
  });
  return accessToken;
}

function fmtDate(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: profile } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (!profile || !['admin', 'super_admin'].includes(profile.role as string)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Load order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_ref, created_at, order_items(id, api4all_order_id)')
      .eq('id', order_id)
      .maybeSingle();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const items = (order.order_items as any[]) ?? [];
    const unlinked = items.filter((i) => !i.api4all_order_id);
    if (unlinked.length === 0) {
      return new Response(
        JSON.stringify({ matched: false, reason: 'All items already linked', linked_count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const token = await getApi4AllToken(supabase);

    // Query API4ALL orders over a window around the order creation date (±2 days)
    const created = new Date(order.created_at as string);
    const from = new Date(created.getTime() - 2 * 24 * 60 * 60 * 1000);
    const to = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const url = `${API4ALL_BASE}/orders/period/${fmtDate(from)}-${fmtDate(to)}`;

    const listRes = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const rawBody = await listRes.text();
    let listJson: any = null;
    try { listJson = JSON.parse(rawBody); } catch { /* ignore */ }

    if (!listRes.ok || !listJson) {
      return new Response(
        JSON.stringify({
          matched: false,
          error: 'API4ALL list endpoint returned non-JSON or error',
          status: listRes.status,
          body_preview: rawBody.slice(0, 300),
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const ordersList: any[] = Array.isArray(listJson?.orders)
      ? listJson.orders
      : Array.isArray(listJson)
        ? listJson
        : [];

    const match = ordersList.find(
      (o) => String(o.reference ?? o.client_reference ?? '').trim() === String(order.order_ref).trim(),
    );

    if (!match) {
      return new Response(
        JSON.stringify({
          matched: false,
          reason: 'No API4ALL order found with this reference',
          searched_window: `${fmtDate(from)} to ${fmtDate(to)}`,
          orders_scanned: ordersList.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const matchItems: any[] = Array.isArray(match.items) ? match.items : [];
    let linked = 0;
    for (let i = 0; i < unlinked.length; i++) {
      const localItem = unlinked[i];
      const remoteItem = matchItems[i] ?? matchItems[0];
      const updates: any = {
        api4all_order_id: String(match.id ?? match.order_id ?? ''),
        fulfillment_status: 'submitted',
      };
      if (remoteItem?.code || remoteItem?.item_code) {
        updates.api4all_item_code = String(remoteItem.code ?? remoteItem.item_code);
      }
      const { error: upErr } = await supabase
        .from('order_items')
        .update(updates)
        .eq('id', localItem.id);
      if (!upErr) linked++;
    }

    // Audit
    await supabase.from('audit_logs').insert({
      action: 'reconcile_api4all',
      entity_type: 'order',
      entity_id: order.id,
      user_id: userData.user.id,
      payload: {
        order_ref: order.order_ref,
        api4all_order_id: match.id ?? match.order_id ?? null,
        linked_count: linked,
      },
    });

    return new Response(
      JSON.stringify({
        matched: true,
        api4all_order_id: match.id ?? match.order_id ?? null,
        linked_count: linked,
        total_unlinked: unlinked.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('reconcile-api4all-order error', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
