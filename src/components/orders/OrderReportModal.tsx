import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/lib/tenant.tsx';
import { useCart, isScreeningEligible, isScreeningIncluded, SCREENING_ADDON_PRICE_EUR } from '@/contexts/CartContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ShieldCheck } from 'lucide-react';
import type { Company, Product, ProductSpeed } from '@/types/database';

interface OrderReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProduct?: Product;
  preselectedCompany?: Company;
}

export default function OrderReportModal({
  isOpen,
  onClose,
  preselectedProduct,
  preselectedCompany,
}: OrderReportModalProps) {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { addItem } = useCart();
  const { format: fmtFx } = useCurrency();

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(
    preselectedCompany ?? null
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    preselectedProduct ?? null
  );
  // Multi-select for certificates
  const [selectedCertIds, setSelectedCertIds] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState('');
  const [justAdded, setJustAdded] = useState(false);
  const [companyQuery, setCompanyQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [addScreening, setAddScreening] = useState(false);
  /** Eligible upgrade: user already bought standard UK Company Report (within 30d) for this company */
  const [eligibleUpgrade, setEligibleUpgrade] = useState<{ standardPrice: number } | null>(null);

  const isCertificateMode = preselectedProduct?.type === 'certificate' || 
    (!preselectedProduct && selectedProduct?.type === 'certificate');

  const certificates = products.filter((p) => p.type === 'certificate');
  const nonCertificates = products.filter((p) => p.type !== 'certificate');

  // Sync preselected values when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCompany(preselectedCompany ?? null);
      setSelectedProduct(preselectedProduct ?? null);
      setSelectedCertIds(
        preselectedProduct?.type === 'certificate'
          ? new Set([preselectedProduct.id])
          : new Set()
      );
      setCompanyQuery('');
      setComment('');
      setJustAdded(false);
    }
  }, [isOpen, preselectedCompany, preselectedProduct]);

  // Load products
  useEffect(() => {
    if (!isOpen || !tenant) return;
    setIsLoadingProducts(true);
    supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (data) {
          const prods = (data as unknown as Product[]).map((p) => ({
            ...p,
            available_speeds: Array.isArray(p.available_speeds) ? p.available_speeds : [],
          }));
          setProducts(prods);
          if (!selectedProduct && prods.length > 0) {
            setSelectedProduct(prods[0]);
          }
        }
        setIsLoadingProducts(false);
      });
  }, [isOpen, tenant?.id]);

  // Auto-select first product when products load (if none preselected)
  useEffect(() => {
    if (products.length > 0 && !selectedProduct && !preselectedProduct) {
      setSelectedProduct(products[0]);
    }
  }, [products]);

  // When switching to certificate mode via dropdown, init multi-select
  useEffect(() => {
    if (selectedProduct?.type === 'certificate' && selectedCertIds.size === 0) {
      setSelectedCertIds(new Set([selectedProduct.id]));
    }
  }, [selectedProduct?.type]);

  // Detect upgrade eligibility: user already bought standard UK Company Report
  // for this company in the last 30 days, AND currently selected = Enhanced UK KYB.
  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!selectedCompany || selectedProduct?.slug !== 'enhanced-uk-kyb-report') {
        if (!cancelled) setEligibleUpgrade(null);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        if (!cancelled) setEligibleUpgrade(null);
        return;
      }
      const cutoffIso = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { data } = await supabase
        .from('order_items')
        .select('id, unit_price, created_at, products:product_id!inner(slug), orders!inner(user_id, status)')
        .eq('company_id', selectedCompany.id)
        .eq('orders.user_id', session.user.id)
        .gte('created_at', cutoffIso)
        .order('created_at', { ascending: false })
        .limit(20);
      if (cancelled) return;
      type Row = { unit_price: number; products?: { slug?: string } | null };
      const rows = (data ?? []) as unknown as Row[];
      const standard = rows.find((r) => r.products?.slug === 'uk-company-report');
      const alreadyEnhanced = rows.find((r) => r.products?.slug === 'enhanced-uk-kyb-report');
      if (standard && !alreadyEnhanced) {
        setEligibleUpgrade({ standardPrice: Number(standard.unit_price) || 0 });
      } else {
        setEligibleUpgrade(null);
      }
    }
    check();
    return () => { cancelled = true; };
  }, [selectedCompany?.id, selectedProduct?.slug]);

  const toggleCert = (id: string) => {
    setSelectedCertIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllCerts = () => {
    if (selectedCertIds.size === certificates.length) {
      // Deselect all
      setSelectedCertIds(new Set());
    } else {
      setSelectedCertIds(new Set(certificates.map((c) => c.id)));
    }
  };

  const handleSearchNavigate = () => {
    const q = companyQuery.trim();
    navigate(`/company/search${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    onClose();
  };

  const handleAddToCart = () => {
    if (!selectedCompany) return;

    if (isCertificateMode && selectedCertIds.size > 0) {
      const certsToAdd = certificates.filter((c) => selectedCertIds.has(c.id));
      for (const cert of certsToAdd) {
        const speeds: ProductSpeed[] = Array.isArray(cert.available_speeds)
          ? (cert.available_speeds as ProductSpeed[])
          : [];
        const speedCode = speeds[0]?.code ?? 'Normal';
        addItem(cert, selectedCompany, speedCode);
      }
    } else if (selectedProduct) {
      const speeds: ProductSpeed[] = Array.isArray(selectedProduct.available_speeds)
        ? (selectedProduct.available_speeds as ProductSpeed[])
        : [];
      const speedCode = speeds[0]?.code ?? 'Normal';
      const isUpgrade = !!eligibleUpgrade;
      const upgradeDelta = isUpgrade
        ? Math.max(0, selectedProduct.base_price - (eligibleUpgrade?.standardPrice ?? 0))
        : undefined;
      addItem(selectedProduct, selectedCompany, speedCode, {
        screeningAddon: addScreening && screeningEligible,
        priceOverride: upgradeDelta,
        isUpgrade,
        upgradeLabel: isUpgrade ? 'Upgrade from UK Company Report' : undefined,
      });
    }
    setJustAdded(true);
  };

  const handleContinueShopping = () => {
    setJustAdded(false);
    setSelectedProduct(null);
    setSelectedCertIds(new Set());
    setSelectedCompany(preselectedCompany ?? null);
    setComment('');
    setAddScreening(false);
    setEligibleUpgrade(null);
  };

  const handleGoToCart = () => {
    onClose();
    navigate('/cart');
  };

  // Eligibility for the +€45 ComplyAdvantage screening add-on
  const screeningEligible = !isCertificateMode && !!selectedProduct && isScreeningEligible({
    type: selectedProduct.type as string,
    slug: selectedProduct.slug,
  });

  // Calculate total price (in EUR for cart math)
  const baseTotalEur = isCertificateMode
    ? certificates.filter((c) => selectedCertIds.has(c.id)).reduce((sum, c) => sum + c.base_price, 0)
    : eligibleUpgrade && selectedProduct?.slug === 'enhanced-uk-kyb-report'
      ? Math.max(0, (selectedProduct.base_price ?? 0) - eligibleUpgrade.standardPrice)
      : selectedProduct?.base_price ?? 0;
  const screeningEur = screeningEligible && addScreening ? SCREENING_ADDON_PRICE_EUR : 0;
  const totalEur = baseTotalEur + screeningEur;

  const selectedCount = isCertificateMode ? selectedCertIds.size : 1;
  const canAdd = selectedCompany && (isCertificateMode ? selectedCertIds.size > 0 : !!selectedProduct);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>
            {isCertificateMode ? 'Order Certificates' : 'Order Report Details'}
          </DialogTitle>
          <DialogDescription className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {isCertificateMode
              ? 'Select one or more certificates to order as a bundle.'
              : 'Search the company that you want a report.'}
          </DialogDescription>
        </DialogHeader>

        {/* Company Search */}
        <div className="mt-6">
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-subheading)' }}>
            Company
          </p>

          {selectedCompany ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--brand-accent)' }}
              >
                {selectedCompany.name}
                {selectedCompany.reg_no && (
                  <span className="opacity-75">· {selectedCompany.reg_no}</span>
                )}
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="ml-1 hover:opacity-75 transition-opacity"
                  aria-label="Remove company"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={companyQuery}
                onChange={(e) => setCompanyQuery(e.target.value)}
                placeholder="Enter a Company name"
                className="flex-1 border rounded-md px-3 py-2 text-sm outline-none transition-colors"
                style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchNavigate();
                }}
              />
              <button
                onClick={handleSearchNavigate}
                className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 transition-opacity hover:opacity-80 active:scale-95"
                style={{ backgroundColor: 'var(--text-heading)' }}
                aria-label="Search companies"
              >
                <Search className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Report/Certificate Selection */}
        <div className="mt-4">
          {isCertificateMode ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <label
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-subheading)' }}
                >
                  Select Certificates
                </label>
                <button
                  onClick={selectAllCerts}
                  className="text-xs font-medium hover:underline transition-colors"
                  style={{ color: 'var(--brand-accent)' }}
                >
                  {selectedCertIds.size === certificates.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div
                className="border rounded-lg divide-y max-h-[240px] overflow-y-auto"
                style={{ borderColor: 'var(--bg-border)' }}
              >
                {isLoadingProducts ? (
                  <div className="p-3 text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>
                ) : (
                  certificates.map((cert) => {
                    const isSelected = selectedCertIds.has(cert.id);
                    return (
                      <label
                        key={cert.id}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-gray-50"
                      >
                        <div
                          className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                          style={{
                            borderColor: isSelected ? 'var(--brand-accent)' : 'var(--bg-border)',
                            backgroundColor: isSelected ? 'var(--brand-accent)' : 'transparent',
                          }}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className="text-sm flex-1" style={{ color: 'var(--text-body)' }}>
                          {cert.name}
                        </span>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                          €{cert.base_price.toFixed(0)}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              {selectedCertIds.size > 1 && (
                <p className="text-xs mt-2" style={{ color: 'var(--brand-accent)' }}>
                  {selectedCertIds.size} certificates selected as bundle
                </p>
              )}
            </>
          ) : (
            <>
              <label
                className="text-sm font-medium mb-2 block"
                style={{ color: 'var(--text-subheading)' }}
                htmlFor="report-type-select"
              >
                Report Type
              </label>
              <select
                id="report-type-select"
                className="w-full border rounded-md px-3 py-2 text-sm outline-none transition-colors"
                style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
                value={selectedProduct?.id ?? ''}
                onChange={(e) => {
                  const p = products.find((x) => x.id === e.target.value);
                  if (p) setSelectedProduct(p);
                }}
                disabled={isLoadingProducts}
              >
                {isLoadingProducts ? (
                  <option>Loading…</option>
                ) : (
                  products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — €{p.base_price.toFixed(0)}
                    </option>
                  ))
                )}
              </select>
            </>
          )}
        </div>

        {/* Comment */}
        <div className="mt-4">
          <textarea
            placeholder="Comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full border rounded-md px-3 py-2 text-sm outline-none resize-none transition-colors"
            style={{
              borderColor: 'var(--bg-border)',
              color: 'var(--text-body)',
              minHeight: '100px',
            }}
          />
        </div>

        {/* Upgrade banner: standard UK report bought in last 30d → Enhanced upgrade for delta */}
        {eligibleUpgrade && selectedProduct?.slug === 'enhanced-uk-kyb-report' && !justAdded && (
          <div
            className="mt-4 rounded-lg border-2 p-3"
            style={{
              borderColor: 'var(--brand-accent)',
              backgroundColor: 'var(--bg-subtle)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--brand-accent)', color: 'white' }}>
                UPGRADE PRICING
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                You already own the UK Company Report
              </span>
            </div>
            <p className="text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
              Pay only the difference: {fmtFx(selectedProduct.base_price, { decimals: 0 })}{' '}
              − {fmtFx(eligibleUpgrade.standardPrice, { decimals: 0 })}{' '}
              = <strong style={{ color: 'var(--brand-accent)' }}>{fmtFx(Math.max(0, selectedProduct.base_price - eligibleUpgrade.standardPrice), { decimals: 0 })}</strong>{' '}
              to unlock Enhanced KYB with full ComplyAdvantage screening.
            </p>
          </div>
        )}

        {/* Compliance screening: bundled badge for Enhanced UK KYB */}
        {selectedProduct && isScreeningIncluded(selectedProduct) && !justAdded && (
          <div
            className="mt-4 flex items-start gap-3 rounded-lg border p-3"
            style={{
              borderColor: 'var(--brand-accent)',
              backgroundColor: 'var(--bg-subtle)',
            }}
          >
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--brand-accent)' }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                  Compliance Screening included
                </span>
                <span className="text-xs font-semibold ml-auto px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--brand-accent)', color: 'white' }}>
                  BUNDLED
                </span>
              </div>
              <p className="text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
                Sanctions, PEP &amp; adverse-media checks on the company, directors and shareholders are
                included in this report at no extra cost.
              </p>
            </div>
          </div>
        )}

        {/* Compliance screening add-on (KYB / UK / Structure reports only) */}
        {screeningEligible && !justAdded && (
          <label
            className="mt-4 flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-[var(--bg-subtle)]"
            style={{
              borderColor: addScreening ? 'var(--brand-accent)' : 'var(--bg-border)',
              backgroundColor: addScreening ? 'var(--bg-subtle)' : 'transparent',
            }}
          >
            <input
              type="checkbox"
              className="mt-0.5 w-4 h-4 accent-blue-600 shrink-0"
              checked={addScreening}
              onChange={(e) => setAddScreening(e.target.checked)}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--brand-accent)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                  Add Compliance Screening
                </span>
                <span className="text-sm font-semibold ml-auto" style={{ color: 'var(--brand-accent)' }}>
                  +{fmtFx(SCREENING_ADDON_PRICE_EUR, { decimals: 0 })}
                </span>
              </div>
              <p className="text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
                Sanctions, PEP &amp; adverse-media checks on the company, directors and shareholders.
                Powered by WorldAML.
              </p>
            </div>
          </label>
        )}

        {/* Footer */}
        {justAdded ? (
          <div className="mt-6 rounded-lg p-4 text-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--status-active)' }}>
              ✓ Added to cart
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              {isCertificateMode
                ? `${selectedCount} certificate${selectedCount > 1 ? 's' : ''} for ${selectedCompany?.name}`
                : `${selectedProduct?.name} for ${selectedCompany?.name}`}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleContinueShopping}
                className="px-5 py-2 rounded-md text-sm font-medium border transition-all active:scale-95"
                style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
              >
                Add Another Report
              </button>
              <button
                onClick={handleGoToCart}
                className="px-5 py-2 rounded-md text-sm font-semibold text-white transition-all active:scale-95"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                Go to Cart
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex items-center justify-between gap-4">
            <div>
              <span className="text-sm" style={{ color: 'var(--text-body)' }}>
                Total Price:{' '}
              </span>
              <span
                className="text-xl font-semibold"
                style={{ color: 'var(--brand-accent)' }}
              >
                {fmtFx(totalEur, { decimals: 0 })}
              </span>
              {isCertificateMode && selectedCertIds.size > 1 && (
                <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                  ({selectedCertIds.size} items)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-md text-sm font-medium border transition-all active:scale-95"
                style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddToCart}
                disabled={!canAdd}
                className="px-6 py-2 rounded-md text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                Add to Cart
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
