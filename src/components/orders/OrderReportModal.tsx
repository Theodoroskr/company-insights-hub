import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
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
  const [comment, setComment] = useState('');
  const [justAdded, setJustAdded] = useState(false);
  const [companyQuery, setCompanyQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Sync preselected values when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCompany(preselectedCompany ?? null);
      setSelectedProduct(preselectedProduct ?? null);
      setCompanyQuery('');
      setComment('');
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

  const handleSearchNavigate = () => {
    const q = companyQuery.trim();
    navigate(`/company/search${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    onClose();
  };

  const handleAddToCart = () => {
    if (!selectedProduct || !selectedCompany) return;
    const speeds: ProductSpeed[] = Array.isArray(selectedProduct.available_speeds)
      ? (selectedProduct.available_speeds as ProductSpeed[])
      : [];
    const speedCode = speeds[0]?.code ?? 'Normal';
    addItem(selectedProduct, selectedCompany, speedCode);
    onClose();
    navigate('/cart');
  };

  const price = selectedProduct?.base_price ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>
            Order Report Details
          </DialogTitle>
          <DialogDescription className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Search the company that you want a report.
          </DialogDescription>
        </DialogHeader>

        {/* Company Search */}
        <div className="mt-6">
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-subheading)' }}>
            Company
          </p>

          {selectedCompany ? (
            /* Selected chip */
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
            /* Search input + button */
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

        {/* Report Type */}
        <div className="mt-4">
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
        <div className="mt-6 flex items-center justify-between gap-4">
          <div>
            <span className="text-sm" style={{ color: 'var(--text-body)' }}>
              Total Price:{' '}
            </span>
            <span
              className="text-xl font-semibold"
              style={{ color: 'var(--brand-accent)' }}
            >
              €{price.toFixed(0)}
            </span>
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
              disabled={!selectedCompany || !selectedProduct}
              className="px-6 py-2 rounded-md text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Add to Cart
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
