import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Download, FileText } from 'lucide-react';
import AccountLayout from '../../components/layout/AccountLayout';
import EmptyState from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/button';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/tenant';

interface DownloadRow {
  reportId: string;
  orderId: string;
  orderRef: string | null;
  companyName: string | null;
  companyRegNo: string | null;
  productName: string | null;
  generatedAt: string | null;
  expiresAt: string | null;
  downloadToken: string | null;
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AccountDownloadsPage() {
  const { tenant } = useTenant();
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setDownloads([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_ref,
          order_items (
            id,
            products ( name ),
            companies ( name, reg_no ),
            generated_reports ( id, download_token, download_expires_at, generated_at )
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        setDownloads([]);
        setLoading(false);
        return;
      }

      const rows: DownloadRow[] = [];

      for (const order of data ?? []) {
        const orderRow = order as any;

        for (const item of orderRow.order_items ?? []) {
          for (const report of item.generated_reports ?? []) {
            rows.push({
              reportId: report.id,
              orderId: orderRow.id,
              orderRef: orderRow.order_ref ?? null,
              companyName: item.companies?.name ?? null,
              companyRegNo: item.companies?.reg_no ?? null,
              productName: item.products?.name ?? null,
              generatedAt: report.generated_at ?? null,
              expiresAt: report.download_expires_at ?? null,
              downloadToken: report.download_token ?? null,
            });
          }
        }
      }

      rows.sort((a, b) => {
        const aTime = a.generatedAt ? new Date(a.generatedAt).getTime() : 0;
        const bTime = b.generatedAt ? new Date(b.generatedAt).getTime() : 0;
        return bTime - aTime;
      });

      setDownloads(rows);
      setLoading(false);
    }

    load();
  }, []);

  const handleDownload = (token: string | null) => {
    if (!token) return;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-report?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AccountLayout>
      <Helmet>
        <title>Downloads — {tenant?.brand_name ?? 'My Account'}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-5xl">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>
          My Downloads
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Delivered reports appear here as soon as they are generated.
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div
              className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--brand-accent)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : downloads.length === 0 ? (
          <EmptyState message="No downloads available yet." />
        ) : (
          <div className="space-y-4">
            {downloads.map((download) => (
              <div
                key={download.reportId}
                className="rounded-lg border p-5 bg-background"
                style={{ borderColor: 'var(--bg-border)' }}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" style={{ color: 'var(--brand-accent)' }} />
                      <p className="font-semibold" style={{ color: 'var(--text-heading)' }}>
                        {download.productName ?? 'Report'}
                      </p>
                    </div>

                    <p className="text-sm" style={{ color: 'var(--text-body)' }}>
                      {download.companyName ?? 'Company unavailable'}
                      {download.companyRegNo ? ` · Reg: ${download.companyRegNo}` : ''}
                    </p>

                    <div className="mt-2 space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <p>Generated: {formatDateTime(download.generatedAt)}</p>
                      <p>Expires: {formatDateTime(download.expiresAt)}</p>
                      <p>Order: {download.orderRef ?? '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      onClick={() => handleDownload(download.downloadToken)}
                      className="inline-flex items-center"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>

                    <Button asChild type="button" variant="outline">
                      <Link to={`/account/orders/${download.orderId}`}>
                        View order
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
