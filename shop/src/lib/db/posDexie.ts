import Dexie, { Table } from 'dexie';

export type ProductLite = {
  sku: string;
  productCode?: string;
  name_ar?: string;
  name_en?: string;
  size?: string;
  color?: string;
  retailPrice: number;
  barcode?: string;
  version?: number;
};

export type Availability = {
  sku: string;
  onHand: number;
  reserved: number;
  available: number;
  asOf: number; // epoch ms
};

export type CustomerLocal = {
  _id?: string;
  localId: string; // uuid
  name: string;
  phone?: string;
  address?: string;
  synced?: boolean;
};

export type DraftSale = {
  localSaleId: string; // uuid
  createdAt: number;
  lines: Array<{ sku: string; qty: number; price: number }>; 
  customerLocalId?: string;
  totals: { subtotal: number; tax: number; grand: number };
};

export type OutboxItem = {
  id: string; // uuid
  type: 'SALE_CREATE' | 'PAYMENT_ADD' | 'PARTIAL_PLAN' | 'RESERVATION_RELEASE';
  payload: unknown;
  idempotencyKey: string;
  createdAt: number;
  retryCount: number;
};

export type SyncLog = {
  key: string; // e.g., mapping:localSaleId
  value: string; // e.g., server saleId
  updatedAt: number;
};

export class POSDexie extends Dexie {
  products!: Table<ProductLite, string>; // key: sku
  availabilitySnapshot!: Table<Availability, string>; // key: sku
  customers!: Table<CustomerLocal, string>; // key: localId
  draftSales!: Table<DraftSale, string>; // key: localSaleId
  outbox!: Table<OutboxItem, string>; // key: id
  syncLog!: Table<SyncLog, string>; // key: key

  constructor() {
    super('pos-db-v1');
    this.version(1).stores({
      products: 'sku, productCode, barcode',
      availabilitySnapshot: 'sku, asOf',
      customers: 'localId, _id, phone',
      draftSales: 'localSaleId, createdAt',
      outbox: 'id, type, idempotencyKey, createdAt',
      syncLog: 'key, updatedAt'
    });
  }
}

export const posDb = new POSDexie();

