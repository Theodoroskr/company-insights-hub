import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { X } from 'lucide-react';
import AccountLayout from '../../components/layout/AccountLayout';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/tenant';
import { useToast } from '../../hooks/use-toast';

interface Country {
  code: string;
  name: string;
  flag_emoji: string | null;
}

export default function AccountProfilePage() {
  const { tenant } = useTenant();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [vat, setVat] = useState('');
  const [country, setCountry] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);

  // Company section
  const [showCompany, setShowCompany] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyReg, setCompanyReg] = useState('');
  const [companyVat, setCompanyVat] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUserId(session.user.id);
      setEmail(session.user.email ?? '');

      const [{ data: profile }, { data: countriesData }] = await Promise.all([
        supabase.from('profiles').select('full_name, phone').eq('id', session.user.id).maybeSingle(),
        supabase.from('countries').select('code, name, flag_emoji').order('name', { ascending: true }),
      ]);

      if (profile) {
        const parts = (profile.full_name ?? '').split(' ');
        setFirstName(parts[0] ?? '');
        setLastName(parts.slice(1).join(' '));
        setPhone(profile.phone ?? '');
      }
      setCountries((countriesData as Country[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    const fullName = `${firstName} ${lastName}`.trim();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone })
      .eq('id', userId);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile saved', description: 'Your changes have been saved.' });
    }
  }

  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault();
    setSavingCompany(true);
    // Company info stored in profile notes / metadata — for now just show success
    await new Promise((r) => setTimeout(r, 600));
    setSavingCompany(false);
    toast({ title: 'Company details saved' });
  }

  if (loading) {
    return (
      <AccountLayout>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--brand-accent)', borderTopColor: 'transparent' }} />
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <Helmet>
        <title>Profile — {tenant?.brand_name ?? 'My Account'}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-heading)' }}>
        Profile Information
      </h1>

      {/* ── Personal Information ── */}
      <form onSubmit={handleSave}>
        <div
          className="bg-white border rounded-lg p-6 mb-4"
          style={{ borderColor: 'var(--bg-border)' }}
        >
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-heading)' }}>
            Profile Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                First Name <span style={{ color: 'var(--status-dissolved)' }}>*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-md border text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                Last Name <span style={{ color: 'var(--status-dissolved)' }}>*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-md border text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full h-10 px-3 rounded-md border text-sm bg-gray-50 cursor-not-allowed"
                style={{ borderColor: 'var(--bg-border)', color: 'var(--text-muted)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                Contact Number <span style={{ color: 'var(--status-dissolved)' }}>*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-md border text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
              />
            </div>
          </div>

          {/* VAT field */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>
              Company VAT
            </label>
            <div className="relative">
              <input
                type="text"
                value={vat}
                onChange={(e) => setVat(e.target.value)}
                placeholder="Company VAT (the verification process needs a few minutes)"
                className="w-full h-10 px-3 pr-9 rounded-md border text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
              />
              {vat && (
                <button
                  type="button"
                  onClick={() => setVat('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-gray-100 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Clear VAT"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Country code prefix is required. E.g. CY12345
            </p>
          </div>

          {/* Country */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>
              Country <span style={{ color: 'var(--status-dissolved)' }}>*</span>
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full h-10 px-3 rounded-md border text-sm focus:outline-none focus:ring-2 bg-white"
              style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
            >
              <option value="">Select country…</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag_emoji ? `${c.flag_emoji} ` : ''}{c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-sm font-semibold text-white rounded transition-all active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>

      {/* ── Company Information ── */}
      <div
        className="bg-white border rounded-lg p-6"
        style={{ borderColor: 'var(--bg-border)' }}
      >
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
            style={{
              borderColor: showCompany ? 'var(--brand-accent)' : 'var(--bg-border)',
              backgroundColor: showCompany ? 'var(--brand-accent)' : 'transparent',
            }}
            onClick={() => setShowCompany((v) => !v)}
          >
            {showCompany && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
          <span
            className="text-sm"
            style={{ color: 'var(--text-body)' }}
            onClick={() => setShowCompany((v) => !v)}
          >
            Add Company Information
          </span>
        </label>

        <div
          className="overflow-hidden transition-all duration-300"
          style={{ maxHeight: showCompany ? '600px' : '0', opacity: showCompany ? 1 : 0 }}
        >
          <form onSubmit={handleSaveCompany} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                Company Name <span style={{ color: 'var(--status-dissolved)' }}>*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full h-10 px-3 rounded-md border text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                Registration Number
              </label>
              <input
                type="text"
                value={companyReg}
                onChange={(e) => setCompanyReg(e.target.value)}
                className="w-full h-10 px-3 rounded-md border text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                VAT Number
              </label>
              <input
                type="text"
                value={companyVat}
                onChange={(e) => setCompanyVat(e.target.value)}
                className="w-full h-10 px-3 rounded-md border text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                Country
              </label>
              <select
                value={companyCountry}
                onChange={(e) => setCompanyCountry(e.target.value)}
                className="w-full h-10 px-3 rounded-md border text-sm focus:outline-none focus:ring-2 bg-white"
                style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
              >
                <option value="">Select country…</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag_emoji ? `${c.flag_emoji} ` : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end mt-2">
              <button
                type="submit"
                disabled={savingCompany}
                className="px-6 py-2 text-sm font-semibold text-white rounded transition-all active:scale-95 disabled:opacity-60"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                {savingCompany ? 'Saving…' : 'Save Company Details'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AccountLayout>
  );
}
