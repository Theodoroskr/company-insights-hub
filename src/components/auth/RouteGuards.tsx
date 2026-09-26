import React, { useEffect, useState, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { fetchMyRoles, fetchRolePermissions, STAFF_ROLES } from '@/lib/permissions';
import type { Session } from '@supabase/supabase-js';

// ── ProtectedRoute ─────────────────────────────────────────

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null; // loading
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

// ── AdminRoute ─────────────────────────────────────────────

interface AdminRouteProps {
  children: ReactNode;
  /** Section key from ADMIN_SECTIONS; when set, staff need view rights on it. */
  section?: string;
}

export function AdminRoute({ children, section }: AdminRouteProps) {
  const location = useLocation();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      const uid = data.session?.user?.id;
      if (uid) {
        const [roles, perms] = await Promise.all([fetchMyRoles(uid), fetchRolePermissions()]);
        const isSuper = roles.includes('super_admin');
        const isStaff = roles.some(r => STAFF_ROLES.includes(r));
        if (isSuper) setAllowed(true);
        else if (!isStaff) setAllowed(false);
        else if (!section) setAllowed(true);
        else setAllowed(perms.some(p => roles.includes(p.role) && p.section === section && p.can_view));
      }
      setLoading(false);
    }
    check();
  }, [section]);

  if (loading) return null;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
}

