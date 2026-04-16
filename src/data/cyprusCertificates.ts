// ============================================================
// Cyprus Certificate Catalog — structured by entity type
// ============================================================

export type EntityType = 'company' | 'business_name' | 'partnership';

export interface CertificateGroup {
  label: string;
  primary: boolean;          // true = highlighted at top
  collapsible: boolean;      // false = always visible
  certificates: CertificateDefinition[];
}

export interface CertificateDefinition {
  slug: string;
  name: string;
  description: string;
  price: number;             // €40 each
  delivery: string;
  source: string;
  apostilleAvailable: boolean;
  badge?: string;            // e.g. "Most Requested"
}

export interface BundleDefinition {
  slug: string;
  name: string;
  description: string;
  certSlugs: string[];       // references to certificate slugs
  entityType: EntityType;
}

const PRICE = 40;
const DELIVERY = 'Next working day';
const SOURCE = 'Official certified document from the Cyprus Registrar';

// ── COMPANY CERTIFICATES ─────────────────────────────────────

const companyCertificates: CertificateGroup[] = [
  {
    label: 'Recommended Certificates for Compliance & Due Diligence',
    primary: true,
    collapsible: false,
    certificates: [
      {
        slug: 'certificate_good_standing',
        name: 'Certificate of Good Standing',
        description: 'Confirms the company is in good standing with the Cyprus Registrar, with no pending strikes or dissolution actions.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
        badge: 'Most Requested',
      },
      {
        slug: 'certificate_incorporation',
        name: 'Certificate of Incorporation',
        description: 'Official proof that the company is duly incorporated and registered in Cyprus.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
        badge: 'Most Requested',
      },
      {
        slug: 'certificate_registered_address',
        name: 'Certificate of Registered Office',
        description: 'Certifies the current registered office address of the company as filed with the Registrar.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
        badge: 'Most Requested',
      },
      {
        slug: 'certificate_of_director',
        name: 'Certificate of Directors & Secretary',
        description: 'Lists all current directors and company secretary as registered with the Cyprus Registrar.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
        badge: 'Most Requested',
      },
      {
        slug: 'certificate_shareholder',
        name: 'Certificate of Shareholders',
        description: 'Details all current shareholders and their shareholdings as filed with the Registrar.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
        badge: 'Most Requested',
      },
    ],
  },
  {
    label: 'Capital & Structure',
    primary: false,
    collapsible: true,
    certificates: [
      {
        slug: 'certificate_share_capital',
        name: 'Certificate of Share Capital',
        description: 'Confirms the authorised and issued share capital of the company.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
      },
      {
        slug: 'certificate_memorandum',
        name: 'Memorandum & Articles of Association',
        description: 'Certified copy of the company\'s constitutional documents governing its operations.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
      },
      {
        slug: 'certificate_reduction_capital',
        name: 'Certificate of Reduction of Capital',
        description: 'Confirms any reduction of the company\'s share capital as approved by the Registrar.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
      },
    ],
  },
  {
    label: 'Legal & Status',
    primary: false,
    collapsible: true,
    certificates: [
      {
        slug: 'certificate_change_name',
        name: 'Certificate of Change of Name',
        description: 'Confirms any official name changes the company has undergone since incorporation.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
      },
      {
        slug: 'certificate_commencement',
        name: 'Certificate of Commencement of Business',
        description: 'Certifies the date on which the company commenced its business operations.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
      },
      {
        slug: 'certificate_striking_off',
        name: 'Certificate of Striking Off',
        description: 'Confirms whether the company has been struck off the register or is in the process of being struck off.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
      },
      {
        slug: 'certificate_bankruptcy',
        name: 'Certificate of Bankruptcy',
        description: 'Certifies the bankruptcy or insolvency status of the company.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
      },
    ],
  },
  {
    label: 'Charges & Financing',
    primary: false,
    collapsible: true,
    certificates: [
      {
        slug: 'certificate_no_charges',
        name: 'Certificate of No Charges',
        description: 'Confirms that no charges or encumbrances are registered against the company.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
      },
      {
        slug: 'certificate_charges_encumbrances',
        name: 'Certificate of Charges / Encumbrances',
        description: 'Lists all registered charges, mortgages and encumbrances against the company.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
      },
      {
        slug: 'certificate_registration_charge',
        name: 'Certificate of Registration of Charge',
        description: 'Confirms the registration of a specific charge or mortgage with the Registrar.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
      },
    ],
  },
  {
    label: 'Historical',
    primary: false,
    collapsible: true,
    certificates: [
      {
        slug: 'certificate_historic',
        name: 'Historic Certificates by Date',
        description: 'Retrieve certified certificates reflecting the company\'s status at a specific historical date.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
      },
    ],
  },
];

// ── BUSINESS NAME CERTIFICATES ───────────────────────────────

