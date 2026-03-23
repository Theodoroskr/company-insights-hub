import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PageLayout from '../components/layout/PageLayout';
import { useCart } from '../contexts/CartContext';
import { useTenant } from '../lib/tenant.tsx';
import type { Product } from '../types/database';

const inputCls =
  'w-full border rounded-md px-3 py-2 text-sm outline-none transition-colors focus:ring-1 focus:ring-blue-300';
const inputStyle = {
  borderColor: 'var(--bg-border)',
  color: 'var(--text-body)',
};

export default function BusinessNameApprovalPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { tenant } = useTenant();

  const [option, setOption] = useState<'Trade Name' | 'Company Name'>('Trade Name');
  const [proposedNames, setProposedNames] = useState(['', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateName = (i: number, val: string) =>
    setProposedNames((prev) => prev.map((n, idx) => (idx === i ? val : n)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setIsSubmitting(true);

    const proxyProduct: Product = {
      id: 'bna-product',
      tenant_id: tenant.id,
      name: 'Business Name Approval',
      slug: 'business-name-approval',
      api4all_product_code: null,
      type: 'extract',
      description: null,
      what_is_included: [],
      base_price: 60,
      service_fee: 0,
      vat_on_full_price: true,
      vat_on_fee_only: false,
      is_instant: false,
      delivery_sla_hours: 48,
      available_speeds: [],
      sample_pdf_url: null,
      product_image_url: null,
      display_order: 99,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const proxyCompany = {
      id: 'bna-' + Date.now(),
      icg_code: 'BNA',
      name: proposedNames[0] || 'Business Name Approval',
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
        <title>Business Name Approval | Companies House Cyprus</title>
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
          <h1 className="text-5xl font-light text-white mt-1">your business name</h1>
        </div>
      </section>

      {/* FORM */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-baseline gap-4 mb-8">
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-heading)' }}>
            Business Name Approval
          </h2>
          <span className="text-2xl font-semibold" style={{ color: 'var(--brand-accent)' }}>
            €60.00
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* 1. Select option */}
          <section>
            <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-heading)' }}>
              1. Select option
            </h3>
            <div className="flex gap-6">
              {(['Trade Name', 'Company Name'] as const).map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                  style={{ color: 'var(--text-body)' }}
                >
                  <input
                    type="radio"
                    name="option"
                    value={opt}
                    checked={option === opt}
                    onChange={() => setOption(opt)}
                    className="accent-blue-600"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </section>

          {/* 2. Trade / Company Name */}
          <section>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>
              2. {option}
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
            <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              *Note: This relates to submission for approval and not for registration. Should you
              be interested in name registration, please click{' '}
              <Link
                to="/trade/registration"
                className="underline font-medium"
                style={{ color: 'var(--brand-accent)' }}
              >
                here
              </Link>
              . It&rsquo;s important to note that to proceed with the name registration, approval
              is first required.
            </p>
          </section>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !proposedNames[0].trim()}
              className="px-8 py-3 rounded text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
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
