import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import PageLayout from '../components/layout/PageLayout';
import OrderReportModal from '../components/orders/OrderReportModal';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '../lib/tenant.tsx';
import type { Product } from '../types/database';

// ── Static content per product type ───────────────────────────

interface AccordionItem {
  title: string;
  body: string;
}

interface ProductContent {
  description: string[];
  sectionHeading: string;
  accordionItems: AccordionItem[];
  deliveryNote: string;
}

const CERTIFICATE_CONTENT: ProductContent = {
  description: [
    'Company Certificates are the official documents of a company registered in Cyprus, issued by the local Department of Registrar of Companies and Official Receiver.',
    'Company Certificates, when apostilled, are also valid for international use for legal purposes and as such, are a vital part of due diligence, court proceedings and debt collection cases.',
  ],
  sectionHeading: 'OFFICIAL CERTIFICATES FOR COMPANIES REGISTERED IN CYPRUS INCLUDE THE FOLLOWING:',
  accordionItems: [
    {
      title: 'Certificate of Incorporation',
      body: "An official document which outlines the company's legal form and the date it was incorporated.",
    },
    {
      title: 'Certificate of Directors & Secretary',
      body: "An official document which provides the name, address, nationality and appointment date of the company's Directors and Secretary.",
    },
    {
      title: 'Certificate of Shareholders',
      body: 'An official document which outlines information concerning the shareholders of a company, including name, address, the class (value) of shares and the number of shares.',
    },
    {
      title: 'Certificate of Registered Office',
      body: 'Outlines the exact Registered Office for a company.',
    },
    {
      title: 'Memorandum & Articles of Association',
      body: "A statutory document containing the company's name, registered office, details about share capital, currency, price per share, names of shareholders, amount of shares held, and internal management and governance.",
    },
    {
      title: 'Financial Statements',
      body: 'Can be obtained if they have been submitted to the Department of Registrar of Companies and Official Receiver.',
    },
    {
      title: 'Historical Certificates',
      body: 'Can be obtained for a change of company name, change in directors or secretary, or a change in shareholders.',
    },
  ],
  deliveryNote:
    'By considering your requirements, we can assist you in assessing the type of documents required. A member of our research team will then physically visit the Department of Registrar of Companies and Official Receiver to request all the necessary documents. Scanned copies of the documents are then provided to you via email. Hard copies can be sent via courier. We can also assist you with the apostille of company documents.',
};

