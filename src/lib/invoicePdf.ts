// Client-side invoice PDF generation.
// Seller identity per project rule: Infocredit Group Ltd, Cyprus registration HE4404 — registration number only, never a street address.
import { jsPDF } from 'jspdf';

export interface InvoiceLineItem {
  name: string;
  speed?: string | null;
  unitPrice: number; // net (excl. VAT)
  vat: number;
  screening: boolean;
  screeningPrice: number;
}

export interface InvoiceBuyer {
  name?: string | null;
  email?: string | null;
  company?: string | null;
  reg?: string | null;
  vat?: string | null;
  country?: string | null;
  address?: { street?: string; city?: string; state?: string; postcode?: string } | null;
}

export interface InvoiceData {
  brandName: string;
  orderRef: string;
  date: string; // ISO
  paymentMethod?: string | null;
  subtotal: number;
  vat: number;
  total: number;
  buyer: InvoiceBuyer;
  items: InvoiceLineItem[];
}

const SELLER_NAME = 'Infocredit Group Ltd';
const SELLER_REG = 'Company registration: HE4404 (Cyprus)';

const NAVY: [number, number, number] = [16, 34, 60];
const MUTED: [number, number, number] = [100, 110, 125];
const LINE: [number, number, number] = [222, 226, 232];

function fmt(n: number | undefined | null) {
  return `€${(Number(n) || 0).toFixed(2)}`;
}

function paymentLabel(method?: string | null) {
  switch (method) {
    case 'card': return 'Card payment';
    case 'wallet': return 'Prepaid credit';
    case 'on_account': return 'On account';
    case 'invoice': return 'Monthly invoice';
    default: return method ?? '—';
  }
}

export function downloadInvoicePdf(data: InvoiceData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 20;
  let y = 24;

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(data.brandName || 'Infocredit Group', M, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Company intelligence, worldwide.', M, 21);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('INVOICE', W - M, 19, { align: 'right' });

  y = 44;
  doc.setTextColor(...NAVY);

  // Meta block (right-aligned under the header)
  let metaY = 44;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const meta: [string, string][] = [
    ['Invoice number: ', data.orderRef || '—'],
    ['Invoice date: ', data.date],
    ['Payment method: ', paymentLabel(data.paymentMethod)],
  ];
  meta.forEach(([k, v]) => {
    doc.setTextColor(...MUTED);
    doc.text(k, W - M, metaY, { align: 'right' });
    doc.setTextColor(...NAVY);
    doc.text(v, W - M, metaY - 5.2, { align: 'right' });
    metaY += 5.5;
  });
  metaY -= 5.5;

  // Seller / buyer blocks (start below the meta block)
  y = Math.max(metaY + 4, 44);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('FROM', M, y);
  doc.text('BILL TO', M + 85, y);
  y += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 48, 62);
  doc.text(SELLER_NAME, M, y);
  const b = data.buyer;
  const buyerLines = [
    b.company || b.name || '—',
    b.company && b.name ? b.name : null,
    b.email ?? null,
    b.reg ? `Reg. no.: ${b.reg}` : null,
    b.vat ? `VAT no.: ${b.vat}` : null,
    b.address?.street ?? null,
    [b.address?.postcode, b.address?.city].filter(Boolean).join(' ') || null,
    [b.address?.state, b.country].filter(Boolean).join(', ') || null,
  ].filter(Boolean) as string[];
  let buyerEnd = y;
  buyerLines.forEach((l) => {
    (doc.splitTextToSize(l, 52) as string[]).forEach((seg, i) => {
      doc.text(seg, M + 85, buyerEnd + i * 4.6);
    });
    buyerEnd += 4.6;
  });
  y += 4.6;
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  doc.text(SELLER_REG, M, y);
  y = Math.max(buyerEnd + 6, y + 6);

  // Items table
  y = Math.max(y + 4, metaY + 4);
  const cols = { desc: M, qty: M + 110, net: M + 125, vat: M + 152, amount: W - M };
  doc.setDrawColor(...LINE);
  doc.setFillColor(...NAVY);
  doc.rect(M, y - 6, W - 2 * M, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DESCRIPTION', cols.desc + 1, y);
  doc.text('QTY', cols.qty, y);
  doc.text('NET', cols.net, y, { align: 'right' });
  doc.text('VAT', cols.vat, y, { align: 'right' });
  doc.text('AMOUNT', cols.amount, y, { align: 'right' });
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 48, 62);
  doc.setFontSize(9);
  const rows: { label: string; net: number; vat: number }[] = [];
  for (const it of data.items) {
    rows.push({
      label: `${it.name}${it.speed ? ` (${it.speed} delivery)` : ''}`,
      net: it.unitPrice,
      vat: it.vat,
    });
    if (it.screening) {
      rows.push({ label: 'Compliance screening', net: it.screeningPrice, vat: 0 });
    }
  }
  if (!rows.length) rows.push({ label: 'Order', net: data.subtotal, vat: data.vat });

  for (const r of rows) {
    const lines = doc.splitTextToSize(r.label, cols.qty - cols.desc - 4) as string[];
    lines.forEach((l, i) => doc.text(l, cols.desc + 1, y + i * 4.4));
    doc.text('1', cols.qty, y);
    doc.text(fmt(r.net), cols.net, y, { align: 'right' });
    doc.text(fmt(r.vat), cols.vat, y, { align: 'right' });
    doc.text(fmt(r.net + r.vat), cols.amount, y, { align: 'right' });
    y += Math.max(lines.length * 4.4, 4.4) + 2.5;
  }

  // Totals
  y += 2;
  doc.setDrawColor(...LINE);
  doc.line(cols.net - 20, y, W - M, y);
  y += 6;
  const totals: [string, string, boolean][] = [
    ['Subtotal', fmt(data.subtotal), false],
    ['VAT', fmt(data.vat), false],
    ['Total', fmt(data.total), true],
  ];
  for (const [label, value, bold] of totals) {
    if (bold) doc.setFont('helvetica', 'bold'); else doc.setFont('helvetica', 'normal');
    doc.setTextColor(bold ? 16 : 60, bold ? 34 : 68, bold ? 60 : 82);
    doc.text(label, W - M - 40, y, { align: 'left' });
    doc.text(value, W - M, y, { align: 'right' });
    y += 6;
  }

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    `This invoice is issued by ${SELLER_NAME} (Cyprus registration HE4404). Invoice number ${data.orderRef || '—'}.`,
    M,
    doc.internal.pageSize.getHeight() - 16,
  );

  doc.save(`invoice-${(data.orderRef || 'order').replace(/[^A-Za-z0-9._-]/g, '')}.pdf`);
}
