"use client";
import { create } from 'zustand';
import { posDb } from '@/lib/db/posDexie';
import { PosCartLine, PosPayment, ReceiptData } from '@/lib/pos/types';
import { makePaymentKey, makeSaleKey, uuid } from '@/lib/pos/idempotency';

type State = {
  storeId: string;
  lines: PosCartLine[];
  payments: PosPayment[];
  localSaleId: string | null;
  total: number;
  lastReceipt: ReceiptData | null;
};

type Actions = {
  addLine: (line: Omit<PosCartLine, 'qty'> & { qty?: number }) => void;
  updateQty: (sku: string, qty: number) => void;
  removeLine: (sku: string) => void;
  clear: () => void;
  startSale: () => Promise<string>; // localSaleId
  addPayment: (method: PosPayment['method'], amount: number, meta?: PosPayment['meta']) => Promise<void>;
};

export const usePosStore = create<State & Actions>((set: any, get: any) => ({
  storeId: 'default',
  lines: [],
  payments: [],
  localSaleId: null,
  total: 0,
  lastReceipt: null,

  addLine: (line) =>
    set((s: any) => {
      const existingIdx = s.lines.findIndex((l) => l.sku === line.sku);
      if (existingIdx >= 0) {
        const copy = [...s.lines];
        copy[existingIdx] = { ...copy[existingIdx], qty: copy[existingIdx].qty + (line.qty ?? 1) };
        return { lines: copy, total: totalOf(copy) } as Partial<State> as State;
      }
      const next = [...s.lines, { ...line, qty: line.qty ?? 1 } as PosCartLine];
      return { lines: next, total: totalOf(next) } as Partial<State> as State;
    }),

  clear: () => set({ lines: [], payments: [], localSaleId: null, total: 0 }),

  startSale: async () => {
    const s = get();
    const localSaleId = uuid();
    const draft = {
      localSaleId,
      createdAt: Date.now(),
      lines: s.lines.map((l) => ({ sku: l.sku, qty: l.qty, price: l.price })),
      totals: { subtotal: s.total, tax: 0, grand: s.total },
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
    const receipt: ReceiptData = {
      localSaleId,
      createdAt: Date.now(),
      lines: s.lines,
      payments,
      totals: { subtotal: s.total, tax: 0, grand: s.total },
      offlinePending: !navigator.onLine,
    };
    set({ payments, lastReceipt: receipt, lines: [], total: 0, localSaleId: null });
  },

  updateQty: (sku, qty) => set((s: any) => {
    const idx = s.lines.findIndex((l) => l.sku === sku);
    if (idx < 0) return s;
    const copy = [...s.lines];
    copy[idx] = { ...copy[idx], qty };
    return { lines: copy, total: totalOf(copy) } as Partial<State> as State;
  }),

  removeLine: (sku) => set((s: any) => {
    const next = s.lines.filter((l) => l.sku !== sku);
    return { lines: next, total: totalOf(next) } as Partial<State> as State;
  }),
}));

function totalOf(lines: PosCartLine[]): number {
  return lines.reduce((acc, l) => acc + l.qty * l.price, 0);
}

