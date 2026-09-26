import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'super_admin' | 'admin' | 'support' | 'user';

export const STAFF_ROLES: AppRole[] = ['super_admin', 'admin', 'support'];

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  support: 'Support',
  user: 'Customer',
};

/** Admin sections that can be granted per role. Keys match role_permissions.section. */
export const ADMIN_SECTIONS: { key: string; label: string; path: string }[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/admin' },
  { key: 'orders', label: 'Orders', path: '/admin/orders' },
  { key: 'fulfillment', label: 'Fulfillment', path: '/admin/fulfillment' },
  { key: 'products', label: 'Products', path: '/admin/products' },
  { key: 'customers', label: 'Customers', path: '/admin/customers' },
  { key: 'promo_codes', label: 'Promo Codes', path: '/admin/promo-codes' },
  { key: 'source_health', label: 'Source Health', path: '/admin/source-health' },
  { key: 'certificates', label: 'Certificates', path: '/admin/certificates' },
  { key: 'pricing_health', label: 'Pricing Health', path: '/admin/pricing-health' },
  { key: 'audit_logs', label: 'Audit Logs', path: '/admin/audit-logs' },
  { key: 'settings', label: 'Settings', path: '/admin/settings' },
  { key: 'tenants', label: 'Tenants', path: '/admin/tenants' },
  { key: 'roles', label: 'User Rights', path: '/admin/roles' },
];

export interface RolePermission {
  id?: string;
  role: AppRole;
  section: string;
  can_view: boolean;
  can_edit: boolean;
}

export interface Access {
  loading: boolean;
  roles: AppRole[];
  isStaff: boolean;
  isSuperAdmin: boolean;
  permissions: RolePermission[];
  can: (section: string, edit?: boolean) => boolean;
}

export async function fetchMyRoles(userId: string): Promise<AppRole[]> {
  const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId);
  return ((data ?? []) as { role: AppRole }[]).map(r => r.role);
}

export async function fetchRolePermissions(): Promise<RolePermission[]> {
  const { data } = await supabase.from('role_permissions').select('id, role, section, can_view, can_edit');
  return (data ?? []) as RolePermission[];
}

/** Current user's roles + resolved section permissions. */
export function useMyAccess(): Access {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) {
        if (!cancelled) { setRoles([]); setPermissions([]); setLoading(false); }
        return;
      }
      const [r, p] = await Promise.all([fetchMyRoles(uid), fetchRolePermissions()]);
      if (cancelled) return;
      setRoles(r);
      setPermissions(p);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const isSuperAdmin = roles.includes('super_admin');
  const isStaff = roles.some(r => STAFF_ROLES.includes(r));

  const can = (section: string, edit = false) => {
    if (isSuperAdmin) return true;
    return permissions.some(
      p => roles.includes(p.role) && p.section === section && p.can_view && (!edit || p.can_edit),
    );
  };

  return { loading, roles, isStaff, isSuperAdmin, permissions, can };
}
