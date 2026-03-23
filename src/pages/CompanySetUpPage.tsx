import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import PageLayout from '../components/layout/PageLayout';
import { useCart } from '../contexts/CartContext';
import { useTenant } from '../lib/tenant.tsx';
import { supabase } from '@/integrations/supabase/client';
import type { Product } from '../types/database';

// ── Types ─────────────────────────────────────────────────────

interface SetUpFormData {
  companyType: string;
  proposedName1: string;
  proposedName2: string;
  proposedName3: string;
  businessActivity: string;
  directorName: string;
  directorEmail: string;
  directorPhone: string;
  shareholderName: string;
  shareholderShares: string;
  registeredAddress: string;
  additionalNotes: string;
}

const COMPANY_TYPES = [
  'Limited Liability Company (LLC)',
  'Public Limited Company (PLC)',
  'Partnership',
  'Branch of Foreign Company',
  'Overseas Company',
];

// ── Component ─────────────────────────────────────────────────

export default function CompanySetUpPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { tenant } = useTenant();

  const [form, setForm] = useState<SetUpFormData>({
    companyType: '',
    proposedName1: '',
    proposedName2: '',
    proposedName3: '',
    businessActivity: '',
    directorName: '',
    directorEmail: '',
    directorPhone: '',
    shareholderName: '',
    shareholderShares: '',
    registeredAddress: '',
    additionalNotes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (field: keyof SetUpFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setIsSubmitting(true);

    // Find a matching product (company setup / service type)
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .ilike('name', '%set%')
      .limit(1);

    const product = products?.[0] as unknown as Product | undefined;

    if (product) {
      // Build a minimal "company" object from form data so cart can show company name
      const fakeCompany = {
        id: 'setup-' + Date.now(),
        tenant_id: tenant.id,
        icg_code: 'SETUP',
        country_code: tenant.country_code ?? 'CY',
        name: form.proposedName1 || 'New Company',
        reg_no: null,
        vat_no: null,
        status: null,
        legal_form: form.companyType || null,
        registered_address: form.registeredAddress || null,
        slug: null,
        raw_source_json: { formData: form },
        cached_at: new Date().toISOString(),
        meta_title: null,
        meta_description: null,
      };
      addItem(product as any, fakeCompany as any, 'Normal');
      navigate('/cart');
    } else {
      // No product found — navigate to cart anyway with a note
      navigate('/cart');
    }

    setIsSubmitting(false);
  };

  // Shared input styles
  const inputClass =
    'w-full border rounded-md px-3 py-2 text-sm outline-none transition-colors focus:ring-1';
  const inputStyle = { borderColor: 'var(--bg-border)', color: 'var(--text-body)' };

  return (
    <PageLayout>
      <Helmet>
        <title>Company Set Up | Companies House Cyprus</title>
      </Helmet>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-sm mb-6 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <Link to="/" className="hover:underline" style={{ color: 'var(--text-muted)' }}>Home</Link>
          <span>›</span>
          <span style={{ color: 'var(--text-body)' }}>Company Set Up</span>
        </nav>

        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-heading)' }}>
          Company Set Up
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Register a new company in Cyprus with our expert assistance.
        </p>

        {/* ── Amber info box ── */}
        <div
          className="flex items-start gap-3 rounded-lg p-4 mb-8 text-sm"
          style={{
            backgroundColor: 'hsl(45 100% 96%)',
            borderLeft: '4px solid hsl(40 96% 56%)',
            color: 'hsl(30 80% 30%)',
          }}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'hsl(40 96% 46%)' }} />
          <span>Please ensure that your Cart is empty before placing a new order.</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ── Section 1: Company Type ── */}
          <section>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>
              1. Company Type
            </h2>
            <div>
              <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--text-subheading)' }}>
                Select Company Type *
              </label>
              <select
                className={inputClass}
                style={inputStyle}
                value={form.companyType}
                onChange={set('companyType')}
                required
              >
                <option value="">— Select —</option>
                {COMPANY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </section>

          {/* ── Section 2: Company Name ── */}
          <section>
            <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>
              2. Company Name
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              *Recommendation: Check{' '}
              <Link
                to="/company/search"
                className="underline font-medium"
                style={{ color: 'var(--brand-accent)' }}
              >
                here
              </Link>{' '}
              for any existing or similar name by typing your proposed Company name.
            </p>
            <div className="space-y-3">
              {(['proposedName1', 'proposedName2', 'proposedName3'] as const).map((field, i) => (
                <div key={field}>
                  <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--text-subheading)' }}>
                    Proposed Name {i + 1}{i === 0 ? ' *' : ' (optional)'}
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    style={inputStyle}
                    value={form[field]}
                    onChange={set(field)}
                    placeholder={`Proposed company name ${i + 1}`}
                    required={i === 0}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* ── Section 3: Business Activity ── */}
          <section>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>
              3. Business Activity
            </h2>
            <textarea
              className={inputClass}
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              value={form.businessActivity}
              onChange={set('businessActivity')}
              placeholder="Describe the primary business activities of the company"
              rows={3}
            />
          </section>

          {/* ── Section 4: Director ── */}
          <section>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>
              4. Director Information
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--text-subheading)' }}>
                  Full Name *
                </label>
                <input type="text" className={inputClass} style={inputStyle} value={form.directorName} onChange={set('directorName')} placeholder="Director full name" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--text-subheading)' }}>
                  Email *
                </label>
                <input type="email" className={inputClass} style={inputStyle} value={form.directorEmail} onChange={set('directorEmail')} placeholder="director@email.com" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--text-subheading)' }}>
                  Phone
                </label>
                <input type="tel" className={inputClass} style={inputStyle} value={form.directorPhone} onChange={set('directorPhone')} placeholder="+357 99 000000" />
              </div>
            </div>
          </section>

          {/* ── Section 5: Shareholder ── */}
          <section>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>
              5. Shareholder Information
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--text-subheading)' }}>
                  Shareholder Name *
                </label>
                <input type="text" className={inputClass} style={inputStyle} value={form.shareholderName} onChange={set('shareholderName')} placeholder="Full name or company name" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--text-subheading)' }}>
                  Number of Shares
                </label>
                <input type="number" className={inputClass} style={inputStyle} value={form.shareholderShares} onChange={set('shareholderShares')} placeholder="e.g. 1000" min="1" />
              </div>
            </div>
          </section>

          {/* ── Section 6: Registered Address ── */}
          <section>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>
              6. Registered Address
            </h2>
            <textarea
              className={inputClass}
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              value={form.registeredAddress}
              onChange={set('registeredAddress')}
              placeholder="Full registered address in Cyprus"
              rows={3}
            />
          </section>

          {/* ── Additional Notes ── */}
          <section>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>
              7. Additional Notes
            </h2>
            <textarea
              className={inputClass}
              style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
              value={form.additionalNotes}
              onChange={set('additionalNotes')}
              placeholder="Any additional instructions or requirements"
              rows={4}
            />
          </section>

          {/* ── Submit ── */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-md text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {isSubmitting ? 'Adding to Cart…' : 'Add to Cart'}
            </button>
            <Link
              to="/"
              className="px-6 py-3 rounded-md text-sm font-medium border transition-all hover:opacity-80 text-center"
              style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
