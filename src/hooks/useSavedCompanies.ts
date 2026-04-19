import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SavedCompany {
  id: string;
  company_id: string;
  notes: string | null;
  created_at: string;
}

let cache: { userId: string | null; ids: Set<string> } | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

async function loadCache(userId: string) {
  const { data } = await supabase
    .from('saved_companies' as any)
    .select('company_id')
    .eq('user_id', userId);
  cache = {
    userId,
    ids: new Set((data ?? []).map((r: any) => r.company_id as string)),
  };
  notifyListeners();
}

export function useSavedCompanies() {
  const [userId, setUserId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [, force] = useState(0);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid && (!cache || cache.userId !== uid)) {
        loadCache(uid).then(() => {
          if (mounted) setSavedIds(new Set(cache?.ids ?? []));
        });
      } else if (cache?.userId === uid) {
        setSavedIds(new Set(cache.ids));
      }
    });

    const fn = () => {
      if (cache) setSavedIds(new Set(cache.ids));
      force((n) => n + 1);
    };
    listeners.add(fn);

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      cache = null;
      if (uid) loadCache(uid);
      else setSavedIds(new Set());
    });

    return () => {
      mounted = false;
      listeners.delete(fn);
      sub.subscription.unsubscribe();
    };
  }, []);

  const isSaved = useCallback(
    (companyId: string) => savedIds.has(companyId),
    [savedIds],
  );

  const toggleSaved = useCallback(
    async (companyId: string, tenantId?: string | null) => {
      if (!userId) {
        toast({
          title: 'Sign in to save companies',
          description: 'Bookmark companies to find them quickly later.',
        });
        return false;
      }
      const currentlySaved = cache?.ids.has(companyId) ?? false;
      if (currentlySaved) {
        const { error } = await supabase
          .from('saved_companies' as any)
          .delete()
          .eq('user_id', userId)
          .eq('company_id', companyId);
        if (error) {
          toast({ title: 'Could not remove', description: error.message, variant: 'destructive' });
          return true;
        }
        cache?.ids.delete(companyId);
        notifyListeners();
        toast({ title: 'Removed from saved companies' });
        return false;
      } else {
        const { error } = await supabase
          .from('saved_companies' as any)
          .insert({ user_id: userId, company_id: companyId, tenant_id: tenantId ?? null });
        if (error) {
          toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
          return false;
        }
        cache?.ids.add(companyId);
        notifyListeners();
        toast({ title: 'Saved to your account' });
        return true;
      }
    },
    [userId],
  );

  return { isSaved, toggleSaved, isLoggedIn: !!userId };
}
