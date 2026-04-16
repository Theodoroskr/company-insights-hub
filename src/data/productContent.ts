// ============================================================
// Static product content — audited from live site
// ============================================================

export interface AccordionItem {
  title: string;
  body: string;
}

export interface ProductContent {
  description: string[];
  sectionHeading: string;
  accordionItems: AccordionItem[];
  deliveryNote: string;
}

// ── Structure Report ─────────────────────────────────────────

const structure: ProductContent = {
  description: [
    'The Structure Report provides a concise profile of a Cypriot company including its registered information as it appears in the files of the Department of Registrar of Companies and Official Receiver – the official authority of Cyprus.',
    "With this report, you gain a clear understanding of a company's structure and ownership information, which is fundamental to obtain before entering into any business agreement in Cyprus. It is also advisable to acquire the official registered information of a company in Cyprus for invoicing purposes, as this information can be vital in future litigation or debt collection cases.",
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
      body: 'Each company has an official registered name recorded at the Department of Registrar of Companies. No two companies can have the same registered name.',
    },
    {
      title: 'Registered Address',
      body: 'Each company must provide a registered address as a point of delivery for all legal and official documents.',
    },
    {
      title: 'Date of Registration',
      body: 'Each company has a registration date which represents the day it became registered. Also known as the incorporation date.',
    },
    {
      title: 'Capital',
      body: 'Most companies in Cyprus have a capital of between €1,000 and €1,700. A company can be registered without capital — known as a company Limited by Guarantees.',
    },
    {
      title: 'Charges',
      body: 'Information concerning all bank charges including mortgages, fixed or floating charges on company assets.',
    },
  ],
  deliveryNote:
    'Companieshousecyprus.com launches a fresh investigation for each new request. Our team obtains information from the Company File at the Department of Registrar of Companies and Official Receiver. The report is delivered to you within 3 working days.',
};

// ── Credit Report ─────────────────────────────────────────────

const creditOnline: ProductContent = {
  description: [
    'The Credit Report comprises all available data retrieved from official sources as well as interviews with the subject company, including information on its corporate structure and financial health.',
    'The Credit Report provides you with a comprehensive overview of a company registered in Cyprus and allows you to gain a better understanding of the structure and ownership of a company along with its activities, commercial information, and financial statements.',
  ],
  sectionHeading: 'THE CREDIT REPORT MAY INCLUDE THE FOLLOWING:',
  accordionItems: [
    {
      title: 'Shareholders',
      body: 'A Limited Liability Company must have between 1 and 50 shareholders.',
    },
    {
      title: 'Directors',
      body: 'A Limited Liability Company must have at least 1 director who can officially represent the company in its business affairs.',
    },
    {
      title: 'Secretary',
      body: "Each registered company must have 1 Secretary responsible for maintaining the company's books and holding the stamp.",
    },
    {
      title: 'Registration Number',
      body: 'Every company is assigned a unique registration number. The name and address can change but the number remains the same.',
    },
    {
      title: 'Registered Name & Address',
      body: 'Each company has an official registered name and must maintain a registered address for legal documents.',
    },
    {
      title: 'Capital & Charges',
      body: 'Most Cyprus companies have a capital of €1,000–€1,700. Bank charge information includes mortgages and fixed or floating charges.',
    },
    {
      title: 'Company Activities',
      body: "A description of the company's activities from its Memorandum and Articles of Association, plus the latest NACE code where available.",
    },
    {
      title: 'Shareholding & Director Relationships',
      body: "Our database stores comprehensive information on a company's related entities, including relationships that directors and/or shareholders have with other companies.",
    },
    {
      title: 'Detrimental Data',
      body: 'Information on voluntary liquidations, bankruptcy procedures or unpaid bills listed in our database, covering the subject company, related entities, shareholders and directors.',
    },
    {
      title: 'Payment Records',
      body: 'Information concerning payment incidents such as complaints from suppliers regarding late payments, plus references from suppliers commenting on payment behaviour.',
    },
    {
      title: 'Financial Statements',
      body: 'Financial statement analysis forms a key part of the Credit Report. We conduct a supplementary interview with the subject company to request and cross-check financial information.',
    },
    {
      title: 'Credit Scoring Assessment',
      body: 'Our expert team conducts an extensive analysis taking into account both financial and non-financial parameters to provide a credit scoring assessment.',
    },
  ],
  deliveryNote:
    'Companieshousecyprus.com launches a fresh investigation for each new request. Our team obtains information from the Company File and conducts an interview with the subject company. The Credit Report is delivered within 6 working days.',
};

// ── Due Diligence Report ──────────────────────────────────────

