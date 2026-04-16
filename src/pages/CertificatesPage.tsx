import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ShieldCheck,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Package,
  Building2,
  Briefcase,
  Users,
  Check,
  Stamp,
  Truck,
  Zap,
  FileText,
} from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import { useCart } from '../contexts/CartContext';
import { useTenant } from '../lib/tenant';
import {
  certificatesByEntity,
  entityTypeLabels,
  bundles,
  getAllCertificatesForEntity,
  APOSTILLE_PRICE,
  URGENT_DELIVERY_PRICE,
  COURIER_DELIVERY_PRICE,
  SERVICE_DELIVERY_FEE,
  CERT_PRICE,
  VAT_RATE,
  type EntityType,
  type CertificateDefinition,
  type CertificateGroup,
  type BundleDefinition,
} from '../data/cyprusCertificates';

// ── Entity type tab icons ────────────────────────────────────
const entityIcons: Record<EntityType, React.ReactNode> = {
  company: <Building2 className="w-4 h-4" />,
  business_name: <Briefcase className="w-4 h-4" />,
  partnership: <Users className="w-4 h-4" />,
};

// ── Certificate Card ─────────────────────────────────────────
function CertCard({
  cert,
  selected,
  apostille,
  onToggle,
  onToggleApostille,
}: {
  cert: CertificateDefinition;
  selected: boolean;
  apostille: boolean;
  onToggle: () => void;
  onToggleApostille: () => void;
}) {
  return (
    <div
      className="rounded-xl border p-5 flex flex-col transition-all relative"
      style={{
        borderColor: selected ? 'var(--brand-accent)' : 'var(--bg-border)',
        backgroundColor: selected ? 'rgba(37,99,235,0.03)' : 'var(--bg-surface)',
        borderWidth: selected ? '2px' : '1px',
      }}
    >
      {cert.badge && (
        <div
          className="absolute -top-2.5 left-4 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: 'var(--brand-accent)' }}
        >
          <Star className="w-2.5 h-2.5" /> {cert.badge}
        </div>
      )}

      <h3 className="text-sm font-bold pr-6" style={{ color: 'var(--text-heading)' }}>
        {cert.name}
      </h3>
      <p className="text-xs mt-1.5 flex-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
        {cert.description}
      </p>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-xl font-extrabold" style={{ color: 'var(--text-heading)' }}>
          €{cert.price}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+ VAT</span>
      </div>

      <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {cert.delivery}
        </span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Official
        </span>
      </div>

      {/* Apostille indicator (selection moved to order summary) */}

      <button
        onClick={onToggle}
        className="mt-3 w-full py-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.98]"
        style={{
          backgroundColor: selected ? 'var(--status-dissolved)' : 'var(--brand-accent)',
          color: '#fff',
        }}
      >
        {selected ? 'Remove' : 'Add to Order'}
      </button>

      <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--text-muted)' }}>
        {cert.source}
      </p>
    </div>
  );
}

