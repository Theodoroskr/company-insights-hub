import { Link } from 'react-router-dom';
import { CheckCircle2, Clock } from 'lucide-react';

export interface PurchaseInfo {
  orderId: string;
  orderRef: string | null;
  purchasedAt: string;
  accessUntil: string;
  expired: boolean;
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function PurchaseStatusBanner({ info, onReorder }: { info: PurchaseInfo; onReorder: () => void }) {
  return (
    <div
      className="print:hidden flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm"
      style={{
        borderColor: 'color-mix(in srgb, var(--brand-accent) 30%, transparent)',
        background: 'color-mix(in srgb, var(--brand-accent) 6%, transparent)',
        color: 'var(--text-heading)',
      }}
    >
      <span className="inline-flex items-center gap-2">
        {info.expired ? (
          <Clock className="w-4 h-4" style={{ color: 'var(--brand-accent)' }} />
        ) : (
          <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--brand-accent)' }} />
        )}
        {info.expired ? (
          <>Your report from {fmt(info.purchasedAt)} has expired — company data may have changed.</>
        ) : (
          <>
            You bought this report on {fmt(info.purchasedAt)}
            {info.orderRef ? ` · Order ${info.orderRef}` : ''} · Access until {fmt(info.accessUntil)}
          </>
        )}
      </span>
      {info.expired ? (
        <button
          type="button"
          onClick={onReorder}
          className="px-3 py-1 rounded-md font-semibold"
          style={{ background: 'var(--brand-accent)', color: 'var(--bg-surface, #fff)' }}
        >
          Order updated report
        </button>
      ) : (
        <Link to={`/account/orders/${info.orderId}`} className="font-semibold" style={{ color: 'var(--brand-accent)' }}>
          View order →
        </Link>
      )}
    </div>
  );
}
