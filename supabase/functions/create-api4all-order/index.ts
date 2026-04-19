import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API4ALL_BASE = 'https://v3.api4all.io/a4a/3.0/api';

async function getApi4AllToken(supabase: ReturnType<typeof createClient>): Promise<string> {
  // Try to get a valid cached token
  const { data: existingToken } = await supabase
    .from('api4all_tokens')
    .select('access_token, expires_at')
    .gt('expires_at', new Date(Date.now() + 5 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existingToken?.access_token) {
    return existingToken.access_token;
  }

  // Fetch a new token
  const username = Deno.env.get('API4ALL_USERNAME');
  const password = Deno.env.get('API4ALL_PASSWORD');
  const projectCode = Deno.env.get('API4ALL_PROJECT_CODE');

  if (!username || !password) {
    throw new Error('API4ALL credentials not configured');
  }

  const clientId = projectCode || 'F25Y0RU2M5';
  const credentials = btoa(`${username}:${password}`);
  const tokenRes = await fetch(`${API4ALL_BASE}/token/${clientId}`, {
    method: 'GET',
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!tokenRes.ok) {
    throw new Error(`API4All auth failed: ${tokenRes.status}`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  const expiresAt = new Date(Date.now() + 55 * 60 * 1000).toISOString();

  // Store new token (use service role to bypass RLS)
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  await serviceClient.from('api4all_tokens').insert({
    access_token: accessToken,
    expires_at: expiresAt,
    project_code: projectCode ?? null,
  });

  return accessToken;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to read all data
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch order + items + products + companies
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_ref, status')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: orderItems, error: itemsErr } = await supabase
      .from('order_items')
      .select(`
        id, speed, fresh_investigation,
        products:product_id(api4all_product_code, type),
        companies:company_id(icg_code, name)
      `)
      .eq('order_id', order_id);

    if (itemsErr) {
      console.error('Failed to fetch order items:', itemsErr);
      return new Response(JSON.stringify({ error: 'Failed to fetch order items', details: itemsErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!orderItems?.length) {
      // Nothing to submit (e.g. UK-only order, manual services, or items inserted later)
      return new Response(
        JSON.stringify({ success: true, message: 'No order items to submit', submitted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = await getApi4AllToken(supabase);

    // Build API4All order payload
    const api4allItems = orderItems
      .filter((item) => {
        const product = item.products as { api4all_product_code?: string | null } | null;
        return product?.api4all_product_code;
      })
      .map((item) => {
        const product = item.products as { api4all_product_code: string; type: string };
        const company = item.companies as { icg_code: string; name: string };
        return {
          code: company.icg_code,
          reference: item.id,
          language: 'EN',
          product: product.api4all_product_code,
          format: 'JSON',
          speed: (item.speed as string) === 'Urgent' ? 'Urgent' : 'Normal',
          freshinvestigation: item.fresh_investigation ? 1 : 0,
          comments: '',
        };
      });

    if (!api4allItems.length) {
      // No API4All products in this order (e.g. manual services)
      return new Response(
        JSON.stringify({ success: true, message: 'No API4All items to submit', submitted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderPayload = {
      reference: order.order_ref,
      items: api4allItems,
    };

    const api4allRes = await fetch(`${API4ALL_BASE}/orders/create/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Expires': '0',
      },
      body: JSON.stringify(orderPayload),
    });

    if (!api4allRes.ok) {
      const errText = await api4allRes.text();
      console.error('API4All order creation failed:', errText);
      return new Response(
        JSON.stringify({ error: 'API4All order submission failed', details: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const api4allOrder = await api4allRes.json();
    console.log('API4All order created:', JSON.stringify(api4allOrder));

    // Map returned item codes back to our order_item ids
    const returnedItems: Array<{ id: number; reference: string; status: string; sla_deadline: string | null }> =
      api4allOrder.items ?? [];

    // Update each order_item with the API4All ids
    await Promise.all(
      returnedItems.map(async (apiItem) => {
        const ourItemId = apiItem.reference;
        await supabase
          .from('order_items')
          .update({
            api4all_order_id: String(api4allOrder.id ?? ''),
            api4all_item_code: String(apiItem.id),
            fulfillment_status: 'submitted',
            sla_deadline: apiItem.sla_deadline ?? null,
          })
          .eq('id', ourItemId);

        // Create fulfillment task for polling
        await supabase.from('fulfillment_tasks').insert({
          order_item_id: ourItemId,
          type: 'poll_status',
          status: 'pending',
        });
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        api4all_order_id: api4allOrder.id,
        submitted: returnedItems.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('create-api4all-order error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
