import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import PageLayout from '../components/layout/PageLayout';
import { useCart } from '../contexts/CartContext';
import { useTenant } from '../lib/tenant.tsx';
import { supabase } from '@/integrations/supabase/client';
import type { Product } from '../types/database';

// ── Types ─────────────────────────────────────────────────────

interface Shareholder {
  type: 'Individual' | 'Company';
  name: string;
  holding: string;
  address: string;
}

interface Director {
  type: 'Individual' | 'Company';
  name: string;
  address: string;
}

const emptyShareHolder = (): Shareholder => ({
  type: 'Individual',
  name: '',
  holding: '',
  address: '',
});

const emptyDirector = (): Director => ({
  type: 'Individual',
  name: '',
  address: '',
});

// ── Input helpers ─────────────────────────────────────────────

const inputCls =
  'w-full border rounded-md px-3 py-2 text-sm outline-none transition-colors focus:ring-1 focus:ring-blue-300';
const inputStyle = {
  borderColor: 'var(--bg-border)',
  color: 'var(--text-body)',
};

// ── Component ─────────────────────────────────────────────────

export default function CompanySetUpPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { tenant } = useTenant();

  const [companyType, setCompanyType] = useState<'LTD' | 'PLC'>('LTD');
  const [proposedNames, setProposedNames] = useState(['', '', '']);
  const [businessActivity, setBusinessActivity] = useState('');
  const [shareholders, setShareholders] = useState<Shareholder[]>([emptyShareHolder()]);
  const [directors, setDirectors] = useState<Director[]>([emptyDirector()]);
  const [secretaryName, setSecretaryName] = useState('');
  const [contact, setContact] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateName = (i: number, val: string) => {
    setProposedNames((prev) => prev.map((n, idx) => (idx === i ? val : n)));
  };

  const updateShareholder = (i: number, field: keyof Shareholder, val: string) => {
    setShareholders((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s))
    );
  };

  const updateDirector = (i: number, field: keyof Director, val: string) => {
    setDirectors((prev) =>
      prev.map((d, idx) => (idx === i ? { ...d, [field]: val } : d))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setIsSubmitting(true);

    // Find company-setup product or build a proxy
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .ilike('slug', '%set%')
      .limit(1);

    const BASE_PRICE = 1700;
    const proxyProduct: Product = products?.[0]
      ? {
          ...(products[0] as unknown as Product),
          base_price: BASE_PRICE,
          available_speeds: [],
        }
      : {
          id: 'setup-product',
          tenant_id: tenant.id,
          name: 'Company Set Up',
          slug: 'company-set-up',
          api4all_product_code: null,
          type: 'extract',
          description: null,
          what_is_included: [],
          base_price: BASE_PRICE,
          service_fee: 0,
          vat_on_full_price: true,
          vat_on_fee_only: false,
          is_instant: false,
          delivery_sla_hours: 72,
          available_speeds: [],
          sample_pdf_url: null,
          product_image_url: null,
          display_order: 99,
          is_active: true,
          created_at: new Date().toISOString(),
        };

    const proxyCompany = {
      id: 'setup-' + Date.now(),
      icg_code: 'SETUP',
      name: proposedNames[0] || 'New Company',
      reg_no: null,
      slug: null,
      country_code: tenant.country_code ?? 'CY',
    };

    addItem(proxyProduct, proxyCompany, 'Normal');
    navigate('/checkout/details');
    setIsSubmitting(false);
  };

  return (
    <PageLayout>
      <Helmet>
        <title>Company Set Up | Companies House Cyprus</title>{/* CY-only service */}
      </Helmet>

      {/* HERO */}
      <section
        className="w-full flex items-end pb-12 pt-20"
        style={{
          background: 'linear-gradient(135deg, #0F2444 0%, #1B3A6B 100%)',
          minHeight: '220px',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 w-full">
          <p className="text-3xl italic font-light" style={{ color: 'var(--brand-accent)' }}>
            Setup
          </p>
          <h1 className="text-5xl font-light text-white mt-1">your company</h1>
        </div>
      </section>

      {/* FORM */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-baseline gap-4 mb-8">
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-heading)' }}>
            Company Set Up
          </h2>
          <span className="text-2xl font-semibold" style={{ color: 'var(--brand-accent)' }}>
            €1,700.00
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* 1. Company Type */}
          <section>
            <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-heading)' }}>
              1. Company Type
            </h3>
            <div className="flex gap-6">
              {(['LTD', 'PLC'] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-body)' }}>
                  <input
                    type="radio"
                    name="companyType"
                    value={t}
                    checked={companyType === t}
                    onChange={() => setCompanyType(t)}
                    className="accent-blue-600"
                  />
                  {t === 'LTD' ? 'Limited Liability Company (LTD)' : 'Public Limited Company (PLC)'}
                </label>
              ))}
            </div>
          </section>

          {/* 2. Company Name */}
          <section>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>
              2. Company Name
            </h3>
            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
              Please provide us with three proposed names (with preferred order):
            </p>
            <div className="space-y-2">
              {proposedNames.map((n, i) => (
                <input
                  key={i}
                  type="text"
                  className={inputCls}
                  style={inputStyle}
                  value={n}
                  onChange={(e) => updateName(i, e.target.value)}
                  placeholder={`Proposed name ${i + 1}`}
                  required={i === 0}
                />
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              *Recommendation: Check{' '}
              <Link to="/company/search" className="underline font-medium" style={{ color: 'var(--brand-accent)' }}>
                here
              </Link>{' '}
              for any existing or similar name by typing your proposed Company name.
            </p>
          </section>

          {/* 3. Business Activity */}
          <section>
            <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-heading)' }}>
              3. Business Activity
            </h3>
            <textarea
              className={inputCls}
              style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
              value={businessActivity}
              onChange={(e) => setBusinessActivity(e.target.value)}
              placeholder="Enter your message here."
              rows={4}
            />
          </section>

          {/* 4. Shareholders */}
          <section>
            <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-heading)' }}>
              4. Shareholders
            </h3>
            <div className="space-y-6">
              {shareholders.map((sh, i) => (
                <div
                  key={i}
                  className="border rounded-lg p-4 space-y-3 relative"
                  style={{ borderColor: 'var(--bg-border)' }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-subheading)' }}>
                      Shareholder {i + 1}
                    </p>
                    {i > 0 && (
                      <button
                        type="button"
                        onClick={() => setShareholders((prev) => prev.filter((_, idx) => idx !== i))}
                        className="p-1 rounded hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-4">
                    {(['Individual', 'Company'] as const).map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-body)' }}>
                        <input
                          type="radio"
                          checked={sh.type === t}
                          onChange={() => updateShareholder(i, 'type', t)}
                          className="accent-blue-600"
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                  <input type="text" className={inputCls} style={inputStyle} placeholder="Shareholder Name" value={sh.name} onChange={(e) => updateShareholder(i, 'name', e.target.value)} />
                  <input type="text" className={inputCls} style={inputStyle} placeholder="Holding Percentage" value={sh.holding} onChange={(e) => updateShareholder(i, 'holding', e.target.value)} />
                  <input type="text" className={inputCls} style={inputStyle} placeholder="Shareholder Address" value={sh.address} onChange={(e) => updateShareholder(i, 'address', e.target.value)} />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShareholders((prev) => [...prev, emptyShareHolder()])}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded border transition-colors hover:opacity-80"
              style={{ color: 'var(--brand-accent)', borderColor: 'var(--brand-accent)' }}
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </section>

          {/* 5. Directors */}
          <section>
            <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-heading)' }}>
              5. Directors
            </h3>
            <div className="space-y-6">
              {directors.map((d, i) => (
                <div
                  key={i}
                  className="border rounded-lg p-4 space-y-3"
                  style={{ borderColor: 'var(--bg-border)' }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-subheading)' }}>
                      Director {i + 1}
                    </p>
                    {i > 0 && (
                      <button
                        type="button"
                        onClick={() => setDirectors((prev) => prev.filter((_, idx) => idx !== i))}
                        className="p-1 rounded hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-4">
                    {(['Individual', 'Company'] as const).map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-body)' }}>
                        <input
                          type="radio"
                          checked={d.type === t}
                          onChange={() => updateDirector(i, 'type', t)}
                          className="accent-blue-600"
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                  <input type="text" className={inputCls} style={inputStyle} placeholder="Director Name" value={d.name} onChange={(e) => updateDirector(i, 'name', e.target.value)} />
                  <input type="text" className={inputCls} style={inputStyle} placeholder="Director Address" value={d.address} onChange={(e) => updateDirector(i, 'address', e.target.value)} />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setDirectors((prev) => [...prev, emptyDirector()])}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded border transition-colors hover:opacity-80"
              style={{ color: 'var(--brand-accent)', borderColor: 'var(--brand-accent)' }}
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </section>

          {/* 6. Secretary */}
          <section>
            <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-heading)' }}>
              6. Secretary
            </h3>
            <input
              type="text"
              className={inputCls}
              style={inputStyle}
              placeholder="Secretary Name"
              value={secretaryName}
              onChange={(e) => setSecretaryName(e.target.value)}
            />
          </section>

          {/* 7. Contact Person */}
          <section>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>
              7. Contact Person with whom we will communicate with:
            </h3>
            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
              Details:
            </p>
            <div className="space-y-2">
              <input type="text" className={inputCls} style={inputStyle} placeholder="Contact Person Name" value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} />
              <input type="email" className={inputCls} style={inputStyle} placeholder="Contact Person Email" value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} required />
              <input type="tel" className={inputCls} style={inputStyle} placeholder="Phone Number" value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} />
              <input type="text" className={inputCls} style={inputStyle} placeholder="Contact Person Address" value={contact.address} onChange={(e) => setContact((c) => ({ ...c, address: e.target.value }))} />
            </div>
          </section>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 rounded text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {isSubmitting ? 'Adding…' : 'Add to cart'}
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