const PRODUCT_CONTENT: Record<string, ProductContent> = {
  structure: {
    description: [
      'The Structure Report provides a concise profile of a Cypriot company including its registered information as it appears in the files of the Department of Registrar of Companies and Official Receiver – the official authority of Cyprus.',
      'With this report, you gain a clear understanding of a company\'s structure and ownership information, which is fundamental to obtain before entering into any business agreement in Cyprus. It is also advisable to acquire the official registered information of a company in Cyprus for invoicing purposes, as this information can be vital in future litigation or debt collection cases.',
    ],
    sectionHeading: 'THE STRUCTURE REPORT MAY INCLUDE THE FOLLOWING:',
    accordionItems: [
      {
        title: 'Shareholders',
        body: 'A Limited Liability Company must have between 1 and 50 shareholders. Only Public companies are allowed more than 50 shareholders.',
      },
      {
        title: 'Directors',
        body: 'A Limited Liability Company must have at least 1 director. The Board of Directors is appointed by the shareholders. A director is the person who can officially represent the company in its business affairs.',
      },
      {
        title: 'Secretary',
        body: "Each registered company must have 1 Secretary. The Secretary is responsible for maintaining the company's books and holding the stamp of the company.",
      },
      {
        title: 'Registration Number',
        body: 'Every company registered in Cyprus is assigned a unique registration number which serves as the identifier of a Cypriot legal entity. The name and address can change but the registration number will remain the same.',
      },
      {
        title: 'Registered Name',
        body: 'Each company has an official registered name recorded at the Department of Registrar of Companies. A company can change its registered name at any time, however no two companies can have the same registered name.',
      },
      {
        title: 'Registered Address',
        body: 'Each company in Cyprus must provide a registered address. This address must be maintained as a point of delivery for all legal and official documents.',
      },
      {
        title: 'Date of Registration',
        body: 'Each company has a registration date which represents the day it became registered at the Department of Registrar of Companies and Official Receiver. Also known as the incorporation date.',
      },
      {
        title: 'Capital',
        body: 'Most companies in Cyprus have a capital of between €1,000 and €1,700. A company can be registered in Cyprus without capital and it is known as a company Limited by Guarantees.',
      },
      {
        title: 'Charges',
        body: 'Information concerning all bank charges relating to a company including mortgages, fixed or floating charges on company assets.',
      },
    ],
    deliveryNote:
      'Companieshousecyprus.com launches a fresh investigation for each new request to ensure that you receive up to date information each time you place an order for a Structure Report. Our team of researchers obtain information from the Company File located at the Department of Registrar of Companies and Official Receiver. This information is then processed and compiled into a concise Company Structure Report which is delivered to you within 3 working days.',
  },

  due_diligence_report: {
    description: [
      'Due Diligence Reports are assessed independently and are recommended for complex cases that require specialised investigations, procedures or data that is not included in other reports.',
    ],
    sectionHeading: 'THE DUE DILIGENCE REPORT MAY INCLUDE THE FOLLOWING:',
    accordionItems: [
      {
        title: 'Relationship Check',
        body: 'Screens a Cypriot company for both local and international relationships with other entities. Shareholders and directors can also be screened to retrieve information concerning other company interests in Cyprus and abroad.',
      },
      {
        title: 'Historical Checks',
        body: 'Screen a Cyprus company to obtain historical data including changes in the registered name or address, as well as changes in the corporate structure such as change in directors, shareholders or company secretary.',
      },
      {
        title: 'Global KYC Screenings',
        body: 'KYC (Know Your Customer) screenings allow you to identify potential business risks and ensure compliance in line with global legislation. Covers Sanctions lists, Enforcement lists and PEP (Politically Exposed Persons) lists.',
      },
      {
        title: 'Negative & Local Language Media Checks',
        body: 'Screen a company for any adverse information published concerning the subject, using specialised subscription databases and local Greek internet and media databases.',
      },
      {
        title: 'Site Check',
        body: 'A researcher physically visits the registered address to verify if the company is active and operational. Obtains evidence of business premises, company name/logo/branding, transportation vehicles, logistic operations and proof of employees.',
      },
      {
        title: 'Reputation Check',
        body: 'Phase 1: obtain information concerning related entities, business associates, clients and suppliers. Phase 2: interviews with identified entities to obtain trade references and company reputation within the market.',
      },
    ],
    deliveryNote:
      'Prior to a report, our team assesses your information requirements in order to establish what actions are required. A member of our research team will be assigned to perform your Due Diligence investigation and will oversee all required activities and compile the results into one comprehensive report.',
  },
};

// Certificate slug prefixes map to shared content
const CERTIFICATE_SLUGS = [
  'certificate_of_director',
  'certificate_shareholder',
  'certificate_incorporation',
  'certificate_registered_address',
  'certificate_good_standing',
  'certificate_memorandum',
  'certificate_bankruptcy',
  'certificate_change_name',
  'certificate_share_capital',
  'certificate_historic',
  // legacy single slug
  'certificate',
];

function isCertificateSlug(slug: string): boolean {
  return CERTIFICATE_SLUGS.some((s) => slug === s) || slug.startsWith('certificate');
}

// ── AccordionRow ──────────────────────────────────────────────

