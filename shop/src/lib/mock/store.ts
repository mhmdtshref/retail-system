type Sale = { _id: string; lines: { sku: string; qty: number; price: number }[]; total: number; paid: number; status: 'OPEN'|'PAID'|'PARTIAL' };
type Payment = { saleId: string; method: 'cash'|'card'|'partial'; amount: number; seq: number };

const idempotency = new Map<string, any>();
const sales = new Map<string, Sale>();

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
  }
};

