import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import PageLayout from '../components/layout/PageLayout';
import { useTenant } from '../lib/tenant';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function ContactPage() {
  const { tenant } = useTenant();
  const brand = tenant?.brand_name ?? 'Companies House';

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('contact_messages' as any).insert({
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
        tenant_id: tenant?.id,
      });
      if (error) throw error;
      toast.success('Message sent! We\'ll get back to you shortly.');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <Helmet>
        <title>Contact Us | {brand}</title>
        <meta name="description" content={`Get in touch with ${brand} for questions about company reports, certificates, or your orders.`} />
      </Helmet>

      <section className="py-16 px-4" style={{ backgroundColor: 'var(--brand-primary)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#fff' }}>Contact Us</h1>
          <p className="mt-4 text-lg" style={{ color: 'rgba(255,255,255,0.8)' }}>
            We'd love to hear from you
          </p>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-10">
          {/* Info */}
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--brand-accent)' }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>Email</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>info@{tenant?.domain ?? 'example.com'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--brand-accent)' }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>Phone</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>+357 22 123456</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--brand-accent)' }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>Office</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nicosia, Cyprus</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="md:col-span-2 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-heading)' }}>Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                  style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)', backgroundColor: 'var(--bg-surface)' }}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-heading)' }}>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                  style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)', backgroundColor: 'var(--bg-surface)' }}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-heading)' }}>Subject</label>
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)', backgroundColor: 'var(--bg-surface)' }}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-heading)' }}>Message *</label>
              <textarea
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors resize-none"
                style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)', backgroundColor: 'var(--bg-surface)' }}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand-accent)' }}
            >
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </section>
    </PageLayout>
  );
}