const businessNameCertificates: CertificateGroup[] = [
  {
    label: 'Recommended Certificates',
    primary: true,
    collapsible: false,
    certificates: [
      {
        slug: 'bn_registration',
        name: 'Certificate of Registration',
        description: 'Official proof that the business name is duly registered with the Cyprus Registrar.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
        badge: 'Most Requested',
      },
      {
        slug: 'bn_good_standing',
        name: 'Certificate of Good Standing',
        description: 'Confirms the business name registration is in good standing with no pending actions.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
        badge: 'Most Requested',
      },
      {
        slug: 'bn_address',
        name: 'Certificate of Address of Place of Business',
        description: 'Certifies the registered address of the place of business as filed with the Registrar.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
        badge: 'Most Requested',
      },
    ],
  },
  {
    label: 'Additional Certificates',
    primary: false,
    collapsible: true,
    certificates: [
      {
        slug: 'bn_last_alteration',
        name: 'Certificate of Last Alteration',
        description: 'Confirms the most recent alteration made to the business name registration.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
      },
      {
        slug: 'bn_striking_off',
        name: 'Certificate of Striking Off',
        description: 'Confirms whether the business name has been struck off the register.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
      },
      {
        slug: 'bn_owner',
        name: 'Certificate of Owner / Proprietor',
        description: 'Certifies the registered owner or proprietor of the business name.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
      },
    ],
  },
];

// ── PARTNERSHIP CERTIFICATES ─────────────────────────────────

const partnershipCertificates: CertificateGroup[] = [
  {
    label: 'Recommended Certificates',
    primary: true,
    collapsible: false,
    certificates: [
      {
        slug: 'ps_registration',
        name: 'Certificate of Registration',
        description: 'Official proof that the partnership is duly registered with the Cyprus Registrar.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
        badge: 'Most Requested',
      },
      {
        slug: 'ps_good_standing',
        name: 'Certificate of Good Standing',
        description: 'Confirms the partnership registration is in good standing with no pending actions.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
        badge: 'Most Requested',
      },
      {
        slug: 'ps_partners',
        name: 'Certificate of Partners',
        description: 'Lists all current partners of the partnership as filed with the Registrar.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
        badge: 'Most Requested',
      },
    ],
  },
  {
    label: 'Additional Certificates',
    primary: false,
    collapsible: true,
    certificates: [
      {
        slug: 'ps_address',
        name: 'Certificate of Address of Place of Business',
        description: 'Certifies the registered address of the partnership\'s place of business.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
      },
      {
        slug: 'ps_last_alteration',
        name: 'Certificate of Last Alteration',
        description: 'Confirms the most recent alteration made to the partnership registration.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
      },
      {
        slug: 'ps_striking_off',
        name: 'Certificate of Striking Off',
        description: 'Confirms whether the partnership has been struck off the register.',
        price: PRICE, delivery: DELIVERY, source: SOURCE, apostilleAvailable: true,
      },
    ],
  },
];

// ── BUNDLES ──────────────────────────────────────────────────

export const bundles: BundleDefinition[] = [
  {
    slug: 'basic_compliance_pack',
    name: 'Basic Compliance Pack',
    description: 'Essential certificates for standard compliance checks.',
    certSlugs: ['certificate_good_standing', 'certificate_of_director', 'certificate_shareholder'],
    entityType: 'company',
  },
  {
    slug: 'full_company_pack',
    name: 'Full Company Pack',
    description: 'Comprehensive set of certificates for complete due diligence.',
    certSlugs: [
      'certificate_incorporation',
      'certificate_good_standing',
      'certificate_of_director',
      'certificate_shareholder',
      'certificate_registered_address',
    ],
    entityType: 'company',
  },
];

// ── EXPORTS ──────────────────────────────────────────────────

export const certificatesByEntity: Record<EntityType, CertificateGroup[]> = {
  company: companyCertificates,
  business_name: businessNameCertificates,
  partnership: partnershipCertificates,
};

export const entityTypeLabels: Record<EntityType, string> = {
  company: 'Company',
  business_name: 'Business Name',
  partnership: 'Partnership',
};

export function getAllCertificatesForEntity(entityType: EntityType): CertificateDefinition[] {
  return certificatesByEntity[entityType].flatMap((g) => g.certificates);
}

export const APOSTILLE_PRICE = 150;
export const URGENT_DELIVERY_PRICE = 20;
export const COURIER_DELIVERY_PRICE = 25;
export const CERT_PRICE = 40;
export const SERVICE_DELIVERY_FEE = 40;
export const VAT_RATE = 0.19;

/**
 * Map the legal_form string from API4ALL / company record to our EntityType.
 * Falls back to inferring from the Cyprus registration number prefix
 * (B = Business Name, C = Limited Company, P = Partnership).
 * Returns null when no mapping applies (e.g. Overseas Company).
 */
export function legalFormToEntityType(
  legalForm: string | null | undefined,
  regNo?: string | null,
): EntityType | null {
  if (legalForm) {
    const lf = legalForm.trim().toLowerCase();
    if (lf === 'business name') return 'business_name';
    if (lf === 'partnership' || lf === 'old partnership') return 'partnership';
    if (lf === 'limited company' || lf.includes('company')) return 'company';
  }
  // Infer from Cyprus registration number prefix
  if (regNo) {
    const prefix = regNo.trim().charAt(0).toUpperCase();
    if (prefix === 'B') return 'business_name';
    if (prefix === 'C') return 'company';
    if (prefix === 'P') return 'partnership';
  }
  return null;
}

/**
 * Get the top N primary (most-requested) certificates for an entity type.
 */
export function getPrimaryCertificatesForEntity(entityType: EntityType, limit = 3): CertificateDefinition[] {
  const groups = certificatesByEntity[entityType];
  const primary = groups.find((g) => g.primary);
  if (!primary) return [];
  return primary.certificates.slice(0, limit);
}
