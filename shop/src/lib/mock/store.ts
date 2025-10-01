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
type Payment = { _id: string; saleId: string; method: 'cash'|'card'|'transfer'|'cod_remit'|'partial'; amount: number; seq: number; status?: 'pending'|'confirmed'|'failed'; receivedAt?: number; externalRef?: string };
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

type MockState = {
  idempotency: Map<string, any>;
  sales: Map<string, Sale>;
  payments: Map<string, Payment>;
  deliveries: Map<string, DeliveryShipment>;
  customers: Map<string, Customer>;
  suppliers: Map<string, Supplier>;
  purchaseOrders: Map<string, PurchaseOrder>;
  movements: Movement[];
};

const g = globalThis as unknown as { __mockState?: MockState };
if (!g.__mockState) {
  g.__mockState = {
    idempotency: new Map<string, any>(),
    sales: new Map<string, Sale>(),
    payments: new Map<string, Payment>(),
    deliveries: new Map<string, DeliveryShipment>(),
    customers: new Map<string, Customer>(),
    suppliers: new Map<string, Supplier>(),
    purchaseOrders: new Map<string, PurchaseOrder>(),
    movements: []
  };
}
const { idempotency, sales, payments, deliveries, customers, suppliers, purchaseOrders, movements } = g.__mockState!;

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

