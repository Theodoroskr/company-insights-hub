import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Wording mirrors src/lib/reportDisclaimer.tsx — keep both in sync.
const FALLBACK_BRAND = 'Infocredit World';

function buildReportDisclaimerBody(brandName?: string | null): string {
  const brand = brandName?.trim() || FALLBACK_BRAND;
  const year = new Date().getFullYear();
  return [
    `This report was produced by ${brand}, an independent digital service operated by Infocredit Group Ltd, a company registered in the Republic of Cyprus under registration number HE4404.`,
    'The information contained in this report has been compiled from publicly available registry data and other third-party sources believed to be reliable; however, Infocredit Group Ltd makes no representation or warranty, express or implied, as to the accuracy, completeness, timeliness or fitness for any particular purpose of such information.',
    'This report does not constitute legal, financial or professional advice and must not be relied upon as such.',
    `© ${year} Infocredit Group Ltd. All rights reserved. Unauthorised reproduction, distribution or resale of this report is prohibited.`,
  ].join(' ');
}

function sanitizeFilename(input: string): string {
  const cleaned = input
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return cleaned || 'report';
}

/** Appends a final disclaimer page to a stored report PDF and returns the merged bytes. */
async function appendDisclaimerPage(pdfBytes: Uint8Array, disclaimer: string): Promise<Uint8Array> {
  const existing = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Original report content first; the disclaimer page is appended at the end.
  const originalPages = await doc.copyPages(existing, existing.getPageIndices());
  originalPages.forEach((p) => doc.addPage(p));

  const page = doc.addPage([595.28, 841.89]);
  const margin = 56;
  const maxWidth = page.getWidth() - margin * 2;
  let y = 140;

  page.drawText('Disclaimer', { x: margin, y, size: 14, font: bold, color: rgb(0.1, 0.1, 0.15) });
  y -= 30;

  const wrap = (text: string, size: number): string[] => {
    const lines: string[] = [];
    for (const paragraph of text.split('\n')) {
      let line = '';
      for (const word of paragraph.split(' ')) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
          if (line) lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) lines.push(line);
      lines.push('');
    }
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines;
  };

  for (const line of wrap(disclaimer, 9.5)) {
    if (line === '') {
      y -= 8;
      continue;
    }
    page.drawText(line, { x: margin, y, size: 9.5, font, color: rgb(0.2, 0.2, 0.25) });
    y -= 14;
  }

  const merged = await doc.copyPages(existing, existing.getPageIndices());
  merged.forEach((p) => doc.addPage(p));

  return doc.save();
}

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
          orders:order_id(order_ref),
          companies:company_id(name, reg_no, country_code, tenant_id),
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

    const orderItem = report.order_items as unknown as {
      orders?: { order_ref: string | null } | null;
      companies?: { name: string; reg_no: string | null; country_code: string; tenant_id: string | null } | null;
      products?: { name: string; type: string } | null;
    } | null;

    let brandName: string | null = null;
    if (orderItem?.companies?.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('brand_name')
        .eq('id', orderItem.companies.tenant_id)
        .maybeSingle();
      brandName = tenant?.brand_name ?? null;
    }

    const generatedAt = report.generated_at ?? null;
    const orderRef = orderItem?.orders?.order_ref ?? null;
    const disclaimer = buildReportDisclaimerBody(brandName);
    const metaParts: string[] = [];
    if (generatedAt) metaParts.push(`Generated: ${new Date(generatedAt).toLocaleDateString('en-GB')}`);
    if (orderRef) metaParts.push(`Order: ${orderRef}`);

    // If there's a PDF in storage, append the disclaimer page and serve the merged file
    if (report.pdf_storage_path) {
      const { data: signedUrl } = await supabase.storage
        .from('reports')
        .createSignedUrl(report.pdf_storage_path, 3600);

      if (signedUrl?.signedUrl) {
        try {
          const pdfRes = await fetch(signedUrl.signedUrl);
          if (pdfRes.ok) {
            const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
            const fullText = metaParts.length ? `${disclaimer}\n\n${metaParts.join('  ·  ')}` : disclaimer;
            const mergedBytes = await appendDisclaimerPage(pdfBytes, fullText);
            const base = [orderItem?.companies?.name, orderItem?.products?.name]
              .filter(Boolean)
              .map((s) => sanitizeFilename(String(s)))
              .join('-') || `report-${report.id}`;
            return new Response(mergedBytes, {
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${base}.pdf"`,
              },
            });
          }
        } catch (pdfErr) {
          console.error('Failed to append disclaimer page, falling back to redirect:', pdfErr);
        }
        // Fallback: serve the stored PDF untouched
        return Response.redirect(signedUrl.signedUrl, 302);
      }
    }

    // Otherwise return the raw JSON data
    const responsePayload = {
      report_type: report.report_type,
      generated_at: generatedAt,
      expires_at: report.download_expires_at,
      company: orderItem?.companies ?? null,
      product: orderItem?.products ?? null,
      disclaimer: metaParts.length ? `${disclaimer}\n\n${metaParts.join(' · ')}` : disclaimer,
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
