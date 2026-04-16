import React from 'react';
import { Helmet } from 'react-helmet-async';
import PageLayout from '../components/layout/PageLayout';
import { useTenant } from '../lib/tenant';

export default function AboutPage() {
  const { tenant } = useTenant();
  const brand = tenant?.brand_name ?? 'Companies House';

  return (
    <PageLayout>
      <Helmet>
        <title>About Us | {brand}</title>
        <meta name="description" content={`Learn more about ${brand} — your trusted source for official company intelligence and registry data.`} />
      </Helmet>

      {/* Hero */}
      <section className="py-16 px-4" style={{ backgroundColor: 'var(--brand-primary)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#fff' }}>About Us</h1>
          <p className="mt-4 text-lg" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Your trusted partner for official company intelligence
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-6 text-base leading-relaxed" style={{ color: 'var(--text-body)' }}>
          <p>
            <strong style={{ color: 'var(--text-heading)' }}>{brand}</strong> is a leading provider of company
            intelligence, offering instant access to official registry data, corporate reports, and compliance
            documentation.
          </p>
          <p>
            We bridge the gap between public registries and the professionals who need reliable company data —
            accountants, lawyers, compliance officers, and business decision-makers.
          </p>
          <h2 className="text-xl font-semibold pt-4" style={{ color: 'var(--text-heading)' }}>Our Mission</h2>
          <p>
            To make official company data accessible, instant, and easy to understand. We transform complex
            registry filings into clear, actionable intelligence that supports informed decision-making.
          </p>
          <h2 className="text-xl font-semibold pt-4" style={{ color: 'var(--text-heading)' }}>What We Offer</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Official company structure and credit reports</li>
            <li>Certificates of incorporation, good standing, and incumbency</li>
            <li>Director and shareholder intelligence</li>
            <li>Ongoing company monitoring and change alerts</li>
            <li>KYB (Know Your Business) compliance solutions</li>
          </ul>
          <h2 className="text-xl font-semibold pt-4" style={{ color: 'var(--text-heading)' }}>Why Choose Us</h2>
          <p>
            All data is sourced directly from official registries, ensuring accuracy and reliability. Reports
            are delivered digitally within minutes, and our platform is secured with enterprise-grade encryption
            and GDPR-compliant data handling.
          </p>
        </div>
      </section>
    </PageLayout>
  );
}
