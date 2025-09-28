export type PosCartLine = {
  sku: string;
  name: string;
  price: number;
  qty: number;
  size?: string;
  color?: string;
};

export type PosPayment = {
  method: 'cash' | 'card' | 'partial';
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
  totals: { subtotal: number; tax: number; grand: number };
  offlinePending: boolean;
};

