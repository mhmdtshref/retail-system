import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/policy/api';
import { minRole } from '@/lib/policy/guard';
import { dbConnect } from '@/lib/db/mongo';
import { AccountingSettings } from '@/lib/models/AccountingSettings';

const AccountsSchema = z.object({
  sales: z.string().min(1), returns: z.string().min(1), discounts: z.string().min(1), taxPayable: z.string().min(1),
  rounding: z.string().min(1), cogs: z.string().min(1), inventory: z.string().min(1),
  cash: z.string().min(1), cardClearing: z.string().min(1), transfer: z.string().min(1), codClearing: z.string().min(1),
  storeCreditLiability: z.string().min(1), storeCreditExpense: z.string().optional(),
  ar: z.string().optional(), layawayAr: z.string().optional(), inventoryGainLoss: z.string().optional()
});

const BodySchema = z.object({
  provider: z.enum(['generic_csv','quickbooks_csv','xero_csv']),
  tz: z.string(), baseCurrency: z.string(),
  consolidation: z.enum(['daily_summary','per_receipt']),
  dateBasis: z.enum(['order_date','payment_date']),
  accounts: AccountsSchema,
  bankAccounts: z.object({ cash: z.string().optional(), card: z.string().optional(), transfer: z.string().optional() }).optional()
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  if (!minRole(auth.user, 'manager')) {
    return NextResponse.json({ error: { message: 'مرفوض: يتطلب صلاحيات مدير أو المالك' } }, { status: 403 });
  }
  await dbConnect().catch(()=>{});
  let doc: any = await AccountingSettings.findById('global').lean().catch(()=>null);
  if (!doc) {
    doc = await AccountingSettings.create({ _id: 'global', accounts: {
      sales: '', returns: '', discounts: '', taxPayable: '', rounding: '', cogs: '', inventory: '', cash: '', cardClearing: '', transfer: '', codClearing: '', storeCreditLiability: ''
    } });
    doc = (doc as any).toObject();
  }
  return NextResponse.json(doc);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  if (!minRole(auth.user, 'manager')) {
    return NextResponse.json({ error: { message: 'مرفوض: يتطلب صلاحيات مدير أو المالك' } }, { status: 403 });
  }
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const nowIso = new Date().toISOString();
  await dbConnect().catch(()=>{});
  const res = await AccountingSettings.findOneAndUpdate(
    { _id: 'global' },
    { $set: { ...parsed.data, updatedAt: nowIso, updatedBy: auth.user?.id || '' } },
    { new: true, upsert: true }
  ).lean().catch(()=>null);
  const out = res || { _id: 'global', ...parsed.data, updatedAt: nowIso, updatedBy: auth.user?.id || '' };
  return NextResponse.json(out);
}

