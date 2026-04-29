import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(JSON.stringify({ error: 'token query parameter is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role so the function can read regardless of auth state
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: report, error } = await supabase
      .from('generated_reports')
      .select(`
        id, api4all_raw_json, pdf_storage_path, download_expires_at,
        report_type, generated_at,
        order_items:order_item_id(
          id,
          companies:company_id(name, reg_no, country_code),
          products:product_id(name, type)
        )
      `)
      .eq('download_token', token)
      .single();

    if (error || !report) {
      return new Response(JSON.stringify({ error: 'Report not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiry
    if (report.download_expires_at && new Date(report.download_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          error: 'Download link has expired',
          expired_at: report.download_expires_at,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If there's a PDF in storage, redirect to it
    if (report.pdf_storage_path) {
      const { data: signedUrl } = await supabase.storage
        .from('reports')
        .createSignedUrl(report.pdf_storage_path, 3600);

      if (signedUrl?.signedUrl) {
        return Response.redirect(signedUrl.signedUrl, 302);
      }
    }

    // Otherwise return the raw JSON data
    const orderItem = report.order_items as unknown as {
      companies?: { name: string; reg_no: string | null; country_code: string } | null;
      products?: { name: string; type: string } | null;
    } | null;

    const responsePayload = {
      report_type: report.report_type,
      generated_at: report.generated_at,
      expires_at: report.download_expires_at,
      company: orderItem?.companies ?? null,
      product: orderItem?.products ?? null,
      data: report.api4all_raw_json,
    };

    return new Response(JSON.stringify(responsePayload, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=\"report-${report.id}.json\"`,
      },
    });
  } catch (err) {
    console.error('download-report error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
