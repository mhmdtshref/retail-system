"use client";
import { create } from 'zustand';
import { posDb } from '@/lib/db/posDexie';
import { Discount, PosCartLine, PosPayment, ReceiptData } from '@/lib/pos/types';
import { makePaymentKey, makeSaleKey, uuid } from '@/lib/pos/idempotency';

type State = {
  storeId: string;
  lines: PosCartLine[];
  payments: PosPayment[];
  localSaleId: string | null;
  total: number;
  lastReceipt: ReceiptData | null;
  discount: Discount | null;
};

type Actions = {
  addLine: (line: Omit<PosCartLine, 'qty'> & { qty?: number }) => void;
  updateQty: (sku: string, qty: number) => void;
  removeLine: (sku: string) => void;
  clear: () => void;
  startSale: () => Promise<string>; // localSaleId
  addPayment: (method: PosPayment['method'], amount: number, meta?: PosPayment['meta']) => Promise<void>;
  setDiscount: (d: Discount | null) => void;
};

export const usePosStore = create<State & Actions>((set: any, get: any) => ({
  storeId: 'default',
  lines: [],
  payments: [],
  localSaleId: null,
  total: 0,
  lastReceipt: null,
  discount: null,

  addLine: (line) =>
    set((s: any) => {
      const existingIdx = (s.lines as PosCartLine[]).findIndex((l: PosCartLine) => l.sku === line.sku);
      if (existingIdx >= 0) {
        const copy: PosCartLine[] = [...(s.lines as PosCartLine[])];
        copy[existingIdx] = { ...copy[existingIdx], qty: copy[existingIdx].qty + (line.qty ?? 1) } as PosCartLine;
        return { lines: copy, total: totalOf(copy) } as Partial<State> as State;
      }
      const next: PosCartLine[] = [...(s.lines as PosCartLine[]), { ...line, qty: line.qty ?? 1 } as PosCartLine];
      return { lines: next, total: totalOf(next) } as Partial<State> as State;
    }),

  clear: () => set({ lines: [], payments: [], localSaleId: null, total: 0, discount: null }),

  startSale: async () => {
    const s = get();
    const localSaleId = uuid();
    const subtotal = s.total;
    const discountValue = calcDiscountValue(subtotal, s.discount);
    const grand = Math.max(0, subtotal - discountValue);
    const draft = {
      localSaleId,
      createdAt: Date.now(),
      lines: (s.lines as PosCartLine[]).map((l: PosCartLine) => ({ sku: l.sku, qty: l.qty, price: l.price })),
      totals: { subtotal, tax: 0, grand, discountValue },
      discount: s.discount || undefined,
    };
    await posDb.draftSales.put(draft);
    const saleKey = makeSaleKey(s.storeId, localSaleId);
    await posDb.outbox.add({ id: uuid(), type: 'SALE_CREATE', payload: draft, idempotencyKey: saleKey, createdAt: Date.now(), retryCount: 0 });
    set({ localSaleId });
    return localSaleId;
  },

  addPayment: async (method, amount, meta) => {
    const s = get();
    if (!s.localSaleId) await get().startSale();
    const localSaleId = get().localSaleId!;
    const saleKey = makeSaleKey(s.storeId, localSaleId);
    const seq = (s.payments[s.payments.length - 1]?.seq ?? 0) + 1;
    const payment: PosPayment = { method, amount, seq, meta };
    await posDb.outbox.add({ id: uuid(), type: 'PAYMENT_ADD', payload: { localSaleId, ...payment }, idempotencyKey: makePaymentKey(saleKey, seq), createdAt: Date.now(), retryCount: 0 });
    const payments = [...s.payments, payment];
    const subtotal = s.total;
    const discountValue = calcDiscountValue(subtotal, s.discount);
    const grand = Math.max(0, subtotal - discountValue);
    const receipt: ReceiptData = {
      localSaleId,
      createdAt: Date.now(),
      lines: s.lines,
      payments,
      totals: { subtotal, tax: 0, grand, discountValue },
      discount: s.discount || undefined,
      offlinePending: !navigator.onLine,
    };
    set({ payments, lastReceipt: receipt, lines: [], total: 0, localSaleId: null, discount: null });
  },

  updateQty: (sku, qty) => set((s: any) => {
    const idx = (s.lines as PosCartLine[]).findIndex((l: PosCartLine) => l.sku === sku);
    if (idx < 0) return s;
    const copy: PosCartLine[] = [...(s.lines as PosCartLine[])];
    copy[idx] = { ...copy[idx], qty } as PosCartLine;
    return { lines: copy, total: totalOf(copy) } as Partial<State> as State;
  }),

  removeLine: (sku) => set((s: any) => {
    const next: PosCartLine[] = (s.lines as PosCartLine[]).filter((l: PosCartLine) => l.sku !== sku);
    return { lines: next, total: totalOf(next) } as Partial<State> as State;
  }),

  setDiscount: (d) => set({ discount: d }),
}));

function totalOf(lines: PosCartLine[]): number {
  return lines.reduce((acc, l) => acc + l.qty * l.price, 0);
}

function calcDiscountValue(subtotal: number, discount: Discount | null): number {
  if (!discount) return 0;
  if (discount.type === 'percent') {
    const percent = Math.min(100, Math.max(0, discount.value));
    return (subtotal * percent) / 100;
  }
  if (discount.type === 'fixed') {
    return Math.min(Math.max(0, discount.value), subtotal);
  }
  return 0;
}

