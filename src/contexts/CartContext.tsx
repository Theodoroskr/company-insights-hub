import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import type { Product, Company, ProductSpeed } from '../types/database';
import type { EntityType } from '../data/cyprusCertificates';
import {
  APOSTILLE_PRICE,
  URGENT_DELIVERY_PRICE,
  COURIER_DELIVERY_PRICE,
  SERVICE_DELIVERY_FEE,
} from '../data/cyprusCertificates';
import { useTenant } from '../lib/tenant';
import { getVatRate } from '../lib/tenantConfig';

/** Compliance screening add-on price (EUR), shown alongside eligible reports */
export const SCREENING_ADDON_PRICE_EUR = 45;

/** Product slugs / types eligible for the compliance screening add-on */
export const SCREENING_ELIGIBLE_TYPES = new Set(['kyb']);
export const SCREENING_ELIGIBLE_SLUGS = new Set([
  'uk-company-report',
  'company-structure-report',
  'structure-report',
]);

/** Products where ComplyAdvantage screening is bundled in the base price (no add-on shown) */
export const SCREENING_INCLUDED_SLUGS = new Set([
  'enhanced-uk-kyb-report',
]);

export function isScreeningIncluded(p: { slug?: string }): boolean {
  return !!p.slug && SCREENING_INCLUDED_SLUGS.has(p.slug);
}

export function isScreeningEligible(p: { type?: string; slug?: string }): boolean {
  if (isScreeningIncluded(p)) return false;
  if (p.type && SCREENING_ELIGIBLE_TYPES.has(p.type)) return true;
  if (p.slug && SCREENING_ELIGIBLE_SLUGS.has(p.slug)) return true;
  return false;
}

export interface CartItem {
  id: string; // local uuid: product.id + company.icg_code + speed
  product: Product;
  company: {
    id: string;
    icg_code: string;
    name: string;
    reg_no: string | null;
    slug: string | null;
    country_code: string;
  };
  speedCode: string;
  price: number;
  vatAmount: number;
  /** True when customer ticked the +€45 ComplyAdvantage screening add-on */
  screeningAddon: boolean;
  /** True when this is an upgrade from a previously-purchased report (price = delta only) */
  isUpgrade?: boolean;
  /** Human label like "Upgrade from UK Company Report" */
  upgradeLabel?: string;
}

export interface CertificateCartItem {
  slug: string;
  name: string;
  price: number;
  apostille: boolean;
}

export interface CertificateOrder {
  id: string;
  entityType: EntityType;
  companyName: string;
  regNo: string | null;
  certificates: CertificateCartItem[];
  urgentDelivery: boolean;
  courierDelivery: boolean;
}

interface CartContextValue {
  items: CartItem[];
  certificateOrders: CertificateOrder[];
  addItem: (
    product: Product,
    company: CartItem['company'],
    speedCode?: string,
    opts?: { screeningAddon?: boolean; priceOverride?: number; isUpgrade?: boolean; upgradeLabel?: string }
  ) => void;
  removeItem: (id: string) => void;
  updateSpeed: (id: string, speedCode: string) => void;
  toggleScreeningAddon: (id: string) => void;
  addCertificateOrder: (order: Omit<CertificateOrder, 'id'>) => void;
  removeCertificateOrder: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  totalVat: number;
  grandTotal: number;
  /** Total of all screening add-ons across cart, EUR */
  screeningTotal: number;
}

const CartContext = createContext<CartContextValue>({
  items: [],
  certificateOrders: [],
  addItem: () => {},
  removeItem: () => {},
  updateSpeed: () => {},
  toggleScreeningAddon: () => {},
  addCertificateOrder: () => {},
  removeCertificateOrder: () => {},
  clearCart: () => {},
  totalItems: 0,
  subtotal: 0,
  totalVat: 0,
  grandTotal: 0,
  screeningTotal: 0,
});

const STORAGE_KEY = 'ch_cart_v1';
const CERT_STORAGE_KEY = 'ch_cert_cart_v1';

function calcPrice(
  product: Product,
  speedCode: string,
  vatRate: number,
): { price: number; vatAmount: number } {
  const speeds: ProductSpeed[] = Array.isArray(product.available_speeds)
    ? (product.available_speeds as ProductSpeed[])
    : [];
  const speed = speeds.find((s) => s.code === speedCode);
  const base = product.base_price + (speed?.price_delta ?? 0);
  const vat = product.vat_on_full_price ? base * vatRate : 0;
  return { price: base, vatAmount: parseFloat(vat.toFixed(2)) };
}

function makeId(productId: string, icgCode: string, speedCode: string) {
  return `${productId}__${icgCode}__${speedCode}`;
}

