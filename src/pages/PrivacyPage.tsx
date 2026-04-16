import React from 'react';
import { Helmet } from 'react-helmet-async';
import PageLayout from '../components/layout/PageLayout';
import { useTenant } from '../lib/tenant';

export default function PrivacyPage() {
  const { tenant } = useTenant();
  const brand = tenant?.brand_name ?? 'Companies House';

  return (
    <PageLayout>
      <Helmet>
        <title>Privacy Policy | {brand}</title>
        <meta name="description" content={`Privacy policy for ${brand}. Learn how we collect, use, and protect your personal data.`} />
      </Helmet>

      <section className="py-16 px-4" style={{ backgroundColor: 'var(--brand-primary)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#fff' }}>Privacy Policy</h1>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto prose prose-sm" style={{ color: 'var(--text-body)' }}>
          <h2 style={{ color: 'var(--text-heading)' }}>Data We Collect</h2>
          <p>We collect personal data you provide when creating an account, placing orders, or contacting us — including your name, email address, and billing information.</p>

          <h2 style={{ color: 'var(--text-heading)' }}>How We Use Your Data</h2>
          <p>Your data is used to process orders, deliver reports, manage your account, and communicate with you about your purchases. We do not sell your data to third parties.</p>

          <h2 style={{ color: 'var(--text-heading)' }}>Data Security</h2>
          <p>All data is transmitted over SSL-encrypted connections and stored in secure, GDPR-compliant infrastructure. Payment information is processed by Stripe and never stored on our servers.</p>

          <h2 style={{ color: 'var(--text-heading)' }}>Cookies</h2>
          <p>We use essential cookies for authentication and session management. Analytics cookies are used only with your consent to improve our services.</p>

          <h2 style={{ color: 'var(--text-heading)' }}>Your Rights</h2>
          <p>Under GDPR, you have the right to access, correct, or delete your personal data. Contact us at any time to exercise these rights.</p>

          <h2 style={{ color: 'var(--text-heading)' }}>Contact</h2>
          <p>For privacy-related inquiries, please contact our data protection team via the Contact Us page.</p>
        </div>
      </section>
    </PageLayout>
  );
}
