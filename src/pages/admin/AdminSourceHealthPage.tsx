import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Activity } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface HealthState {
  status: 'idle' | 'checking' | 'healthy' | 'degraded' | 'down';
  responseMs: number | null;
  lastChecked: Date | null;
  details: string;
}

interface ErrorLog {
  id: string;
  timestamp: string;
  endpoint: string;
  status: number | null;
  message: string;
}

const statusConfig = {
  idle: { color: 'text-muted-foreground', label: 'Not checked', bg: 'bg-gray-50' },
  checking: { color: 'text-blue-600', label: 'Checking…', bg: 'bg-blue-50' },
  healthy: { color: 'text-green-700', label: '✅ Healthy', bg: 'bg-green-50' },
  degraded: { color: 'text-amber-700', label: '⚠️ Degraded', bg: 'bg-amber-50' },
  down: { color: 'text-red-700', label: '❌ Down', bg: 'bg-red-50' },
};

export default function AdminSourceHealthPage() {
  const [searchHealth, setSearchHealth] = useState<HealthState>({ status: 'idle', responseMs: null, lastChecked: null, details: '' });
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);

  const testSearch = useCallback(async () => {
    setSearchHealth({ status: 'checking', responseMs: null, lastChecked: null, details: '' });
    const start = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('search-companies', {
        body: { q: 'INFOCREDIT', country: 'cy', tenant_id: 'health-check' },
      });
      const ms = Date.now() - start;
      if (error) {
        setSearchHealth({ status: 'degraded', responseMs: ms, lastChecked: new Date(), details: error.message });
      } else if (data?.results !== undefined) {
        setSearchHealth({ status: 'healthy', responseMs: ms, lastChecked: new Date(), details: `${data.results?.length ?? 0} results returned` });
      } else {
        setSearchHealth({ status: 'degraded', responseMs: ms, lastChecked: new Date(), details: 'Unexpected response shape' });
      }
    } catch (e: any) {
      setSearchHealth({ status: 'down', responseMs: null, lastChecked: new Date(), details: e.message ?? 'Unknown error' });
    }
  }, []);

  // Load recent API error logs from audit_logs
  const fetchErrorLogs = useCallback(async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('id, created_at, action, entity_type, payload')
      .like('action', '%error%')
      .order('created_at', { ascending: false })
      .limit(20);

    setErrorLogs(
      (data ?? []).map((l: any) => ({
        id: l.id,
        timestamp: l.created_at,
        endpoint: l.entity_type ?? '—',
        status: (l.payload as any)?.status ?? null,
        message: l.action,
      }))
    );
  }, []);

  useEffect(() => {
    testSearch();
    fetchErrorLogs();
  }, [testSearch, fetchErrorLogs]);

  const sh = statusConfig[searchHealth.status];

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Source Health</h1>

        {/* API4All Status Card */}
        <div className={`border rounded-xl p-6 ${sh.bg}`}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Activity className={`h-5 w-5 ${sh.color}`} />
              <div>
                <h2 className="font-semibold text-base" style={{ color: 'var(--text-heading)' }}>API4All Integration</h2>
                <p className="text-xs text-muted-foreground mt-0.5">v3.api4all.io — company search & intelligence</p>
              </div>
            </div>
            <span className={`font-semibold text-sm ${sh.color}`}>{sh.label}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5">
            <div className="bg-white/70 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Status</div>
              <div className={`font-semibold text-sm ${sh.color}`}>{sh.label}</div>
            </div>
            <div className="bg-white/70 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Response Time</div>
              <div className="font-semibold text-sm tabular-nums">
                {searchHealth.responseMs !== null ? `${searchHealth.responseMs}ms` : '—'}
              </div>
            </div>
            <div className="bg-white/70 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Last Checked</div>
              <div className="font-semibold text-sm">
                {searchHealth.lastChecked ? format(searchHealth.lastChecked, 'HH:mm:ss') : '—'}
              </div>
            </div>
          </div>

          {searchHealth.details && (
            <div className="mt-4 text-sm text-muted-foreground">
              Details: {searchHealth.details}
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={testSearch}
              disabled={searchHealth.status === 'checking'}
              className="flex items-center gap-2 text-sm px-4 py-2 border rounded-lg hover:bg-white/80 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${searchHealth.status === 'checking' ? 'animate-spin' : ''}`} />
              Test Search
            </button>
          </div>
        </div>

        {/* Error Log */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>Recent Error Log</h2>
            <button onClick={fetchErrorLogs} className="text-xs px-2.5 py-1.5 border rounded hover:bg-muted transition-colors flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          {errorLogs.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted-foreground text-sm">
              No error logs recorded
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {['Timestamp', 'Endpoint', 'Status', 'Message'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {errorLogs.map(log => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{log.endpoint}</td>
                      <td className="px-4 py-3">
                        {log.status ? (
                          <span className={`text-xs font-medium ${log.status >= 500 ? 'text-red-600' : 'text-amber-600'}`}>{log.status}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
