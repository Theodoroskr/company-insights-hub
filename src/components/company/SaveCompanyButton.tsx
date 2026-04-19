import React from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useSavedCompanies } from '@/hooks/useSavedCompanies';
import { useTenant } from '@/lib/tenant';

interface Props {
  companyId: string;
  variant?: 'icon' | 'pill' | 'full';
  className?: string;
  stopPropagation?: boolean;
}

export default function SaveCompanyButton({
  companyId,
  variant = 'pill',
  className = '',
  stopPropagation = true,
}: Props) {
  const { isSaved, toggleSaved } = useSavedCompanies();
  const { tenant } = useTenant();
  const saved = isSaved(companyId);

  const onClick = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
      e.preventDefault();
    }
    toggleSaved(companyId, tenant?.id);
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={onClick}
        title={saved ? 'Remove from saved' : 'Save company'}
        aria-label={saved ? 'Remove from saved' : 'Save company'}
        className={`p-1.5 rounded-md transition-colors hover:bg-muted ${className}`}
      >
        {saved ? (
          <BookmarkCheck className="w-4 h-4" style={{ color: 'var(--brand-accent)' }} />
        ) : (
          <Bookmark className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        )}
      </button>
    );
  }

  if (variant === 'full') {
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${className}`}
        style={{
          borderColor: saved ? 'var(--brand-accent)' : 'var(--bg-border)',
          color: saved ? 'var(--brand-accent)' : 'var(--text-body)',
          backgroundColor: saved ? 'rgba(59,130,246,0.06)' : '#fff',
        }}
      >
        {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        {saved ? 'Saved' : 'Save company'}
      </button>
    );
  }

  // pill (default)
  return (
    <button
      onClick={onClick}
      title={saved ? 'Remove from saved' : 'Save company'}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${className}`}
      style={{
        borderColor: saved ? 'var(--brand-accent)' : 'var(--bg-border)',
        color: saved ? 'var(--brand-accent)' : 'var(--text-muted)',
        backgroundColor: saved ? 'rgba(59,130,246,0.06)' : '#fff',
      }}
    >
      {saved ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
