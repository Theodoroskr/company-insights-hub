import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import {
  ADMIN_SECTIONS,
  ROLE_LABELS,
  STAFF_ROLES,
  useMyAccess,
  type AppRole,
  type RolePermission,
} from '@/lib/permissions';
import { Shield, Check, Loader2 } from 'lucide-react';

interface StaffMember {
  id: string;
  email: string | null;
  full_name: string | null;
  roles: AppRole[];
}

const EDITABLE_ROLES: AppRole[] = ['admin', 'support'];

export default function AdminRolesPage() {
  const { isSuperAdmin, loading: accessLoading } = useMyAccess();
  const [perms, setPerms] = useState<RolePermission[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: roleRows }, { data: profiles }] = await Promise.all([
      supabase.from('role_permissions').select('id, role, section, can_view, can_edit'),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('profiles').select('id, email, full_name'),
    ]);
    setPerms((p ?? []) as RolePermission[]);
    const byUser = new Map<string, AppRole[]>();
    ((roleRows ?? []) as { user_id: string; role: AppRole }[]).forEach(r => {
      byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role]);
    });
    const list = ((profiles ?? []) as { id: string; email: string | null; full_name: string | null }[])
      .map(pr => ({ ...pr, roles: byUser.get(pr.id) ?? [] }))
      .filter(pr => pr.roles.some(r => STAFF_ROLES.includes(r)))
      .sort((a, b) => (a.email ?? '').localeCompare(b.email ?? ''));
    setStaff(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getPerm = (role: AppRole, section: string) =>
    perms.find(p => p.role === role && p.section === section);

  const toggle = async (role: AppRole, section: string, field: 'can_view' | 'can_edit') => {
    if (!isSuperAdmin) return;
    const existing = getPerm(role, section);
    const next: RolePermission = existing
      ? { ...existing, [field]: !existing[field] }
      : { role, section, can_view: field === 'can_view', can_edit: field === 'can_edit' };
    // editing implies viewing
    if (field === 'can_edit' && next.can_edit) next.can_view = true;
    if (field === 'can_view' && !next.can_view) next.can_edit = false;

    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from('role_permissions')
      .upsert(
        { role: next.role, section: next.section, can_view: next.can_view, can_edit: next.can_edit },
        { onConflict: 'role,section' },
      );
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setPerms(prev => {
      const others = prev.filter(p => !(p.role === role && p.section === section));
      return [...others, { ...next, id: existing?.id }];
    });
    setMessage('Saved');
  };

  const setStaffRole = async (member: StaffMember, role: AppRole | 'none') => {
    if (!isSuperAdmin) return;
    setSaving(true);
    setMessage(null);
    await supabase.from('user_roles').delete().eq('user_id', member.id);
    if (role !== 'none') {
      const { error } = await supabase.from('user_roles').insert({ user_id: member.id, role });
      if (error) { setSaving(false); setMessage(error.message); return; }
    }
    await supabase.from('profiles').update({ role: role === 'none' ? 'user' : role }).eq('id', member.id);
    setSaving(false);
    setMessage('Saved');
    load();
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">User Rights</h1>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {message && <span className="text-xs text-muted-foreground">{message}</span>}
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Super Admins always have full access. Choose what Admin and Support can see and change.
        </p>

        {!isSuperAdmin && !accessLoading && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            You can view these settings but only a Super Admin can change them.
          </div>
        )}

        <div className="bg-card border rounded-xl overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Section</th>
                {EDITABLE_ROLES.map(r => (
                  <th key={r} className="px-4 py-3 font-medium text-center" colSpan={2}>
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
              <tr className="text-xs text-muted-foreground">
                <th />
                {EDITABLE_ROLES.map(r => (
                  <React.Fragment key={r}>
                    <th className="px-2 pb-2 font-normal">View</th>
                    <th className="px-2 pb-2 font-normal">Edit</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-muted-foreground" colSpan={5}>Loading…</td></tr>
              ) : ADMIN_SECTIONS.map(section => (
                <tr key={section.key} className="border-t">
                  <td className="px-4 py-2.5">{section.label}</td>
                  {EDITABLE_ROLES.map(role => {
                    const p = getPerm(role, section.key);
                    return (
                      <React.Fragment key={role}>
                        {(['can_view', 'can_edit'] as const).map(field => (
                          <td key={field} className="px-2 py-2.5 text-center">
                            <button
                              disabled={!isSuperAdmin}
                              onClick={() => toggle(role, section.key, field)}
                              className={`h-5 w-5 rounded border inline-flex items-center justify-center transition-colors
                                ${p?.[field] ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-input'}
                                ${isSuperAdmin ? 'hover:border-primary cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                              aria-label={`${ROLE_LABELS[role]} ${field === 'can_view' ? 'view' : 'edit'} ${section.label}`}
                            >
                              {p?.[field] && <Check className="h-3.5 w-3.5" />}
                            </button>
                          </td>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-base font-semibold mb-3">Staff accounts</h2>
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Level</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 && !loading && (
                <tr><td className="px-4 py-6 text-muted-foreground" colSpan={3}>No staff accounts yet.</td></tr>
              )}
              {staff.map(m => (
                <tr key={m.id} className="border-t">
                  <td className="px-4 py-2.5">{m.full_name || '—'}</td>
                  <td className="px-4 py-2.5">{m.email}</td>
                  <td className="px-4 py-2.5">
                    <select
                      disabled={!isSuperAdmin}
                      value={m.roles.find(r => STAFF_ROLES.includes(r)) ?? 'none'}
                      onChange={e => setStaffRole(m, e.target.value as AppRole | 'none')}
                      className="border rounded-md px-2 py-1 text-sm bg-background disabled:opacity-60"
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="support">Support</option>
                      <option value="none">Remove access</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          To give an existing customer staff access, open Customers and change their level there.
        </p>
      </div>
    </AdminLayout>
  );
}