const dueDiligence: ProductContent = {
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
      body: 'Screen a Cyprus company for historical data including changes in the registered name or address, and changes in the corporate structure such as change in directors, shareholders or company secretary.',
    },
    {
      title: 'Global KYC Screenings',
      body: 'KYC (Know Your Customer) screenings identify potential business risks and ensure compliance with global legislation. Covers Sanctions lists, Enforcement lists and PEP (Politically Exposed Persons) lists.',
    },
    {
      title: 'Negative & Local Language Media Checks',
      body: 'Screen a company for any adverse information published using specialised subscription databases and local Greek internet and media databases.',
    },
    {
      title: 'Site Check',
      body: 'A researcher physically visits the registered address to verify if the company is active and operational, gathering evidence of business premises, company branding, logistics operations and proof of employees.',
    },
    {
      title: 'Reputation Check',
      body: "Phase 1: obtain information on related entities, business associates, clients and suppliers. Phase 2: interviews with identified entities to obtain trade references and assess the company's market reputation.",
    },
  ],
  deliveryNote:
    'Prior to the report, our team assesses your information requirements. A dedicated researcher oversees all required activities and compiles results into one comprehensive report with a concise analysis of the company and our findings.',
};

// ── Certificates (shared) ─────────────────────────────────────

const certificate: ProductContent = {
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
      body: "An official document providing the name, address, nationality and appointment date of the company's Directors and Secretary.",
    },
    {
      title: 'Certificate of Shareholders',
      body: 'An official document outlining information about shareholders, including name, address, class of shares and number of shares held.',
    },
    {
      title: 'Certificate of Registered Office',
      body: 'Outlines the exact Registered Office for a company.',
    },
    {
      title: 'Memorandum & Articles of Association',
      body: "A statutory document containing the company's name, registered office, share capital details, currency, price per share, shareholder names and internal management and governance.",
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
    'We assist you in assessing the type of documents required. A researcher physically visits the Department of Registrar of Companies and Official Receiver to request all necessary documents. Scanned copies are provided via email; hard copies can be sent via courier. We can also assist with apostille of company documents.',
};

// ── Competitors Analysis Report ───────────────────────────────

const competitors: ProductContent = {
  description: [
    'Do you know with certainty how you rate against your competition? Our in-depth competitors (peer) analysis reports provide you with a benchmark of your company against your main competitors.',
    'Based on empirical data, forecasts are performed assisting you in making better informed decisions.',
  ],
  sectionHeading: 'OUR COMPETITORS ANALYSIS REPORTS INCLUDE:',
  accordionItems: [
    {
      title: 'Executive Summary',
      body: 'A concise overview of the competitive landscape and key findings.',
    },
    {
      title: 'Industry Outlook & Performance',
      body: "Assessment of the industry's current performance and future outlook.",
    },
    {
      title: 'Competitive Landscape & Financial Analysis',
      body: 'Analysis of top companies, market shares and revenues.',
    },
    {
      title: 'Key Financial Statements',
      body: 'Balance sheet & Profit/loss statement and other important financial items.',
    },
    {
      title: 'Ratio Analysis',
      body: "Profitability, performance, liquidity and financial leverage ratios, plus other key statistics such as Altman's Z score.",
    },
    {
      title: 'Operating & Free Cash Flow Comparisons',
      body: 'Cash flow comparisons available as an add-on.',
    },
    {
      title: 'Visual Content & Conclusions',
      body: 'Powerful charts, graphs and tables, plus conclusions and key findings.',
    },
  ],
  deliveryNote:
    'Our reports are prepared by financial analysts with extensive experience gathering and analyzing empirical data. Data is sourced from public sources and our in-house database, maximizing reliability and accuracy.',
};

// ── Industry Analysis Report ──────────────────────────────────

const industry: ProductContent = {
  description: [
    'Are you familiar with market characteristics affecting your growth strategies? Our in-depth analysis reports provide you with a comprehensive review of key figures and facts of the industry you wish to understand.',
    'Based on empirical data, forecasts are performed assisting you in making better informed decisions. It entails a detailed assessment including size, key statistics, competition, financial and ratio analysis.',
  ],
  sectionHeading: 'OUR INDUSTRY ANALYSIS REPORTS INCLUDE:',
  accordionItems: [
    {
      title: 'Executive Summary',
      body: 'A concise overview of the industry and key findings.',
    },
    {
      title: 'Industry Outlook & Performance',
      body: 'Competitive landscape and peer analysis including top companies, market share and revenues.',
    },
    {
      title: 'Strategic Planning Techniques',
      body: 'SWOT, PESTEL and other key strategic analysis frameworks.',
    },
    {
      title: 'Financial Analysis',
      body: 'Analysis based on financial statements, Operating CF and Free Cash flow comparisons (add-on).',
    },
    {
      title: 'Ratio Analysis',
      body: "Profitability, performance, liquidity and financial leverage. Other key statistics including Altman's Z score, DOL, DFL, DTL and Interest Coverage Ratios.",
    },
    {
      title: 'Visual Content & Conclusions',
      body: 'Powerful charts, graphs and tables, plus conclusions and key findings.',
    },
  ],
  deliveryNote:
    'Our reports are prepared by financial analysts with extensive experience gathering and analyzing empirical data from public sources and our in-house database.',
};

// ── Global Structure Report ───────────────────────────────────

