import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Lock, Check } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import { useCart, SCREENING_ADDON_PRICE_EUR } from '../contexts/CartContext';
import { useTenant } from '../lib/tenant';
import { useCurrency } from '../contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';

const CHECKOUT_STEPS = ['Cart', 'Details', 'Payment', 'Confirmation'];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {CHECKOUT_STEPS.map((step, i) => (
        <React.Fragment key={step}>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                backgroundColor: i + 1 === current ? 'var(--brand-accent)' : i + 1 < current ? 'var(--status-active)' : 'var(--bg-subtle)',
                color: i + 1 <= current ? '#fff' : 'var(--text-muted)',
              }}
            >
              {i + 1 < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span
              className="text-sm font-medium hidden sm:inline"
              style={{ color: i + 1 === current ? 'var(--brand-accent)' : 'var(--text-muted)' }}
            >
              {step}
            </span>
          </div>
          {i < CHECKOUT_STEPS.length - 1 && (
            <div
              className="w-12 sm:w-16 h-0.5 mx-1"
              style={{ backgroundColor: i + 1 < current ? 'var(--status-active)' : 'var(--bg-border)' }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function CheckoutPaymentPage() {
  const { tenant } = useTenant();
  const { items, screeningTotal, clearCart } = useCart();
  const { currency, rate, format } = useCurrency();
  const navigate = useNavigate();

  const [details, setDetails] = useState<Record<string, unknown> | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [cardError, setCardError] = useState('');

  // Simulated card form fields
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });

  useEffect(() => {
    const raw = sessionStorage.getItem('checkout_details');
    if (raw) setDetails(JSON.parse(raw));
    else navigate('/checkout/details');
  }, [navigate]);

  if (items.length === 0) {
    return (
      <PageLayout>
        <div className="max-w-xl mx-auto py-20 text-center">
          <p style={{ color: 'var(--text-muted)' }}>Your cart is empty.</p>
          <Link to="/cart" className="text-sm mt-3 inline-block" style={{ color: 'var(--brand-accent)' }}>
            ← Return to cart
          </Link>
        </div>
      </PageLayout>
    );
  }

  const effectiveTotalEur = ((details?.effectiveTotal as number) ?? items.reduce((s, i) => s + i.price + i.vatAmount, 0)) + screeningTotal;
  const customerEmail = (details?.email as string) ?? '';

  const formatCardNumber = (val: string) =>
    val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    return digits.length > 2 ? digits.slice(0, 2) + ' / ' + digits.slice(2) : digits;
  };

  const handlePlaceOrder = async () => {
    setCardError('');
    const rawNumber = card.number.replace(/\s/g, '');
    if (rawNumber.length < 16) { setCardError('Please enter a valid card number'); return; }
    if (!card.expiry || card.expiry.length < 4) { setCardError('Please enter a valid expiry date'); return; }
    if (!card.cvc || card.cvc.length < 3) { setCardError('Please enter a valid CVC'); return; }
    if (!card.name.trim()) { setCardError('Please enter the cardholder name'); return; }

    setIsPlacing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Generate order reference
      const orderRef = `ICG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Create order record (canonical EUR amounts; display currency snapshotted)
      const subtotal = items.reduce((s, i) => s + i.price, 0) + screeningTotal;
      const vatAmount = (details?.effectiveVat as number) ?? 0;
      const total = subtotal + vatAmount;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertPayload: any = {
        tenant_id: tenant?.id ?? null,
        user_id: session?.user?.id ?? null,
        order_ref: orderRef,
        status: 'paid',
        subtotal,
        vat_amount: vatAmount,
        total,
        currency: 'EUR',
        display_currency: currency,
        fx_rate_to_eur: rate,
        guest_email: session ? null : customerEmail,
        guest_details: session ? null : details,
      };

      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert(insertPayload)
        .select()
        .single();

      if (orderErr || !orderData) throw new Error('Failed to create order');

      // Create order items (with screening flag + price snapshot)
      const orderItemResults = await Promise.all(
        items.map((item) =>
          supabase
            .from('order_items')
            .insert({
              order_id: orderData.id,
              product_id: item.product.id,
              company_id: item.company.id,
              speed: item.speedCode,
              unit_price: item.price,
              vat_amount: item.vatAmount,
              fulfillment_status: 'pending',
              screening_addon: item.screeningAddon,
              screening_price_eur: item.screeningAddon ? SCREENING_ADDON_PRICE_EUR : 0,
            })
            .select('id')
            .single()
        )
      );

      const orderItemError = orderItemResults.find((result) => result.error);
      if (orderItemError?.error) {
        throw new Error(orderItemError.error.message || 'Failed to create order items');
      }

      // Submit to API4All immediately after order creation
      try {
        await supabase.functions.invoke('create-api4all-order', {
          body: { order_id: orderData.id },
        });
      } catch (fulfillmentErr) {
        // Non-blocking — order is already saved, fulfillment will retry via cron
        console.warn('API4All submission failed (will retry):', fulfillmentErr);
      }

      // Instant fulfillment for UK Company Report items (no Stripe/API4All needed)
      try {
        const { data: ukItems } = await supabase
          .from('order_items')
          .select('id, products:product_id(slug)')
          .eq('order_id', orderData.id);

        const ukReportItemIds = (ukItems ?? [])
          .filter((it) => (it.products as { slug?: string } | null)?.slug === 'uk-company-report')
          .map((it) => it.id);

        await Promise.all(
          ukReportItemIds.map((id) =>
            supabase.functions.invoke('fulfill-uk-report', {
              body: { order_item_id: id },
            })
          )
        );
      } catch (ukErr) {
        console.warn('UK report fulfillment failed (will retry):', ukErr);
      }

      // Store success info for confirmation page
      sessionStorage.setItem(
        'checkout_success',
        JSON.stringify({
          orderRef,
          email: customerEmail,
          slaHours: items[0]?.product?.delivery_sla_hours ?? 24,
          isInstant: items[0]?.product?.is_instant ?? false,
        })
      );

      clearCart();
      navigate('/checkout/success');
    } catch (err) {
      setCardError('Payment failed. Please try again or contact support.');
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <PageLayout>
      <Helmet>
        <title>Checkout — Payment | {tenant?.brand_name ?? 'Companies House'}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <StepBar current={3} />

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Left: payment form ── */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold mb-5" style={{ color: 'var(--text-heading)' }}>
              Payment Details
            </h2>

            <div
              className="rounded-lg border p-5 mb-4"
              style={{ borderColor: 'var(--bg-border)', backgroundColor: '#fff' }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
                    value={card.name}
                    onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                    Card Number
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none font-mono tracking-widest"
                    style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
                    value={card.number}
                    onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none font-mono"
                      style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
                      value={card.expiry}
                      onChange={(e) => setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))}
                      placeholder="MM / YY"
                      maxLength={7}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>
                      CVC
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none font-mono"
                      style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
                      value={card.cvc}
                      onChange={(e) => setCard((c) => ({ ...c, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      placeholder="•••"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>

              {cardError && (
                <div
                  className="mt-3 text-sm px-3 py-2 rounded"
                  style={{ backgroundColor: '#fef2f2', color: 'var(--status-dissolved)', border: '1px solid #fecaca' }}
                >
                  {cardError}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Lock className="w-3.5 h-3.5" />
                Secured by Stripe 🔒
              </div>
            </div>

            <Link
              to="/checkout/details"
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              ← Back to Details
            </Link>
          </div>

          {/* ── Right: final summary ── */}
          <div className="w-full lg:w-80 shrink-0">
            <div
              className="rounded-lg border p-5 sticky top-24"
              style={{ borderColor: 'var(--bg-border)', backgroundColor: '#fff' }}
            >
              <h3 className="font-semibold text-base mb-4" style={{ color: 'var(--text-heading)' }}>
                Order Summary
              </h3>

              <div className="space-y-2 mb-3">
                {items.map((item) => (
                  <div key={item.id} className="text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="truncate font-medium" style={{ color: 'var(--text-body)' }}>
                        {item.product.name}
                      </span>
                      <span className="shrink-0" style={{ color: 'var(--text-heading)' }}>
                        {format(item.price)}
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {item.company.name}
                    </span>
                    {item.screeningAddon && (
                      <div className="flex justify-between gap-2 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>+ Compliance Screening</span>
                        <span>{format(SCREENING_ADDON_PRICE_EUR)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {customerEmail && (
                <div
                  className="text-xs p-2.5 rounded mb-3"
                  style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                >
                  📧 Delivery to: <strong>{customerEmail}</strong>
                </div>
              )}

              <div
                className="border-t pt-3 space-y-1.5"
                style={{ borderColor: 'var(--bg-border)' }}
              >
                <div className="flex justify-between font-bold text-lg">
                  <span style={{ color: 'var(--text-heading)' }}>Total</span>
                  <span style={{ color: 'var(--brand-accent)' }}>{format(effectiveTotalEur)}</span>
                </div>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Charged in {currency} via Stripe.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isPlacing}
                className="mt-4 w-full py-3 rounded font-semibold text-white text-sm transition-all active:scale-95 disabled:opacity-60"
                style={{ backgroundColor: 'var(--brand-accent)', borderRadius: '6px' }}
                onMouseOver={(e) => {
                  if (!isPlacing) e.currentTarget.style.backgroundColor = 'var(--brand-accent-hover)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--brand-accent)';
                }}
              >
                {isPlacing ? 'Processing…' : `Place Order — ${format(effectiveTotalEur)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