// ── Collapsible Section ──────────────────────────────────────
function CertSection({
  group,
  selectedSlugs,
  apostilleSlugs,
  onToggle,
  onToggleApostille,
}: {
  group: CertificateGroup;
  selectedSlugs: Set<string>;
  apostilleSlugs: Set<string>;
  onToggle: (slug: string) => void;
  onToggleApostille: (slug: string) => void;
}) {
  const [open, setOpen] = useState(!group.collapsible);

  return (
    <div className="mb-8">
      {group.collapsible ? (
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between py-3 px-1 group"
        >
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-heading)' }}>
            {group.label}
          </h2>
          {open ? (
            <ChevronUp className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          ) : (
            <ChevronDown className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          )}
        </button>
      ) : (
        <h2 className="text-lg font-bold mb-4 px-1" style={{ color: 'var(--text-heading)' }}>
          {group.label}
        </h2>
      )}

      {open && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {group.certificates.map((cert) => (
            <CertCard
              key={cert.slug}
              cert={cert}
              selected={selectedSlugs.has(cert.slug)}
              apostille={apostilleSlugs.has(cert.slug)}
              onToggle={() => onToggle(cert.slug)}
              onToggleApostille={() => onToggleApostille(cert.slug)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bundle Card ──────────────────────────────────────────────
function BundleCard({
  bundle,
  allCerts,
  onSelect,
  isActive,
}: {
  bundle: BundleDefinition;
  allCerts: CertificateDefinition[];
  onSelect: () => void;
  isActive: boolean;
}) {
  const certs = bundle.certSlugs
    .map((s) => allCerts.find((c) => c.slug === s))
    .filter(Boolean) as CertificateDefinition[];

  return (
    <div
      className="rounded-xl border p-5 transition-all"
      style={{
        borderColor: isActive ? 'var(--brand-accent)' : 'var(--bg-border)',
        backgroundColor: isActive ? 'rgba(37,99,235,0.03)' : 'var(--bg-surface)',
        borderWidth: isActive ? '2px' : '1px',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Package className="w-5 h-5" style={{ color: 'var(--brand-accent)' }} />
        <h3 className="font-bold" style={{ color: 'var(--text-heading)' }}>
          {bundle.name}
        </h3>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        {bundle.description}
      </p>
      <ul className="space-y-1 mb-3">
        {certs.map((c) => (
          <li key={c.slug} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-body)' }}>
            <Check className="w-3 h-3" style={{ color: 'var(--status-active)' }} />
            {c.name}
          </li>
        ))}
      </ul>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xl font-extrabold" style={{ color: 'var(--text-heading)' }}>
          €{CERT_PRICE * certs.length}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          (€{CERT_PRICE} × {certs.length} certificates)
        </span>
      </div>
      <button
        onClick={onSelect}
        className="w-full py-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.98]"
        style={{
          backgroundColor: isActive ? 'var(--status-dissolved)' : 'var(--brand-primary)',
          color: '#fff',
        }}
      >
        {isActive ? 'Remove Bundle' : 'Select Bundle'}
      </button>
      <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--text-muted)' }}>
        Bundle price calculated at €{CERT_PRICE} per certificate
      </p>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function CertificatesPage() {
  const { tenant } = useTenant();
  const { addCertificateOrder } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const brand = tenant?.brand_name ?? 'Companies House Cyprus';

  const entityParam = searchParams.get('entity') as EntityType | null;
  const [entityType, setEntityType] = useState<EntityType>(
    entityParam && ['company', 'business_name', 'partnership'].includes(entityParam)
      ? entityParam
      : 'company'
  );

  // Sync entity type from URL param
  useEffect(() => {
    if (entityParam && ['company', 'business_name', 'partnership'].includes(entityParam)) {
      setEntityType(entityParam);
    }
  }, [entityParam]);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [apostilleSlugs, setApostilleSlugs] = useState<Set<string>>(new Set());
  const [urgentDelivery, setUrgentDelivery] = useState(false);
  const [courierDelivery, setCourierDelivery] = useState(false);
  const [companyName, setCompanyName] = useState(searchParams.get('companyName') ?? '');
  const [regNo, setRegNo] = useState(searchParams.get('regNo') ?? '');

  const groups = certificatesByEntity[entityType];
  const allCerts = useMemo(() => getAllCertificatesForEntity(entityType), [entityType]);
  const entityBundles = bundles.filter((b) => b.entityType === entityType);

  // Reset selections on entity type change
  const handleEntityChange = useCallback((type: EntityType) => {
    setEntityType(type);
    setSelectedSlugs(new Set());
    setApostilleSlugs(new Set());
  }, []);

  const toggleCert = useCallback((slug: string) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
        // Also remove apostille
        setApostilleSlugs((ap) => { const n = new Set(ap); n.delete(slug); return n; });
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

  const toggleApostille = useCallback((slug: string) => {
    setApostilleSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const selectBundle = useCallback((bundle: BundleDefinition) => {
    setSelectedSlugs((prev) => {
      const allSelected = bundle.certSlugs.every((s) => prev.has(s));
      const next = new Set(prev);
      if (allSelected) {
        bundle.certSlugs.forEach((s) => next.delete(s));
      } else {
        bundle.certSlugs.forEach((s) => next.add(s));
      }
      return next;
    });
  }, []);

  // ── Price calculations ───────────────────────────────────
  const certCount = selectedSlugs.size;
  const certSubtotal = certCount * CERT_PRICE;
  const serviceDeliveryTotal = certCount * SERVICE_DELIVERY_FEE;
  const apostilleCount = apostilleSlugs.size;
  const apostilleTotal = apostilleCount * APOSTILLE_PRICE;
  const urgentTotal = urgentDelivery ? URGENT_DELIVERY_PRICE * certCount : 0;
  const courierTotal = courierDelivery ? COURIER_DELIVERY_PRICE : 0;
  const subtotal = certSubtotal + serviceDeliveryTotal + apostilleTotal + urgentTotal + courierTotal;
  const vat = parseFloat((subtotal * VAT_RATE).toFixed(2));
  const grandTotal = subtotal + vat;

  const handleAddToCart = () => {
    if (certCount === 0 || !companyName.trim()) return;
    const selectedCerts = allCerts.filter((c) => selectedSlugs.has(c.slug));
    addCertificateOrder({
      entityType,
      companyName: companyName.trim(),
      regNo: regNo.trim() || null,
      certificates: selectedCerts.map((c) => ({
        slug: c.slug,
        name: c.name,
        price: c.price,
        apostille: apostilleSlugs.has(c.slug),
      })),
      urgentDelivery,
      courierDelivery,
    });
    navigate('/cart');
  };

  return (
    <PageLayout>
      <Helmet>
        <title>Order Certificates | {brand}</title>
        <meta
          name="description"
          content="Order official certified certificates from the Cyprus Registrar. Companies, Business Names and Partnerships. Next working day delivery."
        />
      </Helmet>

      {/* Hero */}
      <section className="py-14 px-4" style={{ backgroundColor: 'var(--brand-primary)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#fff' }}>
            Order Official Cyprus Certificates
          </h1>
          <p className="mt-3 text-base md:text-lg" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Official certified certificates from the Cyprus Registrar. Next working day delivery.
          </p>
          <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Apostille service available for international use
          </p>
        </div>
      </section>

      <section className="py-10 px-4">
        <div className="max-w-7xl mx-auto">

          {/* Entity type tabs */}
          <div className="flex items-center gap-2 mb-8 flex-wrap">
            {(Object.keys(entityTypeLabels) as EntityType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleEntityChange(type)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor: entityType === type ? 'var(--brand-accent)' : 'var(--bg-subtle)',
                  color: entityType === type ? '#fff' : 'var(--text-body)',
                }}
              >
                {entityIcons[type]}
                {entityTypeLabels[type]}
              </button>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: certificates */}
            <div className="flex-1 min-w-0">
              {/* Company name input */}
              <div className="rounded-xl border p-5 mb-6" style={{ borderColor: 'var(--bg-border)', backgroundColor: 'var(--bg-surface)' }}>
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-heading)' }}>
                  {entityTypeLabels[entityType]} Details
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder={`Enter ${entityTypeLabels[entityType].toLowerCase()} name`}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
                  />
                  <input
                    type="text"
                    placeholder="Registration number (optional)"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    className="sm:w-56 border rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
                  />
                </div>
              </div>

              {/* Bundles */}
              {entityBundles.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-bold mb-4 px-1" style={{ color: 'var(--text-heading)' }}>
                    Certificate Bundles
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {entityBundles.map((b) => {
                      const isActive = b.certSlugs.every((s) => selectedSlugs.has(s));
                      return (
                        <BundleCard
                          key={b.slug}
                          bundle={b}
                          allCerts={allCerts}
                          onSelect={() => selectBundle(b)}
                          isActive={isActive}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Certificate groups */}
              {groups.map((group, i) => (
                <CertSection
                  key={`${entityType}-${i}`}
                  group={group}
                  selectedSlugs={selectedSlugs}
                  apostilleSlugs={apostilleSlugs}
                  onToggle={toggleCert}
                  onToggleApostille={toggleApostille}
                />
              ))}
            </div>

            {/* Right: order summary sidebar */}
            <div className="w-full lg:w-80 shrink-0">
              <div
                className="rounded-xl border p-5 sticky top-24"
                style={{ borderColor: 'var(--bg-border)', backgroundColor: '#fff' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="w-5 h-5" style={{ color: 'var(--brand-accent)' }} />
                  <h2 className="font-bold text-lg" style={{ color: 'var(--text-heading)' }}>
                    Order Summary
                  </h2>
                </div>

                {certCount === 0 ? (
                  <p className="text-sm py-4" style={{ color: 'var(--text-muted)' }}>
                    Select certificates to begin your order.
                  </p>
                ) : (
                  <>
                    {/* Selected certs list */}
                    <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
                      {allCerts
                        .filter((c) => selectedSlugs.has(c.slug))
                        .map((c) => (
                          <div key={c.slug} className="flex justify-between text-xs" style={{ color: 'var(--text-body)' }}>
                            <span className="truncate pr-2">{c.name}</span>
                            <span className="font-medium whitespace-nowrap">€{c.price}</span>
                          </div>
                        ))}
                    </div>

                    <div className="border-t pt-3 space-y-2 text-sm" style={{ borderColor: 'var(--bg-border)' }}>
                      <div className="flex justify-between" style={{ color: 'var(--text-body)' }}>
                        <span>Certificates ({certCount} × €{CERT_PRICE})</span>
                        <span>€{certSubtotal}</span>
                      </div>
                      <div className="flex justify-between" style={{ color: 'var(--text-body)' }}>
                        <span>Service & Delivery ({certCount} × €{SERVICE_DELIVERY_FEE})</span>
                        <span>€{serviceDeliveryTotal}</span>
                      </div>
                    </div>

                    {/* Add-ons */}
                    <div className="border-t mt-3 pt-3 space-y-3" style={{ borderColor: 'var(--bg-border)' }}>
                      {/* Apostille — per certificate */}
                      <label className="flex items-center justify-between cursor-pointer group" onClick={(e) => { e.preventDefault(); /* toggle all certs apostille */ setApostilleSlugs((prev) => prev.size === certCount ? new Set() : new Set(selectedSlugs)); }}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                            style={{
                              borderColor: apostilleCount > 0 ? 'var(--status-active)' : 'var(--bg-border)',
                              backgroundColor: apostilleCount > 0 ? 'var(--status-active)' : 'transparent',
                            }}
                          >
                            {apostilleCount > 0 && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-body)' }}>
                            <Stamp className="w-3 h-3" /> Apostille
                          </span>
                        </div>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>+€{APOSTILLE_PRICE}/cert</span>
                      </label>

                      {apostilleCount > 0 && (
                        <div className="flex justify-between text-xs pl-6" style={{ color: 'var(--text-body)' }}>
                          <span>Apostille ({apostilleCount} × €{APOSTILLE_PRICE})</span>
                          <span className="font-medium">€{apostilleTotal}</span>
                        </div>
                      )}

                      {/* Urgent Delivery — per certificate */}
                      <label className="flex items-center justify-between cursor-pointer group" onClick={(e) => { e.preventDefault(); setUrgentDelivery(!urgentDelivery); }}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                            style={{
                              borderColor: urgentDelivery ? 'var(--brand-accent)' : 'var(--bg-border)',
                              backgroundColor: urgentDelivery ? 'var(--brand-accent)' : 'transparent',
                            }}
                          >
                            {urgentDelivery && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-body)' }}>
                            <Zap className="w-3 h-3" /> Urgent Delivery
                          </span>
                        </div>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>+€{URGENT_DELIVERY_PRICE}/cert</span>
                      </label>

                      {urgentDelivery && certCount > 1 && (
                        <div className="flex justify-between text-xs pl-6" style={{ color: 'var(--text-body)' }}>
                          <span>Urgent ({certCount} × €{URGENT_DELIVERY_PRICE})</span>
                          <span className="font-medium">€{urgentTotal}</span>
                        </div>
                      )}

                      <label className="flex items-center justify-between cursor-pointer group" onClick={(e) => { e.preventDefault(); setCourierDelivery(!courierDelivery); }}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                            style={{
                              borderColor: courierDelivery ? 'var(--brand-accent)' : 'var(--bg-border)',
                              backgroundColor: courierDelivery ? 'var(--brand-accent)' : 'transparent',
                            }}
                          >
                            {courierDelivery && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-body)' }}>
                            <Truck className="w-3 h-3" /> Courier Delivery
                          </span>
                        </div>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>+€{COURIER_DELIVERY_PRICE}</span>
                      </label>
                    </div>

                    {/* Totals */}
                    <div className="border-t mt-3 pt-3 space-y-1.5" style={{ borderColor: 'var(--bg-border)' }}>
                      <div className="flex justify-between text-sm" style={{ color: 'var(--text-body)' }}>
                        <span>Subtotal</span>
                        <span>€{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
                        <span>VAT (19%)</span>
                        <span>+€{vat.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-baseline pt-2">
                        <span className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>Total</span>
                        <span className="text-2xl font-extrabold" style={{ color: 'var(--brand-accent)' }}>
                          €{grandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleAddToCart}
                      disabled={!companyName.trim()}
                      className="mt-4 w-full py-3 rounded-lg text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ backgroundColor: 'var(--brand-accent)' }}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart — €{grandTotal.toFixed(2)}
                    </button>

                    {!companyName.trim() && certCount > 0 && (
                      <p className="text-[11px] text-center mt-2" style={{ color: 'var(--status-dissolved)' }}>
                        Please enter the {entityTypeLabels[entityType].toLowerCase()} name above
                      </p>
                    )}
                  </>
                )}

                {/* Trust signals */}
                <div className="border-t mt-4 pt-4 space-y-2" style={{ borderColor: 'var(--bg-border)' }}>
                  <p className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--status-active)' }} />
                    Official certified certificate from the Cyprus Registrar
                  </p>
                  <p className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Clock className="w-3.5 h-3.5" />
                    Delivery: Next working day
                  </p>
                  <p className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Stamp className="w-3.5 h-3.5" />
                    Apostille service available for international use
                  </p>
                </div>

                {/* Structure Report upsell */}
                <div
                  className="border-t mt-4 pt-4"
                  style={{ borderColor: 'var(--bg-border)' }}
                >
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>
                    Combine with a Report
                  </p>
                  <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>
                    Get a full company structure overview alongside your certificates.
                  </p>
                  <button
                    onClick={() => navigate('/report?type=structure')}
                    className="w-full py-2 rounded-lg text-xs font-semibold border transition-all hover:shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
                    style={{
                      borderColor: 'var(--brand-accent)',
                      color: 'var(--brand-accent)',
                    }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Add Structure Report — €45
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