const globalStructure: ProductContent = {
  description: [
    'The Global Structure Report provides key registration data, directors, shareholders and corporate hierarchy for companies across 200+ countries — delivered instantly via our worldwide API network.',
    'Ideal for pre-screening counterparties, validating supplier details, or building a baseline company profile before entering into a business relationship internationally.',
  ],
  sectionHeading: 'THE GLOBAL STRUCTURE REPORT INCLUDES:',
  accordionItems: [
    { title: 'Company Registration Details', body: 'Official registration number, date of incorporation, and jurisdiction of registration.' },
    { title: 'Directors & Officers', body: 'Names, positions, and appointment dates of directors and officers where available from official sources.' },
    { title: 'Shareholders & Ownership', body: 'Ownership percentages, shareholder names and beneficial ownership data where disclosed.' },
    { title: 'Registered Address', body: 'The official registered address as filed with the local company registry.' },
    { title: 'Company Status', body: 'Current status of the entity — active, dissolved, struck off, or in liquidation.' },
    { title: 'Legal Form & Jurisdiction', body: 'The legal form (LLC, PLC, etc.) and the jurisdiction under which the company operates.' },
    { title: 'Share Capital', body: 'Authorised and issued share capital structure where available.' },
  ],
  deliveryNote: 'Reports are generated instantly using our global API network covering 200+ countries. Data is sourced from official registries and licensed providers worldwide.',
};

// ── Global KYB Report ─────────────────────────────────────────

const globalKyb: ProductContent = {
  description: [
    'The Global KYB (Know Your Business) Report is a comprehensive instant company intelligence report covering 200+ countries. It delivers ownership structure, directors, financial indicators and risk assessment in seconds.',
    'Essential for compliance teams, risk managers and procurement departments who need to verify international counterparties quickly and reliably.',
  ],
  sectionHeading: 'THE GLOBAL KYB REPORT INCLUDES:',
  accordionItems: [
    { title: 'Company Registration Details', body: 'Official registration number, date and jurisdiction sourced from the relevant national registry.' },
    { title: 'Directors & Officers', body: 'Full board composition with names, positions, nationalities and appointment dates.' },
    { title: 'Shareholders & UBO', body: 'Ownership chain including Ultimate Beneficial Owner (UBO) data where available.' },
    { title: 'Financial Indicators', body: 'Key financial metrics including turnover, profit, assets and liabilities where disclosed.' },
    { title: 'Risk Scoring & Credit Assessment', body: 'Automated risk score and credit assessment based on available financial and non-financial parameters.' },
    { title: 'Company Status & Legal Form', body: 'Current status, legal form, and any adverse filings such as liquidation or insolvency proceedings.' },
    { title: 'Contact & Address Information', body: 'Registered address, trading address, phone, email and website where available.' },
    { title: 'Industry Classification', body: 'NACE codes or local industry classifications describing the company activities.' },
  ],
  deliveryNote: 'Reports are generated instantly via our global API network. Data is sourced from official registries and licensed data providers across 200+ countries.',
};

// ── Tab definitions ───────────────────────────────────────────

export interface TabDef {
  slug: string;
  label: string;
  content: ProductContent;
}

export const PRODUCT_TABS: TabDef[] = [
  { slug: 'structure',                 label: 'Structure Report',                    content: structure },
  { slug: 'credit-online',             label: 'Credit Report',                       content: creditOnline },
  { slug: 'due_diligence_report',      label: 'Due Diligence Report',               content: dueDiligence },
  { slug: 'certificate_of_director',   label: 'Certificate of Directors & Secretary', content: certificate },
  { slug: 'certificate_shareholder',   label: 'Certificate of Shareholders',         content: certificate },
  { slug: 'certificate_incorporation', label: 'Certificate of Incorporation',         content: certificate },
  { slug: 'certificate_registered_address', label: 'Certificate of Registered Office', content: certificate },
  { slug: 'certificate_good_standing', label: 'Certificate of Good Standing',         content: certificate },
  { slug: 'certificate_memorandum',    label: 'Memorandum & Articles of Association', content: certificate },
  { slug: 'certificate_bankruptcy',    label: 'Certificate of Bankruptcy',            content: certificate },
  { slug: 'certificate_change_name',   label: 'Certificate of Change of Name',        content: certificate },
  { slug: 'certificate_share_capital', label: 'Certificate of Share Capital',         content: certificate },
  { slug: 'certificate_historic',      label: 'Historic Certificates by Date',        content: certificate },
  { slug: 'competitors',               label: 'Competitors Analysis Report',          content: competitors },
  { slug: 'industry',                  label: 'Industry Analysis Report',             content: industry },
];

export const SLUG_TO_TAB: Record<string, TabDef> = Object.fromEntries(
  PRODUCT_TABS.map((t) => [t.slug, t])
);

// Legacy / alternate slug aliases
const ALIASES: Record<string, string> = {
  'kyb': 'structure',
  'cyprus-kyb-report': 'structure',
  'cyprus-structure-report': 'structure',
  'credit': 'credit-online',
  'cyprus-credit-report': 'credit-online',
  'certificate': 'certificate_of_director',
  'cyprus-certificate': 'certificate_of_director',
};

export function resolveSlug(raw: string): TabDef | null {
  if (!raw) return PRODUCT_TABS[0];
  const resolved = ALIASES[raw] ?? raw;
  return SLUG_TO_TAB[resolved] ?? PRODUCT_TABS[0];
}
