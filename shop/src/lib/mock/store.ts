type Sale = { _id: string; lines: { sku: string; qty: number; price: number }[]; total: number; paid: number; status: 'OPEN'|'PAID'|'PARTIAL' };
type Payment = { saleId: string; method: 'cash'|'card'|'partial'; amount: number; seq: number };

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
    const sale: Sale = { _id: id, lines, total, paid: 0, status: 'OPEN' };
    sales.set(id, sale);
    return sale;
  },
  addPayment(p: Payment) {
    const s = sales.get(p.saleId);
    if (!s) throw new Error('Sale not found');
    s.paid += p.amount;
    s.status = s.paid >= s.total ? 'PAID' : 'PARTIAL';
    return { ok: true, paid: s.paid, status: s.status };
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

