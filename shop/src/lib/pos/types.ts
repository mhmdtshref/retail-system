export type PosCartLine = {
  sku: string;
  name: string;
  price: number;
  qty: number;
};

export type PosPayment = {
  method: 'cash' | 'card' | 'partial';
  amount: number;
  seq: number;
};

export type StartSaleResponse = {
  saleId: string;
};

