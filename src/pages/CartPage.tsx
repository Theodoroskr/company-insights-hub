import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { X, ShoppingCart, FileX } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import { useCart } from '../contexts/CartContext';
import { useTenant } from '../lib/tenant';
import type { ProductSpeed } from '../types/database';

const PAYMENT_LOGOS = [
  { name: 'Visa', icon: '💳' },
  { name: 'Mastercard', icon: '💳' },
  { name: 'PayPal', icon: '🅿' },
  { name: 'Stripe', icon: '⚡' },
];

export default function CartPage() {
  const { tenant } = useTenant();
  const { items, removeItem, updateSpeed, subtotal, totalVat, grandTotal, totalItems } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    navigate('/checkout/details');
  };

  return (
    <PageLayout>
      <Helmet>
        <title>Your Cart | {tenant?.brand_name ?? 'Companies House'}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Top bar */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-heading)' }}>
            Your cart {totalItems > 0 && `(${totalItems} item${totalItems > 1 ? 's' : ''})`}
          </h1>
          {totalItems > 0 && (
            <p className="text-sm font-medium" style={{ color: 'var(--status-dissolved)' }}>
              This product file(s) is available for download for 30 days from the date of delivery
            </p>
          )}
        </div>

        {/* Empty state */}
        {totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--bg-subtle)' }}
            >
              <FileX className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h2 className="text-lg font-medium mb-2" style={{ color: 'var(--text-heading)' }}>
              Cart is Empty!
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Looks like you have no items in your shopping cart.
            </p>
            <Link
              to="/"
              className="px-6 py-2.5 rounded text-sm font-semibold text-white active:scale-95 transition-transform"
              style={{ backgroundColor: 'var(--brand-accent)', borderRadius: '6px' }}
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* ── Left: cart items ── */}
            <div className="flex-1 min-w-0">
              {items.map((item) => {
                const speeds: ProductSpeed[] = Array.isArray(item.product.available_speeds)
                  ? (item.product.available_speeds as ProductSpeed[])
                  : [];

                return (
                  <div
                    key={item.id}
                    className="py-5 border-b flex gap-4 items-start"
                    style={{ borderColor: 'var(--bg-border)' }}
                  >
                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                            {item.company.name}
                          </p>
                          {item.company.reg_no && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              Reg: {item.company.reg_no}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="shrink-0 p-1 rounded hover:bg-red-50 transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.color = 'var(--status-dissolved)')
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.color = 'var(--text-muted)')
                          }
                          aria-label="Remove item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <p
                        className="text-sm mt-2 font-medium"
                        style={{ color: 'var(--text-body)' }}
                      >
                        📋 {item.product.name}
                      </p>

                      {/* Speed selector */}
                      {speeds.length > 1 && (
                        <div className="mt-2">
                          <select
                            className="text-xs border rounded px-2 py-1.5 outline-none"
                            style={{
                              borderColor: 'var(--bg-border)',
                              color: 'var(--text-body)',
                              backgroundColor: '#fff',
                            }}
                            value={item.speedCode}
                            onChange={(e) => updateSpeed(item.id, e.target.value)}
                          >
                            {speeds.map((s) => (
                              <option key={s.code} value={s.code}>
                                {s.label} — €{(item.product.base_price + s.price_delta).toFixed(0)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Price breakdown */}
                      <div
                        className="mt-3 flex items-center gap-4 text-sm"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <span className="font-bold text-base" style={{ color: 'var(--text-heading)' }}>
                          €{item.price.toFixed(2)}
                        </span>
                        {item.vatAmount > 0 && (
                          <span className="text-xs">+ €{item.vatAmount.toFixed(2)} VAT</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Right: order summary ── */}
            <div className="w-full lg:w-80 shrink-0">
              <div
                className="rounded-lg border p-5 sticky top-24"
                style={{ borderColor: 'var(--bg-border)', backgroundColor: '#fff' }}
              >
                <h2
                  className="font-semibold text-lg mb-4"
                  style={{ color: 'var(--text-heading)' }}
                >
                  Total
                </h2>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-body)' }}>Total</span>
                    <span style={{ color: 'var(--text-body)' }}>€{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Service Fee</span>
                    <span style={{ color: 'var(--text-muted)' }}>€0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>VAT</span>
                    <span style={{ color: 'var(--text-muted)' }}>+€{totalVat.toFixed(2)}</span>
                  </div>
                </div>

                <div
                  className="my-4 border-t"
                  style={{ borderColor: 'var(--bg-border)' }}
                />

                <div className="flex justify-between items-baseline mb-5">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                    Sub-total
                  </span>
                  <span
                    className="text-xl font-bold"
                    style={{ color: 'var(--brand-accent)' }}
                  >
                    €{grandTotal.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={totalItems === 0}
                  onClick={handleCheckout}
                  className="w-full py-2.5 rounded text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--brand-accent)', borderRadius: '6px' }}
                  onMouseOver={(e) => {
                    if (totalItems > 0)
                      e.currentTarget.style.backgroundColor = 'var(--brand-accent-hover)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--brand-accent)';
                  }}
                >
                  Checkout →
                </button>

                <div className="mt-5 pt-4 border-t" style={{ borderColor: 'var(--bg-border)' }}>
                  <p className="text-xs mb-2 text-center" style={{ color: 'var(--text-muted)' }}>
                    We Accept:
                  </p>
                  <div className="flex justify-center gap-3">
                    {PAYMENT_LOGOS.map((p) => (
                      <div
                        key={p.name}
                        className="w-10 h-7 rounded border flex items-center justify-center text-sm"
                        style={{ borderColor: 'var(--bg-border)' }}
                        title={p.name}
                      >
                        {p.icon}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
