import React from 'react';
import { Helmet } from 'react-helmet-async';
import PageLayout from '../components/layout/PageLayout';
import { useTenant } from '../lib/tenant';

export default function TermsPage() {
  const { tenant } = useTenant();
  const brand = tenant?.brand_name ?? 'Companies House';

  return (
    <PageLayout>
      <Helmet>
        <title>Terms and condition | {brand}</title>
        <meta name="description" content={`Read the terms and condition for using ${brand} services.`} />
      </Helmet>

      <section className="py-16 px-4" style={{ backgroundColor: 'var(--brand-primary)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#fff' }}>Terms and condition</h1>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto prose prose-sm" style={{ color: 'var(--text-body)' }}>
          <h2 style={{ color: 'var(--text-heading)' }}>1. Introduction</h2>
          <p>These terms govern your use of {brand} and the services we provide. By accessing or using our platform you agree to be bound by these terms.</p>

          <h2 style={{ color: 'var(--text-heading)' }}>2. Services</h2>
          <p>We provide access to company intelligence data, reports, and certificates sourced from official registries. Reports are delivered digitally and are for informational purposes.</p>

          <h2 style={{ color: 'var(--text-heading)' }}>3. Orders and Payment</h2>
          <p>All orders are subject to acceptance. Payments are processed securely via Stripe. Prices include applicable VAT where required.</p>

          <h2 style={{ color: 'var(--text-heading)' }}>4. Delivery</h2>
          <p>Digital reports are delivered to your account immediately upon fulfilment. Delivery times vary by product type and are indicated at the time of purchase.</p>

          <h2 style={{ color: 'var(--text-heading)' }}>5. Refunds</h2>
          <p>Due to the digital nature of our products, refunds are only issued where a report could not be delivered or contains material errors attributable to us.</p>

          <h2 style={{ color: 'var(--text-heading)' }}>6. Liability</h2>
          <p>Information is provided "as is" from official sources. We do not warrant the completeness or accuracy of third-party data and accept no liability for decisions made based on our reports.</p>

          <h2 style={{ color: 'var(--text-heading)' }}>7. Privacy</h2>
          <p>Your data is handled in accordance with our Privacy Policy and applicable data protection legislation including GDPR.</p>

          <h2 style={{ color: 'var(--text-heading)' }}>8. Changes</h2>
          <p>We reserve the right to update these terms at any time. Continued use of the platform constitutes acceptance of the revised terms.</p>
        </div>
      </section>
    </PageLayout>
  );
}
