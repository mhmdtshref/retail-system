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
  appliedDiscounts: Array<{ id: string; source: 'promotion'|'coupon'; level: 'line'|'order'; label: string; amount: number; lines?: { sku: string; qty: number; discount: number }[]; traceId?: string }>;
  couponCode: string | null;
};

type Actions = {
  addLine: (line: Omit<PosCartLine, 'qty'> & { qty?: number }) => void;
  updateQty: (sku: string, qty: number) => void;
  removeLine: (sku: string) => void;
  clear: () => void;
  startSale: () => Promise<string>; // localSaleId
  startPartialSale: (downPayment: number, plan?: { schedule?: Array<{ seq: number; dueDate: string; amount: number }>; expiresAt?: string; minDownPercent?: number; note?: string }) => Promise<string>;
  addPayment: (method: PosPayment['method'], amount: number, meta?: PosPayment['meta']) => Promise<void>;
  setDiscount: (d: Discount | null) => void;
  setAppliedDiscounts: (list: State['appliedDiscounts']) => void;
  setCouponCode: (code: string | null) => void;
};

export const usePosStore = create<State & Actions>((set: any, get: any) => ({
  storeId: 'default',
  lines: [],
  payments: [],
  localSaleId: null,
  total: 0,
  lastReceipt: null,
  discount: null,
  appliedDiscounts: [],
  couponCode: null,

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
    const discountValue = Math.max(0, s.appliedDiscounts.reduce((acc, d) => acc + (d.amount || 0), 0));
    const grand = Math.max(0, subtotal - discountValue);
    const draft = {
      localSaleId,
      createdAt: Date.now(),
      lines: (s.lines as PosCartLine[]).map((l: PosCartLine) => ({ sku: l.sku, qty: l.qty, price: l.price })),
      totals: { subtotal, tax: 0, grand, discountValue },
      discount: s.discount || undefined,
      appliedDiscounts: s.appliedDiscounts || [],
      couponCode: s.couponCode || null,
      pendingCouponRedemption: !!(s.couponCode && !navigator.onLine),
      mode: 'cash' as const,
    };
    await posDb.draftSales.put(draft);
    const saleKey = makeSaleKey(s.storeId, localSaleId);
    await posDb.outbox.add({ id: uuid(), type: 'SALE_CREATE', payload: draft, idempotencyKey: saleKey, createdAt: Date.now(), retryCount: 0 });
    // If coupon present, queue redemption (will resolve saleId mapping later)
    if (s.couponCode) {
      const oid = uuid();
      const idemp = `${saleKey}:coupon:${s.couponCode}`;
      await posDb.outbox.add({ id: oid, type: 'COUPON_REDEEM', payload: { localSaleId, code: s.couponCode }, idempotencyKey: idemp, createdAt: Date.now(), retryCount: 0 });
    }
    set({ localSaleId });
    return localSaleId;
  },

  startPartialSale: async (downPayment, plan) => {
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
      mode: 'partial' as const,
      downPayment,
      schedule: plan?.schedule,
      expiresAt: plan?.expiresAt,
      minDownPercent: plan?.minDownPercent ?? 10,
    };
    await posDb.draftSales.put(draft);
    const saleKey = makeSaleKey(s.storeId, localSaleId);
    await posDb.outbox.add({ id: uuid(), type: 'SALE_CREATE', payload: draft, idempotencyKey: saleKey, createdAt: Date.now(), retryCount: 0 });
    const remaining = Math.max(0, grand - downPayment);
    const receipt: ReceiptData = {
      localSaleId,
      createdAt: Date.now(),
      lines: s.lines,
      payments: [{ method: 'cash', amount: downPayment, seq: 1, meta: { reservationNote: plan?.note } }],
      totals: { subtotal, tax: 0, grand, discountValue },
      discount: s.discount || undefined,
      offlinePending: !navigator.onLine,
      paymentPlan: { mode: 'partial', downPayment, remaining, minDownPercent: draft.minDownPercent!, schedule: plan?.schedule, expiresAt: plan?.expiresAt }
    };
    set({ localSaleId: null, lastReceipt: receipt, lines: [], payments: [], total: 0, discount: null });
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
    const discountValue = Math.max(0, s.appliedDiscounts.reduce((acc, d) => acc + (d.amount || 0), 0));
    const grand = Math.max(0, subtotal - discountValue);
    const receipt: ReceiptData = {
      localSaleId,
      createdAt: Date.now(),
      lines: s.lines,
      payments,
      totals: { subtotal, tax: 0, grand, discountValue },
      discount: s.discount || undefined,
      appliedDiscounts: s.appliedDiscounts || [],
      pendingCouponRedemption: !!(s.couponCode && !navigator.onLine),
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
  setAppliedDiscounts: (list) => set({ appliedDiscounts: Array.isArray(list) ? list : [] }),
  setCouponCode: (code) => set({ couponCode: code })
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

