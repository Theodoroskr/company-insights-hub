import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/** Asks the supplier right now whether this report is ready; reloads when it is. */
export default function CheckNowButton({ orderItemId }: { orderItemId: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'waiting'>('idle');

  const run = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setState('busy');
    const { data } = await supabase.functions.invoke('poll-order-status', { body: { order_item_id: orderItemId } });
    const done = (data?.results ?? []).some((r: any) => r.action === 'fetch_report_triggered' || r.action === 'marked_failed');
    if (done) window.location.reload();
    else setState('waiting');
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={state === 'busy'}
      className="ml-2 inline-flex items-center gap-1 text-xs underline disabled:opacity-60"
      style={{ color: 'var(--brand-accent)' }}
    >
      <RefreshCw className={`w-3 h-3 ${state === 'busy' ? 'animate-spin' : ''}`} />
      {state === 'waiting' ? 'Not ready yet' : 'Check now'}
    </button>
  );
}
