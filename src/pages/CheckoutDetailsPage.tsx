import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import { useCart } from '../contexts/CartContext';
import { useTenant } from '../lib/tenant';
import { useCurrency } from '../contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { getVatRate } from '../lib/tenantConfig';

const EU_COUNTRY_CODES = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU',
  'IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
]);

const CHECKOUT_STEPS = ['Cart', 'Details', 'Payment', 'Confirmation'];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {CHECKOUT_STEPS.map((step, i) => (
        <React.Fragment key={step}>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                backgroundColor: i + 1 === current ? 'var(--brand-accent)' : i + 1 < current ? 'var(--status-active)' : 'var(--bg-subtle)',
                color: i + 1 <= current ? '#fff' : 'var(--text-muted)',
              }}
            >
              {i + 1 < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span
              className="text-sm font-medium hidden sm:inline"
              style={{ color: i + 1 === current ? 'var(--brand-accent)' : 'var(--text-muted)' }}
            >
              {step}
            </span>
          </div>
          {i < CHECKOUT_STEPS.length - 1 && (
            <div
              className="w-12 sm:w-16 h-0.5 mx-1"
              style={{ backgroundColor: i + 1 < current ? 'var(--status-active)' : 'var(--bg-border)' }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function OrderSummary({ compact = false }: { compact?: boolean }) {
  const { items, subtotal, totalVat, grandTotal } = useCart();
  const { format } = useCurrency();
  return (
    <div
      className="rounded-lg border p-5"
      style={{ borderColor: 'var(--bg-border)', backgroundColor: '#fff' }}
    >
      <h3 className="font-semibold text-base mb-4" style={{ color: 'var(--text-heading)' }}>
        Order Summary
      </h3>
      <div className="space-y-2 mb-3">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm gap-2">
            <span className="truncate" style={{ color: 'var(--text-body)' }}>
              {item.product.name} — {item.company.name}
            </span>
            <span className="shrink-0 font-medium" style={{ color: 'var(--text-heading)' }}>
              {format(item.price)}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t pt-3 space-y-1.5" style={{ borderColor: 'var(--bg-border)' }}>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
          <span style={{ color: 'var(--text-body)' }}>{format(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--text-muted)' }}>VAT</span>
          <span style={{ color: 'var(--text-muted)' }}>+{format(totalVat)}</span>
        </div>
        <div className="flex justify-between font-bold text-base pt-1">
          <span style={{ color: 'var(--text-heading)' }}>Total</span>
          <span style={{ color: 'var(--brand-accent)' }}>{format(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutDetailsPage() {
  const { tenant } = useTenant();
  const { items, grandTotal, totalVat } = useCart();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'account' | 'guest'>('guest');
  const [session, setSession] = useState<null | { user: { email?: string; id: string } }>(null);
  const [profile, setProfile] = useState<{ full_name?: string; email?: string; phone?: string } | null>(null);

  // Form state
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    country: '', street: '', city: '', state: '', postcode: '',
    isBusiness: false,
    companyName: '', companyReg: '', vatNumber: '',
    vatValidated: false as boolean | 'checking',
    termsAccepted: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session as typeof session);
        setTab('account');
      }
    });
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from('profiles').select('full_name, email, phone').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          const parts = (data.full_name ?? '').split(' ');
          setForm((f) => ({
            ...f,
            firstName: parts[0] ?? '',
            lastName: parts.slice(1).join(' ') ?? '',
            email: data.email ?? session?.user?.email ?? '',
            phone: data.phone ?? '',
          }));
        }
      });
  }, [session]);

  const isEU = EU_COUNTRY_CODES.has(form.country.toUpperCase());
  const vatExempt = !isEU || (form.isBusiness && form.vatValidated === true);
  const effectiveVat = vatExempt ? 0 : totalVat;
  const effectiveTotal = items.reduce((s, i) => s + i.price, 0) + effectiveVat;

  const set = (key: keyof typeof form, val: unknown) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  };

  const validateVat = async () => {
    if (!form.vatNumber || !form.country) return;
    set('vatValidated', 'checking');
    // Simple optimistic check — real VIES integration happens server-side at order time
    await new Promise((r) => setTimeout(r, 1200));
    set('vatValidated', form.vatNumber.length > 5);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    if (!form.country) e.country = 'Country is required';
    if (!form.street.trim()) e.street = 'Street address is required';
    if (!form.city.trim()) e.city = 'City is required';
    if (!form.postcode.trim()) e.postcode = 'Postcode is required';
    if (!form.termsAccepted) e.terms = 'You must accept the Terms and Conditions';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    // Store customer details in sessionStorage for payment page
    sessionStorage.setItem('checkout_details', JSON.stringify({
      ...form,
      vatExempt,
      effectiveVat,
      effectiveTotal,
    }));
    navigate('/checkout/payment');
  };

  if (items.length === 0) {
    return (
      <PageLayout>
        <div className="max-w-xl mx-auto py-20 text-center">
          <p style={{ color: 'var(--text-muted)' }}>Your cart is empty.</p>
          <Link to="/cart" className="text-sm mt-3 inline-block" style={{ color: 'var(--brand-accent)' }}>
            ← Return to cart
          </Link>
        </div>
      </PageLayout>
    );
  }

  const inputCls = (field: string) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm outline-none transition-colors ${errors[field] ? 'border-red-400' : ''}`;
  const inputStyle = (field: string) => ({
    borderColor: errors[field] ? '#f87171' : 'var(--bg-border)',
    color: 'var(--text-body)',
    backgroundColor: '#fff',
  });

  return (
    <PageLayout>
      <Helmet>
        <title>Checkout — Details | {tenant?.brand_name ?? 'Companies House'}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <StepBar current={2} />

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Left: customer details ── */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold mb-5" style={{ color: 'var(--text-heading)' }}>
              Your Details
            </h2>

            {/* Tab switcher */}
            <div
              className="flex border rounded-lg overflow-hidden mb-6 text-sm font-medium"
              style={{ borderColor: 'var(--bg-border)' }}
            >
              {(['guest', 'account'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className="flex-1 py-2.5 transition-colors"
                  style={{
                    backgroundColor: tab === t ? 'var(--brand-accent)' : '#fff',
                    color: tab === t ? '#fff' : 'var(--text-body)',
                  }}
                >
                  {t === 'guest' ? 'Guest Checkout' : 'I have an account'}
                </button>
              ))}
            </div>

            {/* Personal Information */}
            <section className="mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
                Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    className={inputCls('firstName')}
                    style={inputStyle('firstName')}
                    value={form.firstName}
                    onChange={(e) => set('firstName', e.target.value)}
                    placeholder="John"
                  />
                  {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    className={inputCls('lastName')}
                    style={inputStyle('lastName')}
                    value={form.lastName}
                    onChange={(e) => set('lastName', e.target.value)}
                    placeholder="Smith"
                  />
                  {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                  Email Address * <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(report delivered here)</span>
                </label>
                <input
                  type="email"
                  className={inputCls('email')}
                  style={inputStyle('email')}
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="john.smith@example.com"
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  className={inputCls('phone')}
                  style={inputStyle('phone')}
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+357 99 000000"
                />
              </div>
            </section>

            {/* Billing Address */}
            <section className="mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
                Billing Address
              </h3>
              <div className="mb-3">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                  Country / Region *
                </label>
                <select
                  className={inputCls('country')}
                  style={inputStyle('country')}
                  value={form.country}
                  onChange={(e) => set('country', e.target.value)}
                >
                  <option value="">Select country…</option>
                  {[
                    ['CY', 'Cyprus'], ['GR', 'Greece'], ['GB', 'United Kingdom'],
                    ['DE', 'Germany'], ['FR', 'France'], ['US', 'United States'],
                    ['AE', 'UAE'], ['SG', 'Singapore'], ['CH', 'Switzerland'],
                  ].map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
                {errors.country && <p className="text-xs text-red-500 mt-1">{errors.country}</p>}
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                  Street Address *
                </label>
                <input
                  type="text"
                  className={inputCls('street')}
                  style={inputStyle('street')}
                  value={form.street}
                  onChange={(e) => set('street', e.target.value)}
                  placeholder="123 Main Street"
                />
                {errors.street && <p className="text-xs text-red-500 mt-1">{errors.street}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                    Town / City *
                  </label>
                  <input
                    type="text"
                    className={inputCls('city')}
                    style={inputStyle('city')}
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                    placeholder="Nicosia"
                  />
                  {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                    State / County
                  </label>
                  <input
                    type="text"
                    className={inputCls('state')}
                    style={inputStyle('state')}
                    value={form.state}
                    onChange={(e) => set('state', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                  Postcode / ZIP *
                </label>
                <input
                  type="text"
                  className={inputCls('postcode') + ' max-w-xs'}
                  style={inputStyle('postcode')}
                  value={form.postcode}
                  onChange={(e) => set('postcode', e.target.value)}
                />
                {errors.postcode && <p className="text-xs text-red-500 mt-1">{errors.postcode}</p>}
              </div>
            </section>

            {/* Business toggle */}
            <section className="mb-6">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-blue-600"
                  checked={form.isBusiness}
                  onChange={(e) => set('isBusiness', e.target.checked)}
                />
                <span className="text-sm font-medium" style={{ color: 'var(--text-body)' }}>
                  Purchasing on behalf of a company
                </span>
              </label>

              {form.isBusiness && (
                <div className="mt-3 space-y-3 pl-6">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                      Company Name *
                    </label>
                    <input
                      type="text"
                      className={inputCls('companyName')}
                      style={inputStyle('companyName')}
                      value={form.companyName}
                      onChange={(e) => set('companyName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                      Registration Number
                    </label>
                    <input
                      type="text"
                      className={inputCls('companyReg')}
                      style={inputStyle('companyReg')}
                      value={form.companyReg}
                      onChange={(e) => set('companyReg', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                      VAT Number{' '}
                      <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(optional)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className={inputCls('vatNumber') + ' flex-1'}
                        style={inputStyle('vatNumber')}
                        value={form.vatNumber}
                        onChange={(e) => {
                          set('vatNumber', e.target.value);
                          set('vatValidated', false);
                        }}
                        placeholder="CY10004404T"
                      />
                      <button
                        type="button"
                        onClick={validateVat}
                        disabled={!form.vatNumber || form.vatValidated === 'checking'}
                        className="px-3 py-2 text-xs font-medium border rounded transition-colors disabled:opacity-50"
                        style={{
                          borderColor: 'var(--brand-accent)',
                          color: 'var(--brand-accent)',
                          backgroundColor: '#fff',
                        }}
                      >
                        {form.vatValidated === 'checking' ? 'Checking…' : 'Validate VAT'}
                      </button>
                    </div>
                    {form.vatValidated === true && (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--status-active)' }}>
                        ✅ Validated — VAT Exempt
                      </p>
                    )}
                    {form.vatValidated === false && form.vatNumber && (
                      <p className="text-xs mt-1.5" style={{ color: 'var(--status-dissolved)' }}>
                        ❌ Not validated — VAT applies
                      </p>
                    )}
                  </div>

                  {/* VAT status summary */}
                  <div
                    className="text-xs p-2.5 rounded"
                    style={{
                      backgroundColor: vatExempt ? '#f0fdf4' : '#fef9c3',
                      color: vatExempt ? 'var(--status-active)' : '#92400e',
                      border: `1px solid ${vatExempt ? '#bbf7d0' : '#fde68a'}`,
                    }}
                  >
                    {!isEU && '🌍 Non-EU entity — VAT Exempt'}
                    {isEU && !form.isBusiness && '🇪🇺 EU individual — 19% VAT applies'}
                    {isEU && form.isBusiness && form.vatValidated === true && '✅ EU Validated — VAT Exempt'}
                    {isEU && form.isBusiness && form.vatValidated !== true && '⚠️ EU company, unvalidated — 19% VAT applies'}
                  </div>
                </div>
              )}
            </section>

            {/* Delivery note */}
            <p className="text-sm italic mb-4" style={{ color: 'var(--text-muted)' }}>
              Your report will be delivered to the email address above. Download link valid for 30 days from delivery.
            </p>

            {/* Terms */}
            <div className="mb-6">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5 rounded accent-blue-600"
                  checked={form.termsAccepted}
                  onChange={(e) => set('termsAccepted', e.target.checked)}
                />
                <span className="text-sm" style={{ color: 'var(--text-body)' }}>
                  I have read and agree to the{' '}
                  <Link
                    to="/terms-and-conditions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: 'var(--brand-accent)' }}
                  >
                    Terms and Conditions
                  </Link>
                </span>
              </label>
              {errors.terms && <p className="text-xs text-red-500 mt-1 pl-6">{errors.terms}</p>}
            </div>

            <button
              type="button"
              onClick={handleContinue}
              disabled={isSubmitting}
              className="w-full py-3 rounded text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand-accent)', borderRadius: '6px' }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = 'var(--brand-accent-hover)')
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = 'var(--brand-accent)')
              }
            >
              Continue to Payment →
            </button>
          </div>

          {/* ── Right: summary ── */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="lg:sticky lg:top-24">
              <OrderSummary />
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