function calcCertOrderTotals(order: CertificateOrder, vatRate: number) {
  const certCount = order.certificates.length;
  const certTotal = order.certificates.reduce((s, c) => s + c.price, 0);
  const serviceDeliveryTotal = certCount * SERVICE_DELIVERY_FEE;
  const apostilleTotal = order.certificates.filter((c) => c.apostille).length * APOSTILLE_PRICE;
  const urgentTotal = order.urgentDelivery ? URGENT_DELIVERY_PRICE * certCount : 0;
  const courierTotal = order.courierDelivery ? COURIER_DELIVERY_PRICE : 0;
  const sub = certTotal + serviceDeliveryTotal + apostilleTotal + urgentTotal + courierTotal;
  const vat = parseFloat((sub * vatRate).toFixed(2));
  return { subtotal: sub, vat };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { tenant } = useTenant();
  const vatRate = getVatRate(tenant?.slug);

  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [certificateOrders, setCertificateOrders] = useState<CertificateOrder[]>(() => {
    try {
      const raw = localStorage.getItem(CERT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  useEffect(() => {
    try { localStorage.setItem(CERT_STORAGE_KEY, JSON.stringify(certificateOrders)); } catch {}
  }, [certificateOrders]);

  // Recompute report-line VAT when the tenant (and therefore vatRate) changes
  useEffect(() => {
    setItems((prev) =>
      prev.map((item) => {
        const newVat = item.product.vat_on_full_price
          ? parseFloat((item.price * vatRate).toFixed(2))
          : 0;
        return newVat === item.vatAmount ? item : { ...item, vatAmount: newVat };
      }),
    );
  }, [vatRate]);

  const addItem = useCallback(
    (
      product: Product,
      company: CartItem['company'],
      speedCode?: string,
      opts?: { screeningAddon?: boolean; priceOverride?: number; isUpgrade?: boolean; upgradeLabel?: string }
    ) => {
      const speeds: ProductSpeed[] = Array.isArray(product.available_speeds)
        ? (product.available_speeds as ProductSpeed[])
        : [];
      const resolvedSpeed = speedCode ?? speeds[0]?.code ?? 'Normal';
      const idSuffix = opts?.isUpgrade ? '__upgrade' : '';
      const id = makeId(product.id, company.icg_code, resolvedSpeed) + idSuffix;
      const computed = calcPrice(product, resolvedSpeed, vatRate);
      const price = typeof opts?.priceOverride === 'number' ? opts.priceOverride : computed.price;
      const vatAmount = product.vat_on_full_price
        ? parseFloat((price * vatRate).toFixed(2))
        : 0;
      const eligible = isScreeningEligible({ type: product.type as string, slug: product.slug });
      const screeningAddon = !!opts?.screeningAddon && eligible;

      setItems((prev) => {
        if (prev.find((i) => i.id === id)) return prev;
        // If this is an Enhanced UK KYB upgrade, drop any standard uk-company-report
        // line in the cart for the same company — the upgrade replaces it.
        const filtered = opts?.isUpgrade
          ? prev.filter(
              (i) =>
                !(
                  i.product.slug === 'uk-company-report' &&
                  i.company.icg_code === company.icg_code
                ),
            )
          : prev;
        return [
          ...filtered,
          {
            id,
            product,
            company,
            speedCode: resolvedSpeed,
            price,
            vatAmount,
            screeningAddon,
            isUpgrade: !!opts?.isUpgrade,
            upgradeLabel: opts?.upgradeLabel,
          },
        ];
      });
    },
    [vatRate]
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateSpeed = useCallback((id: string, speedCode: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newId = makeId(item.product.id, item.company.icg_code, speedCode);
        const { price, vatAmount } = calcPrice(item.product, speedCode, vatRate);
        return { ...item, id: newId, speedCode, price, vatAmount };
      })
    );
  }, [vatRate]);

  const toggleScreeningAddon = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const eligible = isScreeningEligible({
          type: item.product.type as string,
          slug: item.product.slug,
        });
        if (!eligible) return item;
        return { ...item, screeningAddon: !item.screeningAddon };
      })
    );
  }, []);

  const addCertificateOrder = useCallback((order: Omit<CertificateOrder, 'id'>) => {
    const id = `cert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setCertificateOrders((prev) => [...prev, { ...order, id }]);
  }, []);

  const removeCertificateOrder = useCallback((id: string) => {
    setCertificateOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCertificateOrders([]);
  }, []);

  // Combined totals
  const reportSubtotal = items.reduce((s, i) => s + i.price, 0);
  const reportVat = items.reduce((s, i) => s + i.vatAmount, 0);

  // Screening add-on (€45 per ticked item, no VAT — service line)
  const screeningTotal = items.reduce(
    (s, i) => s + (i.screeningAddon ? SCREENING_ADDON_PRICE_EUR : 0),
    0,
  );

  const certTotals = certificateOrders.reduce(
    (acc, order) => {
      const t = calcCertOrderTotals(order, vatRate);
      return { subtotal: acc.subtotal + t.subtotal, vat: acc.vat + t.vat };
    },
    { subtotal: 0, vat: 0 }
  );

  const subtotal = reportSubtotal + certTotals.subtotal + screeningTotal;
  const totalVat = reportVat + certTotals.vat;
  const grandTotal = subtotal + totalVat;

  const totalItems =
    items.length +
    certificateOrders.reduce((s, o) => s + o.certificates.length, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        certificateOrders,
        addItem,
        removeItem,
        updateSpeed,
        toggleScreeningAddon,
        addCertificateOrder,
        removeCertificateOrder,
        clearCart,
        totalItems,
        subtotal,
        totalVat,
        grandTotal,
        screeningTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  return useContext(CartContext);
}
