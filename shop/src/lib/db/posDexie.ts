import Dexie, { Table } from 'dexie';
import type { Discount } from '@/lib/pos/types';

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
  totals: { subtotal: number; tax: number; grand: number; discountValue?: number };
  discount?: Discount;
  appliedDiscounts?: Array<{ id: string; source: 'promotion'|'coupon'; level: 'line'|'order'; label: string; amount: number; lines?: { sku: string; qty: number; discount: number }[]; traceId?: string }>;
  pendingCouponRedemption?: boolean;
  couponCode?: string | null;
  mode?: 'cash'|'card'|'partial';
  downPayment?: number;
  schedule?: Array<{ seq: number; dueDate: string; amount: number }>;
  expiresAt?: string;
  minDownPercent?: number;
};

export type OutboxItem = {
  id: string; // uuid
  type: 'SALE_CREATE' | 'PAYMENT_ADD' | 'LAYAWAY_CANCEL' | 'LAYAWAY_PAYMENT' | 'LAYAWAY_REMIND' | 'COUNT_SESSION_SYNC' | 'COUNT_POST_VARIANCES' | 'RETURN_CREATE' | 'EXCHANGE_CREATE' | 'REFUND_CREATE' | 'CREDIT_ISSUE' | 'CREDIT_REDEEM' | 'COUPON_REDEEM' | 'CUSTOMER_CREATE' | 'CUSTOMER_UPDATE';
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
  countSessions!: Table<any, string>;
  countItems!: Table<any, number>;
  storeCreditsLocal!: Table<any, string>;
  refundDrafts!: Table<any, string>;
  promotionsActive!: Table<any, string>;
  couponsIndex!: Table<any, string>;
  taxConfigCache!: Table<any, string>;
  currencyConfigCache!: Table<any, string>;
  recentCustomers!: Table<any, string>;
  customerLookups!: Table<any, number>;
  customerDrafts!: Table<any, string>;

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
    // Bump version for count sessions
    this.version(2).stores({
      countSessions: 'localId, serverId, status, createdAt',
      countItems: '++id, localSessionId, sku'
    });
    // Bump version for returns/exchanges drafts
    this.version(3).stores({
      returnsDrafts: 'localId, createdAt',
      exchangesDrafts: 'localId, createdAt'
    });
    // Bump version for refunds and store credits
    this.version(4).stores({
      storeCreditsLocal: 'localId, serverId, customerId, code, status',
      refundDrafts: 'localId, createdAt'
    });
    // Bump version for discounts engine caches
    this.version(5).stores({
      promotionsActive: 'id, updatedAt, startsAt, endsAt',
      couponsIndex: 'codeLower, expiresAt'
    });
    // Bump version for tax & currency offline cache
    this.version(6).stores({
      taxConfigCache: 'id, updatedAt',
      currencyConfigCache: 'id, updatedAt'
    });
    // Bump version for customers offline cache
    this.version(7).stores({
      recentCustomers: 'id, updatedAt, name',
      customerLookups: '++id, ts, q',
      customerDrafts: 'localId, createdAt'
    });
    // Bump version for layaway cache and drafts
    this.version(8).stores({
      layawayCache: 'id, updatedAt, dueAt, status, bucket',
      layawayRemindersDrafts: 'localId, layawayId, createdAt'
    });
  }
}

export const posDb = new POSDexie();

