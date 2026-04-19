import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Bookmark, Trash2, ExternalLink } from 'lucide-react';
import AccountLayout from '../../components/layout/AccountLayout';
import EmptyState from '../../components/ui/EmptyState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SavedRow {
  id: string;
  company_id: string;
  notes: string | null;
  created_at: string;
  company: {
    id: string;
    name: string;
    slug: string | null;
    reg_no: string | null;
    country_code: string;
    legal_form: string | null;
    status: string | null;
  } | null;
}

export default function AccountSavedPage() {
  const [rows, setRows] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('saved_companies' as any)
      .select('id, company_id, notes, created_at, companies:company_id (id, name, slug, reg_no, country_code, legal_form, status)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setRows(
      ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        company_id: r.company_id,
        notes: r.notes,
        created_at: r.created_at,
        company: r.companies ?? null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const removeRow = async (id: string) => {
    const { error } = await supabase.from('saved_companies' as any).delete().eq('id', id);
    if (error) {
      toast({ title: 'Could not remove', description: error.message, variant: 'destructive' });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast({ title: 'Removed from saved companies' });
  };

  return (
    <AccountLayout>
      <Helmet>
        <title>Saved Companies · My Account</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
            <Bookmark className="w-5 h-5" />
            Saved Companies
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Companies you've bookmarked from search results and profiles for quick access.
          </p>
        </div>

        {loading ? (
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-lg border p-8" style={{ borderColor: 'var(--bg-border)' }}>
            <EmptyState message="No saved companies yet" />
            <div className="text-center mt-4">
              <Link
                to="/company/search"
                className="inline-block px-4 py-2 rounded text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--brand-accent)' }}
              >
                Browse companies
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="bg-white rounded-lg border p-4 flex items-start justify-between gap-4"
                style={{ borderColor: 'var(--bg-border)' }}
              >
                <div className="flex-1 min-w-0">
                  {row.company ? (
                    <Link
                      to={`/company/${row.company.slug ?? row.company.id}`}
                      className="text-base font-semibold hover:underline"
                      style={{ color: 'var(--text-heading)' }}
                    >
                      {row.company.name}
                    </Link>
                  ) : (
                    <span className="text-base font-semibold" style={{ color: 'var(--text-muted)' }}>
                      (Company unavailable)
                    </span>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {row.company?.country_code && <span>{row.company.country_code}</span>}
                    {row.company?.reg_no && (
                      <>
                        <span>·</span>
                        <span>Reg: {row.company.reg_no}</span>
                      </>
                    )}
                    {row.company?.legal_form && (
                      <>
                        <span>·</span>
                        <span>{row.company.legal_form}</span>
                      </>
                    )}
                    {row.company?.status && (
                      <>
                        <span>·</span>
                        <span>{row.company.status}</span>
                      </>
                    )}
                  </div>
                  <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Saved {new Date(row.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {row.company && (
                    <Link
                      to={`/company/${row.company.slug ?? row.company.id}`}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded border hover:bg-muted transition-colors"
                      style={{ borderColor: 'var(--brand-accent)', color: 'var(--brand-accent)' }}
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                  <button
                    onClick={() => removeRow(row.id)}
                    className="p-1.5 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
