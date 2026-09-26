import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { applyPricingSettings, DEFAULT_BUNDLE_TIERS, formatEur } from '@/lib/pricing';
import { toast } from '@/hooks/use-toast';

const sb = supabase as any;
type Tier = { tier: string; pay: number; bonus_pct: number };

/** Edit credit bundle tiers and the compliance screening add-on price. */
export default function PricingSettingsCard() {
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_BUNDLE_TIERS);
  const [screening, setScreening] = useState(45);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    sb.from('pricing_settings').select('*').eq('id', 'global').maybeSingle().then(({ data }: any) => {
      if (data) { setTiers(data.bundle_tiers); setScreening(Number(data.screening_addon_eur)); }
    });
  }, []);

  const setTier = (i: number, k: keyof Tier, v: number) => setTiers((t) => t.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const save = async () => {
    if (tiers.some((t) => !(t.pay > 0) || t.bonus_pct < 0 || t.bonus_pct > 100) || screening < 0) {
      return toast({ title: 'Check the values', description: 'Prices must be positive and bonus 0–100%.', variant: 'destructive' });
    }
    setSaving(true);
    const row = { bundle_tiers: tiers, screening_addon_eur: screening };
    const { data, error } = await sb.from('pricing_settings').update(row).eq('id', 'global').select();
    setSaving(false);
    if (error || !data?.length) return toast({ title: 'Error', description: error?.message ?? 'You do not have permission to edit pricing.', variant: 'destructive' });
    applyPricingSettings(row);
    const { data: { user } } = await supabase.auth.getUser();
    await sb.from('audit_logs').insert({ user_id: user?.id, action: 'pricing_settings_update', entity_type: 'pricing_settings', entity_id: 'global', payload: row });
    toast({ title: 'Pricing saved' });
  };

  return (
    <div className="bg-card border rounded-xl p-5 space-y-4">
      <h2 className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>Credit bundles &amp; add-ons</h2>
      <table className="w-full text-sm">
        <thead><tr className="text-xs text-muted-foreground text-left"><th className="py-1">Bundle</th><th>Price €</th><th>Bonus %</th><th>Customer gets</th></tr></thead>
        <tbody>
          {tiers.map((t, i) => (
            <tr key={t.tier}>
              <td className="py-1 capitalize font-medium">{t.tier}</td>
              <td><input type="number" min={1} value={t.pay} onChange={(e) => setTier(i, 'pay', Number(e.target.value))} className="border rounded px-2 py-1 w-24 text-sm bg-background" /></td>
              <td><input type="number" min={0} max={100} step="0.5" value={t.bonus_pct} onChange={(e) => setTier(i, 'bonus_pct', Number(e.target.value))} className="border rounded px-2 py-1 w-20 text-sm bg-background" /></td>
              <td className="tabular-nums text-muted-foreground">{formatEur(t.pay * (1 + t.bonus_pct / 100))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Compliance (AML) screening add-on, € per report</label>
        <input type="number" min={0} step="0.01" value={screening} onChange={(e) => setScreening(Number(e.target.value))} className="border rounded px-2 py-1 w-28 text-sm bg-background" />
      </div>
      <button onClick={save} disabled={saving} className="px-4 py-2 rounded text-sm font-semibold text-primary-foreground disabled:opacity-50" style={{ backgroundColor: 'var(--brand-accent)' }}>
        {saving ? 'Saving…' : 'Save pricing'}
      </button>
    </div>
  );
}
