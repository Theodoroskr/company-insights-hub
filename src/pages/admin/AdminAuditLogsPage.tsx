import React, { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  user_id: string | null;
  payload: any;
  created_at: string;
  user_email?: string;
}

function JsonCell({ data }: { data: any }) {
  const [open, setOpen] = useState(false);
  if (!data) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        View
      </button>
      {open && (
        <pre className="mt-1 p-2 bg-muted/50 rounded text-xs overflow-auto max-h-32 font-mono">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, user_id, payload, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (entityFilter) q = q.eq('entity_type', entityFilter);

    const { data } = await q;
    setLogs((data ?? []) as AuditLog[]);
    setLoading(false);
  }, [entityFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(s) ||
      (l.entity_type ?? '').toLowerCase().includes(s) ||
      (l.entity_id ?? '').toLowerCase().includes(s)
    );
  });

  const entityTypes = Array.from(new Set(logs.map(l => l.entity_type).filter(Boolean))) as string[];

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Audit Logs</h1>
          <button onClick={fetchLogs} className="flex items-center gap-2 text-sm px-3 py-1.5 border rounded-lg hover:bg-muted transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search action, entity…"
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All entities</option>
            {entityTypes.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No audit logs found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'User', 'Payload'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(log => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors align-top">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d HH:mm:ss')}
                      </td>
                      <td className="px-4 py-3 font-medium text-xs">{log.action}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{log.entity_type ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-28 truncate">{log.entity_id ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-28 truncate">{log.user_id?.slice(0, 8) ?? '—'}</td>
                      <td className="px-4 py-3"><JsonCell data={log.payload} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 py-3 border-t text-xs text-muted-foreground">
            Showing {filtered.length} of {logs.length} entries
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
