type Installment = { seq: number; dueDate: string; amount: number; paidAt?: string };
type Reservation = { sku: string; qty: number; heldAt: string; expiresAt?: string };
type PaymentPlan = { mode: 'partial'; downPayment: number; remaining: number; minDownPercent: number; schedule?: Installment[]; expiresAt?: string };
type Customer = {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: { city?: string; street?: string; building?: string; notes?: string } | string;
  createdAt: number;
};
type Sale = {
  _id: string;
  lines: { sku: string; qty: number; price: number }[];
  total: number;
  paid: number;
  status: 'open'|'partially_paid'|'paid'|'cancelled';
  paymentPlan?: PaymentPlan;
  reservations?: Reservation[];
  customerId?: string;
  channel?: 'retail'|'online';
  deliveryShipmentId?: string;
  createdAt?: number;
};
type Payment = { _id: string; saleId: string; method: 'cash'|'card'|'transfer'|'cod_remit'|'partial'|'store_credit'; amount: number; seq: number; status?: 'pending'|'confirmed'|'failed'; receivedAt?: number; externalRef?: string };
type DeliveryShipment = {
  _id: string;
  saleId: string;
  provider: string;
  externalId: string;
  labelUrl?: string;
  policyUrl?: string;
  status: 'created'|'in_transit'|'out_for_delivery'|'delivered'|'failed'|'returned';
  toAddress?: { city?: string; street?: string; building?: string; notes?: string } | string;
  items: Array<{ sku: string; qty: number; name?: string }>;
  moneyStatus: 'pending'|'with_delivery_company'|'remitted_to_shop';
  events: Array<{ ts: string; status: string; payload?: any }>;
  lastCheckedAt?: string;
  webhookSignatureSecret: string;
  createdAt: number;
  updatedAt: number;
};

export type Supplier = {
  _id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
};

