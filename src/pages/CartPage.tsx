import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { X, ShoppingCart, FileX, Stamp, Zap, Truck, ShieldCheck } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import { useCart, type CertificateOrder } from '../contexts/CartContext';
import { useTenant } from '../lib/tenant';
import type { ProductSpeed } from '../types/database';
import {
  APOSTILLE_PRICE,
  URGENT_DELIVERY_PRICE,
  COURIER_DELIVERY_PRICE,
  SERVICE_DELIVERY_FEE,
  entityTypeLabels,
} from '../data/cyprusCertificates';

const PAYMENT_LOGOS = [
  { name: 'Visa', icon: '💳' },
  { name: 'Mastercard', icon: '💳' },
  { name: 'PayPal', icon: '🅿' },
  { name: 'Stripe', icon: '⚡' },
];

function CertOrderBlock({
  order,
  onRemove,
}: {
  order: CertificateOrder;
  onRemove: () => void;
}) {
  const apostilleCount = order.certificates.filter((c) => c.apostille).length;
  const certTotal = order.certificates.reduce((s, c) => s + c.price, 0);
  const serviceDeliveryTotal = order.certificates.length * SERVICE_DELIVERY_FEE;
  const apostilleTotal = apostilleCount * APOSTILLE_PRICE;
  const urgentTotal = order.urgentDelivery ? URGENT_DELIVERY_PRICE : 0;
  const courierTotal = order.courierDelivery ? COURIER_DELIVERY_PRICE : 0;
  const blockTotal = certTotal + serviceDeliveryTotal + apostilleTotal + urgentTotal + courierTotal;

  return (
    <div className="py-5 border-b" style={{ borderColor: 'var(--bg-border)' }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
            {order.companyName}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {entityTypeLabels[order.entityType]}
            {order.regNo && ` · Reg: ${order.regNo}`}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 p-1 rounded hover:bg-red-50 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Remove order"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Certs list */}
      <div className="space-y-1 mb-3">
        {order.certificates.map((c) => (
          <div key={c.slug} className="flex justify-between text-sm" style={{ color: 'var(--text-body)' }}>
            <span className="truncate pr-2">
              📋 {c.name}
              {c.apostille && (
                <span className="ml-1.5 text-xs inline-flex items-center gap-0.5" style={{ color: 'var(--status-active)' }}>
                  <Stamp className="w-3 h-3" /> Apostille
                </span>
              )}
            </span>
            <span className="font-medium whitespace-nowrap">€{c.price + (c.apostille ? APOSTILLE_PRICE : 0)}</span>
          </div>
        ))}
      </div>

      {/* Service & Delivery + Add-ons */}
      <div className="space-y-1 mb-2 pt-2 border-t" style={{ borderColor: 'var(--bg-border)' }}>
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Service & Delivery ({order.certificates.length} × €{SERVICE_DELIVERY_FEE})</span>
          <span>€{serviceDeliveryTotal}</span>
        </div>
        {order.urgentDelivery && (
          <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Urgent Delivery</span>
            <span>€{URGENT_DELIVERY_PRICE}</span>
          </div>
        )}
        {order.courierDelivery && (
          <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Courier Delivery</span>
            <span>€{COURIER_DELIVERY_PRICE}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between text-sm font-bold pt-2" style={{ color: 'var(--text-heading)' }}>
        <span>Order subtotal</span>
        <span>€{blockTotal.toFixed(2)}</span>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { tenant } = useTenant();
  const {
    items,
    certificateOrders,
    removeItem,
    removeCertificateOrder,
    updateSpeed,
    subtotal,
    totalVat,
    grandTotal,
    totalItems,
  } = useCart();
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
            <div className="flex gap-3 flex-wrap justify-center">
              <Link
                to="/"
                className="px-6 py-2.5 rounded text-sm font-semibold text-white active:scale-95 transition-transform"
                style={{ backgroundColor: 'var(--brand-accent)', borderRadius: '6px' }}
              >
                Continue Shopping
              </Link>
              <Link
                to="/certificates"
                className="px-6 py-2.5 rounded text-sm font-semibold border active:scale-95 transition-transform"
                style={{ borderColor: 'var(--brand-accent)', color: 'var(--brand-accent)', borderRadius: '6px' }}
              >
                Order Certificates
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* ── Left: cart items ── */}
            <div className="flex-1 min-w-0">
              {/* Certificate orders */}
              {certificateOrders.map((order) => (
                <CertOrderBlock
                  key={order.id}
                  order={order}
                  onRemove={() => removeCertificateOrder(order.id)}
                />
              ))}

              {/* Report items */}
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
                          aria-label="Remove item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-sm mt-2 font-medium" style={{ color: 'var(--text-body)' }}>
                        📋 {item.product.name}
                      </p>

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

                      <div className="mt-3 flex items-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
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
                <h2 className="font-semibold text-lg mb-4" style={{ color: 'var(--text-heading)' }}>
                  Total
                </h2>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-body)' }}>Subtotal</span>
                    <span style={{ color: 'var(--text-body)' }}>€{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>VAT</span>
                    <span style={{ color: 'var(--text-muted)' }}>+€{totalVat.toFixed(2)}</span>
                  </div>
                </div>

                <div className="my-4 border-t" style={{ borderColor: 'var(--bg-border)' }} />

                <div className="flex justify-between items-baseline mb-5">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                    Grand Total
                  </span>
                  <span className="text-xl font-bold" style={{ color: 'var(--brand-accent)' }}>
                    €{grandTotal.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={totalItems === 0}
                  onClick={handleCheckout}
                  className="w-full py-2.5 rounded text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--brand-accent)', borderRadius: '6px' }}
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
