import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import type { Product, Company, ProductSpeed } from '../types/database';

const VAT_RATE = 0.19;

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
}

interface CartContextValue {
  items: CartItem[];
  addItem: (
    product: Product,
    company: CartItem['company'],
    speedCode?: string
  ) => void;
  removeItem: (id: string) => void;
  updateSpeed: (id: string, speedCode: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  totalVat: number;
  grandTotal: number;
}

const CartContext = createContext<CartContextValue>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateSpeed: () => {},
  clearCart: () => {},
  totalItems: 0,
  subtotal: 0,
  totalVat: 0,
  grandTotal: 0,
});

const STORAGE_KEY = 'ch_cart_v1';

function calcPrice(product: Product, speedCode: string): { price: number; vatAmount: number } {
  const speeds: ProductSpeed[] = Array.isArray(product.available_speeds)
    ? (product.available_speeds as ProductSpeed[])
    : [];
  const speed = speeds.find((s) => s.code === speedCode);
  const base = product.base_price + (speed?.price_delta ?? 0);
  const vat = product.vat_on_full_price ? base * VAT_RATE : 0;
  return { price: base, vatAmount: parseFloat(vat.toFixed(2)) };
}

function makeId(productId: string, icgCode: string, speedCode: string) {
  return `${productId}__${icgCode}__${speedCode}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const addItem = useCallback(
    (product: Product, company: CartItem['company'], speedCode?: string) => {
      const speeds: ProductSpeed[] = Array.isArray(product.available_speeds)
        ? (product.available_speeds as ProductSpeed[])
        : [];
      const resolvedSpeed = speedCode ?? speeds[0]?.code ?? 'Normal';
      const id = makeId(product.id, company.icg_code, resolvedSpeed);
      const { price, vatAmount } = calcPrice(product, resolvedSpeed);

      setItems((prev) => {
        // Replace if same combo already exists
        if (prev.find((i) => i.id === id)) return prev;
        return [...prev, { id, product, company, speedCode: resolvedSpeed, price, vatAmount }];
      });
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateSpeed = useCallback((id: string, speedCode: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newId = makeId(item.product.id, item.company.icg_code, speedCode);
        const { price, vatAmount } = calcPrice(item.product, speedCode);
        return { ...item, id: newId, speedCode, price, vatAmount };
      })
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const totalVat = items.reduce((s, i) => s + i.vatAmount, 0);
  const grandTotal = subtotal + totalVat;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateSpeed,
        clearCart,
        totalItems: items.length,
        subtotal,
        totalVat,
        grandTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  return useContext(CartContext);
}