export type PurchaseOrder = {
  _id: string;
  poNumber: string;
  supplierId: string;
  status: 'draft'|'partial'|'received'|'cancelled';
  lines: Array<{ sku?: string; size?: string; color?: string; unitCost?: number; quantityOrdered?: number; quantityReceived?: number }>; 
  totals?: { itemsCount: number; subtotal: number; tax?: number; shipping?: number; grandTotal: number };
  attachments: string[]; // file urls
  receiptOcr?: { rawText: string; parsedAt: number; parserVersion: string };
  receivedAt?: number;
  createdBy?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

export type Movement = {
  _id: string;
  sku: string;
  type: 'purchase_in'|'sale_out'|'adjustment'|'return_in'|'return_out'|'reservation_hold'|'reservation_release';
  quantity: number; // signed
  unitCost?: number;
  unitPrice?: number;
  refType?: 'PO'|'Sale'|'Adjustment'|'Reservation'|'Return';
  refId?: string;
  occurredAt: number;
  createdBy?: string;
  note?: string;
};

// Refunds & Store Credit
export type Refund = {
  _id: string;
  origin: { type: 'return'|'exchange'|'sale_adjustment'|'manual'; refId?: string };
  customerId?: string;
  method: 'cash'|'card'|'transfer'|'store_credit';
  amount: number;
  status: 'pending'|'confirmed'|'failed';
  createdBy?: string;
  createdAt: number;
  confirmedAt?: number;
  notes?: string;
  externalRef?: string;
};

export type StoreCredit = {
  _id: string;
  customerId: string;
  code: string; // human friendly unique
  status: 'active'|'redeemed'|'expired'|'void';
  issuedAmount: number;
  remainingAmount: number;
  issuedAt: number;
  expiresAt?: number; // epoch ms
  issuedOrigin: { type: 'return'|'exchange'|'manual'; refId?: string };
  ledger: Array<{ ts: number; type: 'issue'|'redeem'|'expire'|'void'; amount: number; ref?: string; note?: string }>;
};

type MockState = {
  idempotency: Map<string, any>;
  sales: Map<string, Sale>;
  payments: Map<string, Payment>;
  returns: Map<string, any>;
  exchanges: Map<string, any>;
  deliveries: Map<string, DeliveryShipment>;
  customers: Map<string, Customer>;
  suppliers: Map<string, Supplier>;
  purchaseOrders: Map<string, PurchaseOrder>;
  movements: Movement[];
  refunds: Map<string, Refund>;
  storeCredits: Map<string, StoreCredit>;
  codeIndex: Map<string, string>; // code -> creditId
};

const g = globalThis as unknown as { __mockState?: MockState };
if (!g.__mockState) {
  g.__mockState = {
    idempotency: new Map<string, any>(),
    sales: new Map<string, Sale>(),
    payments: new Map<string, Payment>(),
    returns: new Map<string, any>(),
    exchanges: new Map<string, any>(),
    deliveries: new Map<string, DeliveryShipment>(),
    customers: new Map<string, Customer>(),
    suppliers: new Map<string, Supplier>(),
    purchaseOrders: new Map<string, PurchaseOrder>(),
    movements: [],
    refunds: new Map<string, Refund>(),
    storeCredits: new Map<string, StoreCredit>(),
    codeIndex: new Map<string, string>()
  };
}
const { idempotency, sales, payments, returns, exchanges, deliveries, customers, suppliers, purchaseOrders, movements, refunds, storeCredits, codeIndex } = g.__mockState!;

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const mockDb = {
  has(resultKey: string) {
    return idempotency.has(resultKey);
  },
  get(resultKey: string) {
    return idempotency.get(resultKey);
  },
  set(resultKey: string, value: any) {
    idempotency.set(resultKey, value);
  },
  // Sales listing/search helpers
  listSales(filter?: { customerId?: string; dateFrom?: number; dateTo?: number; receipt?: string }) {
    let arr = Array.from(sales.values());
    if (filter?.customerId) arr = arr.filter((s) => s.customerId === filter.customerId);
    if (filter?.dateFrom) arr = arr.filter((s) => (s.createdAt || 0) >= filter.dateFrom!);
    if (filter?.dateTo) arr = arr.filter((s) => (s.createdAt || 0) <= filter.dateTo!);
    // Simple receiptNo mock: use last 6 of id
    if (filter?.receipt) arr = arr.filter((s) => s._id.slice(-6) === filter.receipt);
    return arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },
  // Customers
  upsertCustomer(input: Omit<Customer, '_id'|'createdAt'> & { _id?: string }) {
    const id = input._id || uuid();
    const doc: Customer = { _id: id, name: input.name, phone: input.phone, email: input.email, address: input.address as any, createdAt: Date.now() };
    customers.set(id, doc);
    return doc;
  },
  getCustomer(id: string) {
    return customers.get(id) || null;
  },
  // Sales
  createSale(lines: Sale['lines'], total: number) {
    const id = uuid();
    const now = Date.now();
    const sale: Sale = { _id: id, lines, total, paid: 0, status: 'open', channel: 'retail', createdAt: now };
    sales.set(id, sale);
    return sale;
  },
  createOnlineSale(input: { customer: { name: string; phone?: string; email?: string; address?: any }; items: Sale['lines']; total: number }) {
    const cust = (customers.get((input as any).customerId) || mockDb.upsertCustomer({ name: input.customer.name, phone: input.customer.phone, email: input.customer.email, address: input.customer.address })) as Customer;
    const id = uuid();
    const now = Date.now();
    const sale: Sale = { _id: id, lines: input.items, total: input.total, paid: 0, status: 'open', channel: 'online', customerId: cust._id, createdAt: now };
    sales.set(id, sale);
    return sale;
  },
  createPartialSale(input: { lines: Sale['lines']; total: number; downPayment: number; minDownPercent?: number; schedule?: Installment[]; expiresAt?: string; customerId?: string }) {
    const id = uuid();
    const now = Date.now();
    const minPct = input.minDownPercent ?? 10;
    const minAmount = Math.ceil((input.total * minPct) / 100);
    if (input.downPayment < minAmount) {
      throw new Error('Down payment below minimum');
    }
    const reservations: Reservation[] = input.lines.map((l) => ({ sku: l.sku, qty: l.qty, heldAt: new Date(now).toISOString(), expiresAt: input.expiresAt }));
    // movements: reservation_hold (positive quantity reserved)
    for (const r of reservations) {
      movements.push({ _id: uuid(), sku: r.sku, type: 'reservation_hold', quantity: r.qty, refType: 'Reservation', refId: id, occurredAt: now });
    }
    const remaining = Math.max(0, input.total - input.downPayment);
    const sale: Sale = {
      _id: id,
      lines: input.lines,
      total: input.total,
      paid: input.downPayment,
      status: remaining > 0 ? 'partially_paid' : 'paid',
      paymentPlan: { mode: 'partial', downPayment: input.downPayment, remaining, minDownPercent: minPct, schedule: input.schedule || [], expiresAt: input.expiresAt },
      reservations,
      customerId: input.customerId,
      createdAt: now
    };
    sales.set(id, sale);
    if (remaining === 0) {
      // finalize immediately: convert holds to sale_out and clear reservations
      for (const r of reservations) {
        movements.push({ _id: uuid(), sku: r.sku, type: 'sale_out', quantity: r.qty, refType: 'Sale', refId: id, occurredAt: now });
        // release reservation implicitly by consuming; keep audit by leaving reservation entries
      }
    }
    return sale;
  },
  // Payments
  addPayment(p: Partial<Payment> & { saleId: string; method: Payment['method']; amount: number; seq: number }) {
    const id = p._id || uuid();
    const payment: Payment = { _id: id, saleId: p.saleId, method: p.method, amount: p.amount, seq: p.seq, status: p.status || 'confirmed', receivedAt: p.receivedAt || Date.now(), externalRef: p.externalRef } as Payment;
    payments.set(id, payment);
    const s = sales.get(payment.saleId);
    if (!s) throw new Error('Sale not found');
    if (payment.method === 'cod_remit') {
      if (payment.status === 'confirmed') {
        s.paid += payment.amount;
      }
    } else {
      s.paid += payment.amount;
    }
    const remainingBefore = s.paymentPlan?.remaining ?? Math.max(0, s.total - (s.paymentPlan?.downPayment ?? 0));
    const remainingAfter = Math.max(0, (s.total - s.paid));
    if (s.paymentPlan) {
      s.paymentPlan.remaining = remainingAfter;
      // mark earliest unpaid installment as paid
      const inst = (s.paymentPlan.schedule || []).find((i) => !i.paidAt);
      if (inst) inst.paidAt = new Date().toISOString();
    }
    if (s.paid >= s.total) {
      s.status = 'paid';
      // convert holds into sale_out if any
      if (s.reservations && s.reservations.length) {
        for (const r of s.reservations) {
          movements.push({ _id: uuid(), sku: r.sku, type: 'sale_out', quantity: r.qty, refType: 'Sale', refId: s._id, occurredAt: Date.now() });
        }
      }
    } else {
      s.status = 'partially_paid';
    }
    return { ok: true, paid: s.paid, status: s.status, remaining: remainingAfter, remainingBefore, payment };
  },
  createCodPendingPayment(input: { saleId: string; amount: number; seq?: number }) {
    return mockDb.addPayment({ saleId: input.saleId, method: 'cod_remit', amount: input.amount, seq: input.seq ?? 0, status: 'pending' } as any);
  },
  confirmCodPaymentForSale(saleId: string) {
    const s = sales.get(saleId);
    if (!s) throw new Error('Sale not found');
    const cods = Array.from(payments.values()).filter((p) => p.saleId === saleId && p.method === 'cod_remit' && p.status === 'pending');
    let updated = 0;
    for (const p of cods) {
      p.status = 'confirmed';
      s.paid += p.amount;
      updated += p.amount;
    }
    if (s.paid >= s.total) {
      s.status = 'paid';
      if (s.reservations && s.reservations.length) {
        for (const r of s.reservations) {
          movements.push({ _id: uuid(), sku: r.sku, type: 'sale_out', quantity: r.qty, refType: 'Sale', refId: s._id, occurredAt: Date.now() });
        }
      }
    } else if (updated > 0) {
      s.status = 'partially_paid';
    }
    return { ok: true, paid: s.paid, status: s.status, updated } as const;
  },
  cancelLayaway(id: string) {
    const s = sales.get(id);
    if (!s) throw new Error('Sale not found');
    if (s.status === 'paid') return { ok: false, error: 'Already paid' } as const;
    const now = Date.now();
    if (s.reservations) {
      for (const r of s.reservations) {
        movements.push({ _id: uuid(), sku: r.sku, type: 'reservation_release', quantity: r.qty, refId: id, refType: 'Reservation', occurredAt: now });
      }
    }
    s.status = 'cancelled';
    return { ok: true } as const;
  },
  getSale(id: string) {
    return sales.get(id) || null;
  },
  // Refunds
  createRefund(input: Omit<Refund, '_id'|'createdAt'|'confirmedAt'|'status'> & { status?: Refund['status'] }) {
    const id = uuid();
    const now = Date.now();
    let status: Refund['status'] = input.status || (input.method === 'cash' ? 'confirmed' : input.method === 'store_credit' ? 'confirmed' : 'pending');
    // If store_credit, ensure we have issued a credit instrument
    if (input.method === 'store_credit') {
      if (!input.customerId) throw new Error('customerId required for store credit refund');
      const credit = mockDb.issueStoreCredit({ customerId: input.customerId, amount: input.amount, origin: { type: input.origin.type === 'manual' ? 'manual' : (input.origin.type as any), refId: input.origin.refId }, note: input.notes });
      // Link via notes externalRef
      const refund: Refund = { _id: id, origin: input.origin, customerId: input.customerId, method: input.method, amount: input.amount, status, createdBy: input.createdBy, createdAt: now, confirmedAt: now, notes: `credit:${credit._id}` };
      refunds.set(id, refund);
      return refund;
    }
    const refund: Refund = { _id: id, origin: input.origin, customerId: input.customerId, method: input.method, amount: input.amount, status, createdBy: input.createdBy, createdAt: now, confirmedAt: status === 'confirmed' ? now : undefined, notes: input.notes, externalRef: input.externalRef };
    refunds.set(id, refund);
    return refund;
  },
  listRefunds(filter?: { dateFrom?: number; dateTo?: number; method?: Refund['method']; status?: Refund['status']; customerId?: string }) {
    let arr = Array.from(refunds.values());
    if (filter?.dateFrom) arr = arr.filter((r) => r.createdAt >= filter.dateFrom!);
    if (filter?.dateTo) arr = arr.filter((r) => r.createdAt <= filter.dateTo!);
    if (filter?.method) arr = arr.filter((r) => r.method === filter.method);
    if (filter?.status) arr = arr.filter((r) => r.status === filter.status);
    if (filter?.customerId) arr = arr.filter((r) => r.customerId === filter.customerId);
    return arr.sort((a, b) => b.createdAt - a.createdAt);
  },
  getRefund(id: string) {
    return refunds.get(id) || null;
  },
  confirmRefund(id: string) {
    const r = refunds.get(id);
    if (!r) return null;
    r.status = 'confirmed';
    r.confirmedAt = Date.now();
    refunds.set(id, r);
    return r;
  },
  voidRefund(id: string) {
    const r = refunds.get(id);
    if (!r) return null;
    r.status = 'failed';
    refunds.set(id, r);
    return r;
  },
  // Store Credit
  issueStoreCredit(input: { customerId: string; amount: number; expiresAt?: number; note?: string; origin: { type: 'return'|'exchange'|'manual'; refId?: string } }) {
    const id = uuid();
    const code = genCreditCode();
    const doc: StoreCredit = {
      _id: id,
      customerId: input.customerId,
      code,
      status: 'active',
      issuedAmount: input.amount,
      remainingAmount: input.amount,
      issuedAt: Date.now(),
      expiresAt: input.expiresAt,
      issuedOrigin: input.origin,
      ledger: [{ ts: Date.now(), type: 'issue', amount: input.amount, note: input.note }]
    };
    storeCredits.set(id, doc);
    codeIndex.set(code, id);
    return doc;
  },
  getCreditById(id: string) {
    return storeCredits.get(id) || null;
  },
  getCreditByCode(code: string) {
    const id = codeIndex.get(code);
    if (!id) return null;
    return storeCredits.get(id) || null;
  },
  listCreditsByCustomer(customerId: string) {
    return Array.from(storeCredits.values()).filter((c) => c.customerId === customerId).sort((a, b) => (b.issuedAt - a.issuedAt));
  },
  getCustomerCreditSummary(customerId: string) {
    const list = mockDb.listCreditsByCustomer(customerId);
    const balance = list.filter((c) => c.status === 'active').reduce((s, c) => s + c.remainingAmount, 0);
    return { balance, credits: list } as const;
  },
  redeemStoreCredit(input: { creditIdOrCode: string; customerId: string; amount: number; saleId?: string; idempotencyKey?: string }) {
    const credit = (storeCredits.get(input.creditIdOrCode) || mockDb.getCreditByCode(input.creditIdOrCode));
    if (!credit) throw new Error('Credit not found');
    if (credit.customerId !== input.customerId) throw new Error('Customer mismatch');
    if (credit.status !== 'active') throw new Error('Credit not active');
    if (credit.expiresAt && credit.expiresAt < Date.now()) throw new Error('Credit expired');
    if (input.amount > credit.remainingAmount) throw new Error('Over redemption');
    // idempotent by ref
    if (input.idempotencyKey && credit.ledger.some((e) => e.type === 'redeem' && e.ref === input.idempotencyKey)) {
      return { credit, remainingAmount: credit.remainingAmount } as const;
    }
    credit.remainingAmount = Math.round((credit.remainingAmount - input.amount) * 100) / 100;
    credit.ledger.push({ ts: Date.now(), type: 'redeem', amount: input.amount, ref: input.idempotencyKey, note: input.saleId ? `sale:${input.saleId}` : undefined });
    if (credit.remainingAmount <= 0) {
      credit.status = 'redeemed';
    }
    storeCredits.set(credit._id, credit);
    return { credit, remainingAmount: credit.remainingAmount } as const;
  },
  expireCredits(now?: number) {
    const ts = now || Date.now();
    let count = 0;
    for (const c of storeCredits.values()) {
      if (c.status === 'active' && c.expiresAt && c.expiresAt < ts) {
        c.status = 'expired';
        c.ledger.push({ ts, type: 'expire', amount: c.remainingAmount });
        c.remainingAmount = 0;
        storeCredits.set(c._id, c);
        count++;
      }
    }
    return { expired: count } as const;
  },
  // Returns
  createReturn(input: { saleId: string; lines: Array<{ sku: string; qty: number; unitPrice: number; reason: string; condition?: string }>; refund: { method: 'cash'|'card'|'store_credit'; amount: number; status?: 'confirmed'|'pending' }; notes?: string }) {
    const id = uuid();
    const now = Date.now();
    const rma = `RMA-${now.toString().slice(-6)}`;
    const refMovementIds: string[] = [];
    for (const l of input.lines) {
      const m = mockDb.addMovement({ sku: l.sku, type: 'return_in', quantity: l.qty, refType: 'Return', refId: id, note: input.notes });
      refMovementIds.push(m._id);
    }
    const ret = { _id: id, saleId: input.saleId, rma, lines: input.lines, refund: { ...input.refund, status: input.refund.status || 'confirmed' }, posted: true, postedAt: now, createdBy: 'mock', notes: input.notes, refMovementIds, createdAt: now, updatedAt: now };
    returns.set(id, ret);
    if (input.refund.amount > 0) {
      // Create refund record; if store_credit, issue instrument
      const sale = sales.get(input.saleId);
      const customerId = sale?.customerId;
      mockDb.createRefund({ origin: { type: 'return', refId: id }, method: input.refund.method as any, amount: input.refund.amount, customerId: customerId || undefined, notes: input.notes });
    }
    return ret;
  },
  getReturn(id: string) {
    return returns.get(id) || null;
  },
  listReturns(filter?: { dateFrom?: number; dateTo?: number; customerId?: string }) {
    let arr = Array.from(returns.values());
    if (filter?.dateFrom) arr = arr.filter((r) => (r.createdAt || 0) >= filter.dateFrom!);
    if (filter?.dateTo) arr = arr.filter((r) => (r.createdAt || 0) <= filter.dateTo!);
    return arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },
  sumReturnedQtyForSaleSku(saleId: string, sku: string) {
    const arr = Array.from(returns.values()).filter((r) => r.saleId === saleId);
    let sum = 0;
    for (const r of arr) {
      for (const l of r.lines as any[]) if (l.sku === sku) sum += l.qty;
    }
    return sum;
  },
  // Exchanges
  createExchange(input: { originalSaleId: string; returnLines: Array<{ sku: string; qty: number; unitPrice: number; reason: string }>; newLines: Array<{ sku: string; qty: number; unitPrice: number }>; settlement: { customerOwes: number; shopOwes: number; paidMethod?: 'cash'|'card'; refundMethod?: 'cash'|'card'|'store_credit' }; notes?: string }) {
    const id = uuid();
    const now = Date.now();
    const refMovementIds: string[] = [];
    for (const l of input.returnLines) {
      const m = mockDb.addMovement({ sku: l.sku, type: 'return_in', quantity: l.qty, refType: 'Exchange', refId: id, note: input.notes });
      refMovementIds.push(m._id);
    }
    for (const l of input.newLines) {
      const m = mockDb.addMovement({ sku: l.sku, type: 'sale_out', quantity: l.qty, refType: 'Exchange', refId: id, note: input.notes });
      refMovementIds.push(m._id);
    }
    const ex = { _id: id, originalSaleId: input.originalSaleId, returnLines: input.returnLines, newLines: input.newLines, settlement: input.settlement, posted: true, postedAt: now, createdBy: 'mock', notes: input.notes, refMovementIds, createdAt: now, updatedAt: now };
    exchanges.set(id, ex);
    // Create refund for shop owed part
    if (input.settlement.shopOwes > 0 && input.settlement.refundMethod) {
      const sale = sales.get(input.originalSaleId);
      const customerId = sale?.customerId;
      mockDb.createRefund({ origin: { type: 'exchange', refId: id }, method: input.settlement.refundMethod as any, amount: input.settlement.shopOwes, customerId: customerId || undefined, notes: input.notes });
    }
    return ex;
  },
  getExchange(id: string) {
    return exchanges.get(id) || null;
  },
  listExchanges(filter?: { dateFrom?: number; dateTo?: number; customerId?: string }) {
    let arr = Array.from(exchanges.values());
    if (filter?.dateFrom) arr = arr.filter((r) => (r.createdAt || 0) >= filter.dateFrom!);
    if (filter?.dateTo) arr = arr.filter((r) => (r.createdAt || 0) <= filter.dateTo!);
    return arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },
  // Delivery Shipments
  createShipment(input: { saleId: string; provider: string; externalId: string; labelUrl?: string; policyUrl?: string; toAddress?: any; items: Array<{ sku: string; qty: number; name?: string }>; webhookSignatureSecret: string }) {
    const id = uuid();
    const now = Date.now();
    const shipment: DeliveryShipment = {
      _id: id,
      saleId: input.saleId,
      provider: input.provider,
      externalId: input.externalId,
      labelUrl: input.labelUrl,
      policyUrl: input.policyUrl,
      status: 'created',
      toAddress: input.toAddress,
      items: input.items,
      moneyStatus: 'pending',
      events: [{ ts: new Date(now).toISOString(), status: 'created' }],
      lastCheckedAt: new Date(now).toISOString(),
      webhookSignatureSecret: input.webhookSignatureSecret,
      createdAt: now,
      updatedAt: now
    };
    deliveries.set(id, shipment);
    const s = sales.get(input.saleId);
    if (s) {
      s.deliveryShipmentId = id;
    }
    return shipment;
  },
  updateShipmentStatusByExternalId(externalId: string, status: DeliveryShipment['status'], payload?: any) {
    const sh = Array.from(deliveries.values()).find((d) => d.externalId === externalId);
    if (!sh) return null;
    sh.status = status;
    sh.updatedAt = Date.now();
    sh.events.push({ ts: new Date().toISOString(), status, payload });
    if (status === 'delivered') {
      // create pending COD remittance
      const s = sales.get(sh.saleId);
      if (s) {
        const remaining = Math.max(0, s.total - s.paid);
        if (remaining > 0) mockDb.createCodPendingPayment({ saleId: s._id, amount: remaining });
      }
      sh.moneyStatus = 'with_delivery_company';
    }
    return sh;
  },
  updateShipmentStatusById(id: string, status: DeliveryShipment['status'], payload?: any) {
    const sh = deliveries.get(id);
    if (!sh) return null;
    return mockDb.updateShipmentStatusByExternalId(sh.externalId, status, payload);
  },
  listShipments(filter?: { status?: DeliveryShipment['status'][]; dateFrom?: number; dateTo?: number; search?: string }) {
    let arr = Array.from(deliveries.values());
    if (filter?.status && filter.status.length) arr = arr.filter((d) => filter.status!.includes(d.status));
    if (filter?.dateFrom) arr = arr.filter((d) => d.createdAt >= filter.dateFrom!);
    if (filter?.dateTo) arr = arr.filter((d) => d.createdAt <= filter.dateTo!);
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      arr = arr.filter((d) => {
        const s = sales.get(d.saleId);
        const c = s?.customerId ? customers.get(s.customerId) : undefined;
        return (
          d.externalId.toLowerCase().includes(q) ||
          (c?.name || '').toLowerCase().includes(q) ||
          (c?.phone || '').toLowerCase().includes(q)
        );
      });
    }
    return arr.sort((a, b) => b.createdAt - a.createdAt);
  },
  getShipment(id: string) {
    return deliveries.get(id) || null;
  },
  getShipmentByExternalId(externalId: string) {
    return Array.from(deliveries.values()).find((d) => d.externalId === externalId) || null;
  },
  markShipmentRemitted(id: string) {
    const sh = deliveries.get(id);
    if (!sh) throw new Error('Shipment not found');
    const s = sales.get(sh.saleId);
    if (!s) throw new Error('Sale not found');
    const result = mockDb.confirmCodPaymentForSale(s._id);
    sh.moneyStatus = 'remitted_to_shop';
    sh.updatedAt = Date.now();
    sh.events.push({ ts: new Date().toISOString(), status: 'remitted_to_shop' });
    return { shipment: sh, sale: s, paymentResult: result };
  },
  refreshNonTerminalShipments(updater: (externalId: string) => Promise<{ status: DeliveryShipment['status']; payload?: any }>): Promise<{ updated: number }> {
    const list = Array.from(deliveries.values()).filter((d) => !['delivered','failed','returned'].includes(d.status));
    return (async () => {
      let updated = 0;
      for (const d of list) {
        try {
          const res = await updater(d.externalId);
          if (res && res.status && res.status !== d.status) {
            mockDb.updateShipmentStatusByExternalId(d.externalId, res.status, res.payload);
            updated++;
          } else {
            d.lastCheckedAt = new Date().toISOString();
          }
        } catch {}
      }
      return { updated };
    })();
  },
  listLayaway(filter?: { status?: Sale['status']; customerId?: string; dateFrom?: number; dateTo?: number }) {
    let arr = Array.from(sales.values());
    arr = arr.filter((s) => !!s.paymentPlan && (s.status === 'partially_paid' || s.status === 'paid' || s.status === 'cancelled'));
    if (filter?.status) arr = arr.filter((s) => s.status === filter.status);
    if (filter?.customerId) arr = arr.filter((s) => s.customerId === filter.customerId);
    if (filter?.dateFrom) arr = arr.filter((s) => (s.createdAt || 0) >= filter.dateFrom!);
    if (filter?.dateTo) arr = arr.filter((s) => (s.createdAt || 0) <= filter.dateTo!);
    return arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },
  // Suppliers
  listSuppliers() {
    return Array.from(suppliers.values());
  },
  upsertSupplier(s: Omit<Supplier, '_id'> & { _id?: string }) {
    const _id = s._id || uuid();
    const sup: Supplier = { _id, name: s.name, contactName: s.contactName, email: s.email, phone: s.phone, address: s.address, notes: s.notes };
    suppliers.set(_id, sup);
    return sup;
  },
  getSupplier(id: string) {
    return suppliers.get(id) || null;
  },
  // Purchase Orders
  createPO(input: { poNumber?: string; supplierId: string; lines?: PurchaseOrder['lines']; notes?: string }): PurchaseOrder {
    const id = uuid();
    const poNumber = input.poNumber || `PO-${Date.now().toString().slice(-6)}`;
    const now = Date.now();
    const po: PurchaseOrder = {
      _id: id,
      poNumber,
      supplierId: input.supplierId,
      status: 'draft',
      lines: input.lines || [],
      totals: { itemsCount: 0, subtotal: 0, grandTotal: 0 },
      attachments: [],
      createdAt: now,
      updatedAt: now,
      notes: input.notes || ''
    };
    purchaseOrders.set(id, po);
    return po;
  },
  listPOs(filter?: { status?: PurchaseOrder['status']; supplierId?: string; search?: string }) {
    let arr = Array.from(purchaseOrders.values());
    if (filter?.status) arr = arr.filter((p) => p.status === filter.status);
    if (filter?.supplierId) arr = arr.filter((p) => p.supplierId === filter.supplierId);
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      arr = arr.filter((p) => p.poNumber.toLowerCase().includes(q));
    }
    return arr.sort((a, b) => b.createdAt - a.createdAt);
  },
  getPO(id: string) {
    return purchaseOrders.get(id) || null;
  },
  updatePO(id: string, patch: Partial<PurchaseOrder>) {
    const cur = purchaseOrders.get(id);
    if (!cur) return null;
    const next: PurchaseOrder = { ...cur, ...patch, updatedAt: Date.now() };
    purchaseOrders.set(id, next);
    return next;
  },
  addPOAttachment(id: string, fileUrl: string) {
    const cur = purchaseOrders.get(id);
    if (!cur) return null;
    cur.attachments.push(fileUrl);
    cur.updatedAt = Date.now();
    purchaseOrders.set(id, cur);
    return cur;
  },
  setPOOcr(id: string, rawText: string, parserVersion: string) {
    const cur = purchaseOrders.get(id);
    if (!cur) return null;
    cur.receiptOcr = { rawText, parsedAt: Date.now(), parserVersion };
    cur.updatedAt = Date.now();
    purchaseOrders.set(id, cur);
    return cur;
  },
  // Movements
  addMovement(m: Omit<Movement, '_id'|'occurredAt'> & { occurredAt?: number }) {
    const doc: Movement = { _id: uuid(), occurredAt: m.occurredAt || Date.now(), ...m };
    movements.push(doc);
    return doc;
  },
  listMovementsBySkus(skus: string[]) {
    return movements.filter((m) => skus.includes(m.sku));
  }
};

