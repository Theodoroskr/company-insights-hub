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
import { useCart } from '@/contexts/CartContext';
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
      // Add all selected certificates
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
      addItem(selectedProduct, selectedCompany, speedCode);
    }
    setJustAdded(true);
  };

  const handleContinueShopping = () => {
    setJustAdded(false);
    setSelectedProduct(null);
    setSelectedCertIds(new Set());
    setSelectedCompany(preselectedCompany ?? null);
    setComment('');
  };

  const handleGoToCart = () => {
    onClose();
    navigate('/cart');
  };

  // Calculate total price
  const totalPrice = isCertificateMode
    ? certificates.filter((c) => selectedCertIds.has(c.id)).reduce((sum, c) => sum + c.base_price, 0)
    : selectedProduct?.base_price ?? 0;

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
                €{totalPrice.toFixed(0)}
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
