export type PosCartLine = {
  sku: string;
  name: string;
  price: number;
  qty: number;
  size?: string;
  color?: string;
};

export type Discount =
  | { type: 'percent'; value: number }
  | { type: 'fixed'; value: number };

export type CartTotals = {
  subtotal: number;
  discountValue: number;
  grandTotal: number;
};

export type PosPayment = {
  method: 'cash' | 'card' | 'transfer' | 'cod_remit' | 'store_credit';
  amount: number;
  seq: number;
  meta?: {
    cardLast4?: string;
    authCode?: string;
    receivedCash?: number;
    reservationNote?: string;
    customerId?: string;
    creditIdOrCode?: string;
  };
};

export type StartSaleResponse = {
  saleId: string;
};

export type ReceiptData = {
  localSaleId: string;
  saleId?: string;
  createdAt: number;
  lines: PosCartLine[];
  payments: PosPayment[];
  totals: { subtotal: number; tax: number; grand: number; discountValue?: number; roundingAdj?: number; taxByRate?: Array<{ rate: number; taxable: number; tax: number }>; priceMode?: 'tax_inclusive'|'tax_exclusive' };
  discount?: Discount;
  offlinePending: boolean;
  appliedDiscounts?: Array<{ id: string; source: 'promotion'|'coupon'; level: 'line'|'order'; label: string; amount: number; lines?: { sku: string; qty: number; discount: number }[]; traceId?: string }>;
  pendingCouponRedemption?: boolean;
  paymentPlan?: {
    mode: 'partial';
    downPayment: number;
    remaining: number;
    minDownPercent: number;
    schedule?: Array<{ seq: number; dueDate: string; amount: number; paidAt?: string }>;
    expiresAt?: string;
  };
};

export type ReturnDraft = {
  localId: string;
  saleId: string;
  lines: Array<{ sku: string; qty: number; unitPrice: number; reason: string; condition?: string }>;
  refund: { method: 'cash'|'card'|'store_credit'; amount: number };
  notes?: string;
  createdAt: number;
};

export type ExchangeDraft = {
  localId: string;
  originalSaleId: string;
  returnLines: Array<{ sku: string; qty: number; unitPrice: number; reason: string }>;
  newLines: Array<{ sku: string; qty: number; unitPrice: number }>;
  settlement: { customerOwes: number; shopOwes: number; paidMethod?: 'cash'|'card'; refundMethod?: 'cash'|'card'|'store_credit' };
  notes?: string;
  createdAt: number;
};

