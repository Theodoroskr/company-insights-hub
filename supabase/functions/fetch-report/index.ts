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

// Map product type → API4All report endpoint segment
function getReportEndpoint(productType: string): string {
  const typeMap: Record<string, string> = {
    structure: 'structure',
    kyb: 'kyb',
    credit: 'credit',
    credit_online: 'credit',
    due_diligence_report: 'kyb',
    bankruptcy: 'bankruptcy',
  };
  return typeMap[productType.toLowerCase()] ?? 'structure';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_item_id } = await req.json();
    if (!order_item_id) {
      return new Response(JSON.stringify({ error: 'order_item_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch order_item with product and company
    const { data: orderItem, error: itemErr } = await supabase
      .from('order_items')
      .select(`
        id, api4all_order_id, api4all_item_code, order_id, company_id, fulfillment_status,
        products:product_id(type, name, api4all_product_code),
        companies:company_id(icg_code, name, country_code)
      `)
      .eq('id', order_item_id)
      .single();

    if (itemErr || !orderItem) {
      return new Response(JSON.stringify({ error: 'Order item not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const product = orderItem.products as unknown as { type: string; name: string; api4all_product_code: string | null } | null;
    const company = orderItem.companies as unknown as { icg_code: string; name: string; country_code: string } | null;

    if (!product || !company) {
      return new Response(JSON.stringify({ error: 'Product or company data missing' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = await getApi4AllToken(supabase);
    const reportEndpoint = getReportEndpoint(product.type);

    // Fetch report from API4All
    const reportUrl = `${API4ALL_BASE}/report/${reportEndpoint}/code/${encodeURIComponent(company.icg_code)}`;
    console.log(`Fetching report from: ${reportUrl}`);

    const reportRes = await fetch(reportUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!reportRes.ok) {
      const errText = await reportRes.text();
      console.error(`Report fetch failed (${reportRes.status}):`, errText);
      return new Response(
        JSON.stringify({ error: 'Report fetch failed', status: reportRes.status, details: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reportData = await reportRes.json();

    // Store in generated_reports
    const downloadToken = crypto.randomUUID();
    const downloadExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: generatedReport, error: insertErr } = await supabase
      .from('generated_reports')
      .insert({
        order_item_id: order_item_id,
        company_id: orderItem.companies ? (orderItem as unknown as { company_id: string }).company_id : null,
        report_type: product.type,
        api4all_raw_json: reportData,
        download_token: downloadToken,
        download_expires_at: downloadExpiresAt,
        generated_at: new Date().toISOString(),
        version: 1,
      })
      .select()
      .single();

    if (insertErr) {
      console.error('Failed to store report:', insertErr);
      return new Response(JSON.stringify({ error: 'Failed to store report', details: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update order_item fulfillment_status to completed
    await supabase
      .from('order_items')
      .update({ fulfillment_status: 'completed' })
      .eq('id', order_item_id);

    // Check if all items in the order are completed → update order status
    const { data: allItems } = await supabase
      .from('order_items')
      .select('fulfillment_status')
      .eq('order_id', orderItem.order_id);

    const allCompleted = allItems?.every(
      (i) => i.fulfillment_status === 'completed' || i.fulfillment_status === 'failed'
    );

    if (allCompleted) {
      const hasFailure = allItems?.some((i) => i.fulfillment_status === 'failed');
      await supabase
        .from('orders')
        .update({ status: hasFailure ? 'partial' : 'completed' })
        .eq('id', orderItem.order_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        report_id: generatedReport.id,
        download_token: downloadToken,
        expires_at: downloadExpiresAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('fetch-report error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
