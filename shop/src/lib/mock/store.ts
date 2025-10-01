type Installment = { seq: number; dueDate: string; amount: number; paidAt?: string };
type Reservation = { sku: string; qty: number; heldAt: string; expiresAt?: string };
type PaymentPlan = { mode: 'partial'; downPayment: number; remaining: number; minDownPercent: number; schedule?: Installment[]; expiresAt?: string };
type Sale = {
  _id: string;
  lines: { sku: string; qty: number; price: number }[];
  total: number;
  paid: number;
  status: 'open'|'partially_paid'|'paid'|'cancelled';
  paymentPlan?: PaymentPlan;
  reservations?: Reservation[];
  customerId?: string;
  createdAt?: number;
};
type Payment = { saleId: string; method: 'cash'|'card'|'transfer'|'cod_remit'|'partial'; amount: number; seq: number };

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
  suppliers: Map<string, Supplier>;
  purchaseOrders: Map<string, PurchaseOrder>;
  movements: Movement[];
};

const g = globalThis as unknown as { __mockState?: MockState };
if (!g.__mockState) {
  g.__mockState = {
    idempotency: new Map<string, any>(),
    sales: new Map<string, Sale>(),
    suppliers: new Map<string, Supplier>(),
    purchaseOrders: new Map<string, PurchaseOrder>(),
    movements: []
  };
}
const { idempotency, sales, suppliers, purchaseOrders, movements } = g.__mockState!;

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
  createSale(lines: Sale['lines'], total: number) {
    const id = uuid();
    const now = Date.now();
    const sale: Sale = { _id: id, lines, total, paid: 0, status: 'open', createdAt: now };
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
  addPayment(p: Payment) {
    const s = sales.get(p.saleId);
    if (!s) throw new Error('Sale not found');
    s.paid += p.amount;
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
    return { ok: true, paid: s.paid, status: s.status, remaining: remainingAfter, remainingBefore };
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

