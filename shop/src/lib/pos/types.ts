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
  method: 'cash' | 'card' | 'transfer' | 'cod_remit';
  amount: number;
  seq: number;
  meta?: {
    cardLast4?: string;
    authCode?: string;
    receivedCash?: number;
    reservationNote?: string;
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
  totals: { subtotal: number; tax: number; grand: number; discountValue?: number };
  discount?: Discount;
  offlinePending: boolean;
  paymentPlan?: {
    mode: 'partial';
    downPayment: number;
    remaining: number;
    minDownPercent: number;
    schedule?: Array<{ seq: number; dueDate: string; amount: number; paidAt?: string }>;
    expiresAt?: string;
  };
};