function AccordionRow({ item }: { item: AccordionItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border rounded-lg overflow-hidden transition-all"
      style={{
        borderColor: open ? 'var(--brand-accent)' : 'var(--bg-border)',
        borderLeftWidth: open ? '4px' : '1px',
      }}
    >
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-gray-50"
        style={{ color: 'var(--text-heading)' }}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{item.title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--brand-accent)' }} />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--text-muted)' }} />
        )}
      </button>
      <div
        className="overflow-hidden transition-all duration-200"
        style={{ maxHeight: open ? '400px' : '0' }}
      >
        <p className="px-4 pb-4 text-sm" style={{ color: 'var(--text-body)' }}>
          {item.body}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function ProductLandingPage() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('type') ?? '';
  const { tenant } = useTenant();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!tenant || !slug) return;
    setLoading(true);
    supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProduct({
            ...(data as unknown as Product),
            available_speeds: Array.isArray((data as any).available_speeds)
              ? (data as any).available_speeds
              : [],
          });
        }
        setLoading(false);
      });
  }, [tenant?.id, slug]);

  // Determine content
  const isCert = isCertificateSlug(slug);
  const content: ProductContent | null =
    PRODUCT_CONTENT[slug] ?? (isCert ? CERTIFICATE_CONTENT : null);

  const pageTitle = product?.name ?? (loading ? 'Loading…' : 'Report');

  const handleSample = () => {
    if (product?.sample_pdf_url) {
      window.open(product.sample_pdf_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <PageLayout>
      <Helmet>
        <title>{pageTitle} | Companies House Cyprus</title>
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-sm mb-6 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <a href="/" className="hover:underline" style={{ color: 'var(--text-muted)' }}>Home</a>
          <span>›</span>
          <span style={{ color: 'var(--text-body)' }}>{pageTitle}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* ── LEFT COLUMN ── */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-6 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                ))}
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-heading)' }}>
                  {pageTitle}
                </h2>

                {content ? (
                  <>
                    {/* Description */}
                    <div className="space-y-3 mb-6">
                      {content.description.map((para, i) => (
                        <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--text-body)' }}>
                          {para}
                        </p>
                      ))}
                    </div>

                    {/* Section heading */}
                    <h3 className="text-sm font-semibold tracking-wide mb-4 uppercase" style={{ color: 'var(--text-subheading)' }}>
                      {content.sectionHeading}
                    </h3>

                    {/* Accordion */}
                    <div className="space-y-2 mb-8">
                      {content.accordionItems.map((item) => (
                        <AccordionRow key={item.title} item={item} />
                      ))}
                    </div>

                    {/* Delivery note */}
                    <p className="text-sm leading-relaxed p-4 rounded-lg" style={{ color: 'var(--text-body)', backgroundColor: 'var(--bg-subtle)' }}>
                      {content.deliveryNote}
                    </p>
                  </>
                ) : (
                  /* Fallback: use DB description */
                  product?.description ? (
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-body)' }}>
                      {product.description}
                    </p>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No description available.</p>
                  )
                )}
              </>
            )}
          </div>

          {/* ── RIGHT COLUMN (sticky card) ── */}
          <div className="lg:w-[380px] shrink-0">
            <div className="sticky top-6 border rounded-xl p-6" style={{ borderColor: 'var(--bg-border)' }}>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                  ))}
                </div>
              ) : (
                <>
                  {/* Icon */}
                  <div className="flex justify-center mb-4">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                      style={{ backgroundColor: 'var(--bg-subtle)' }}
                    >
                      {isCert ? '📄' : product?.type === 'structure' ? '📋' : product?.type === 'kyb' ? '🔍' : product?.type === 'credit' ? '📊' : '📋'}
                    </div>
                  </div>

                  {/* Product name */}
                  <h3 className="text-lg font-semibold text-center mt-3" style={{ color: 'var(--text-heading)' }}>
                    {pageTitle}
                  </h3>

                  {/* Price */}
                  <div className="text-center mt-3">
                    <span className="text-3xl font-bold" style={{ color: 'var(--brand-accent)' }}>
                      €{product ? product.base_price.toFixed(0) : '—'}
                    </span>
                  </div>
                  <p className="text-sm text-center mt-1" style={{ color: 'var(--text-muted)' }}>
                    excluding VAT
                  </p>

                  {/* Sample button */}
                  <button
                    onClick={handleSample}
                    disabled={!product?.sample_pdf_url}
                    className="w-full mt-4 py-2 rounded-md text-sm font-medium border transition-all hover:opacity-80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      borderColor: 'var(--brand-accent)',
                      color: 'var(--brand-accent)',
                    }}
                  >
                    Sample
                  </button>

                  {/* Add to Cart */}
                  <button
                    onClick={() => setModalOpen(true)}
                    disabled={!product}
                    className="w-full mt-2 py-2 rounded-md text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    Add to Cart
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {product && (
        <OrderReportModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          preselectedProduct={product}
        />
      )}
    </PageLayout>
  );
}
