import { Sale } from '@/lib/models/Sale';
import { Payment } from '@/lib/models/Payment';
import { dbConnect } from '@/lib/db/mongo';

export type Diff = { id: string; before: any; after: any };

export async function scan(ctx: { saleId?: string; customerId?: string }) {
  await dbConnect();
  const q: any = {};
  if (ctx.saleId) q._id = ctx.saleId;
  if (ctx.customerId) q.customerId = ctx.customerId;
  const sales = await Sale.find(q).limit(200).lean();
  const out: Diff[] = [];
  for (const s of sales as any[]) {
    const payments = await Payment.find({ saleId: s._id }).lean();
    const paid = payments.reduce((n, p: any) => n + Number(p.amount || 0), 0);
    const subtotal = (s.lines || []).reduce((n: number, l: any) => n + Number(l.price || 0) * Number(l.qty || 0), 0);
    const discounts = 0; // placeholder: promotions
    const tax = 0; // placeholder: tax rules
    const grandTotal = subtotal - discounts + tax;
    const balance = Math.max(0, grandTotal - paid);
    const before = { total: s.total, paid: s.paid };
    const after = { total: grandTotal, paid, balance };
    if (before.total !== after.total || before.paid !== after.paid) {
      out.push({ id: String(s._id), before, after });
    }
  }
  return out;
}

export async function apply(ctx: { ids: string[]; actor: string; jobId: string }) {
  await dbConnect();
  let changed = 0; let errors = 0;
  for (const id of ctx.ids) {
    try {
      const s: any = await Sale.findById(id);
      if (!s) continue;
      const payments = await Payment.find({ saleId: s._id }).lean();
      const paid = payments.reduce((n, p: any) => n + Number(p.amount || 0), 0);
      const subtotal = (s.lines || []).reduce((n: number, l: any) => n + Number(l.price || 0) * Number(l.qty || 0), 0);
      const discounts = 0;
      const tax = 0;
      const grandTotal = subtotal - discounts + tax;
      const balance = Math.max(0, grandTotal - paid);
      if (Number(s.total) !== grandTotal || Number(s.paid) !== paid) {
        s.total = grandTotal;
        s.paid = paid;
        if (s.paymentPlan) s.paymentPlan.remaining = balance;
        await s.save();
        changed += 1;
      }
    } catch { errors += 1; }
  }
  return { changed, errors };
}
