import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mockDb } from '@/lib/mock/store';
import { evaluateTotals } from '@/lib/tax/apply';
import { requireAuth, requireCan } from '@/lib/policy/api';

const LineSchema = z.object({ sku: z.string(), qty: z.number().positive(), price: z.number().nonnegative() });
const PlanInstallmentSchema = z.object({ seq: z.number().int().positive(), dueDate: z.string(), amount: z.number().nonnegative(), paidAt: z.string().optional() });

const SaleSchema = z.object({
  mode: z.enum(['cash','card','partial']).default('cash'),
  lines: z.array(LineSchema),
  customerId: z.string().optional(),
  total: z.number().nonnegative(),
  downPayment: z.number().nonnegative().optional(),
  schedule: z.array(PlanInstallmentSchema).optional(),
  expiresAt: z.string().optional(),
  minDownPercent: z.number().min(0).max(100).optional()
});

const OnlineSaleSchema = z.object({
  channel: z.literal('online'),
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.union([
      z.string(),
      z.object({ city: z.string().optional(), street: z.string().optional(), building: z.string().optional(), notes: z.string().optional() })
    ]).optional()
  }),
  items: z.array(LineSchema),
  totals: z.object({ grand: z.number().nonnegative() })
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'POS.SALE');
  if (allowed !== true) return allowed;
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  if (mockDb.has(idempotencyKey)) {
    return NextResponse.json(mockDb.get(idempotencyKey));
  }

  const body = await req.json();

  // online sale flow
  if (body && body.channel === 'online') {
    const parsedOnline = OnlineSaleSchema.safeParse(body);
    if (!parsedOnline.success) return NextResponse.json({ error: parsedOnline.error.flatten() }, { status: 400 });
    const data = parsedOnline.data;
    const sale = mockDb.createOnlineSale({ customer: data.customer, items: data.items, total: data.totals.grand });
    try {
      const g = globalThis as unknown as { __taxConfig?: any };
      const taxConfig = g.__taxConfig || { priceMode: 'tax_exclusive', defaultRate: 0.15, rules: [], precision: 2, roundingStrategy: 'half_up', receiptRounding: 'none' };
      const res = evaluateTotals({ lines: data.items.map((l:any)=> ({ sku: l.sku, qty: l.qty, unitPrice: l.price })) }, [], taxConfig as any, { defaultCurrency: 'SAR', displayLocale: 'ar-SA' } as any);
      (sale as any).tax = res.totals.tax;
      (sale as any).priceMode = taxConfig.priceMode;
      // persist per-line rate
      if ((sale as any).lines && res.perLine) {
        const withRates = (sale as any).lines.map((l: any, idx: number) => ({ ...l, taxRateApplied: res.perLine[idx]?.rate }));
        (sale as any).lines = withRates;
      }
    } catch {}
    const result = { saleId: sale._id, channel: 'online' };
    mockDb.set(idempotencyKey, result);
    return NextResponse.json(result);
  }

  const parsed = SaleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  if (input.mode === 'partial') {
    const down = input.downPayment ?? 0;
    try {
      const sale = mockDb.createPartialSale({ lines: input.lines, total: input.total, downPayment: down, minDownPercent: input.minDownPercent, schedule: input.schedule as any, expiresAt: input.expiresAt, customerId: input.customerId });
      try {
        const g = globalThis as unknown as { __taxConfig?: any };
        const taxConfig = g.__taxConfig || { priceMode: 'tax_exclusive', defaultRate: 0.15, rules: [], precision: 2, roundingStrategy: 'half_up', receiptRounding: 'none' };
        const res = evaluateTotals({ lines: input.lines.map((l:any)=> ({ sku: l.sku, qty: l.qty, unitPrice: l.price })) }, (body?.discounts || []) as any, taxConfig as any, { defaultCurrency: 'SAR', displayLocale: 'ar-SA' } as any);
        (sale as any).tax = res.totals.tax;
        (sale as any).priceMode = taxConfig.priceMode;
        if ((sale as any).lines && res.perLine) {
          const withRates = (sale as any).lines.map((l: any, idx: number) => ({ ...l, taxRateApplied: res.perLine[idx]?.rate }));
          (sale as any).lines = withRates;
        }
      } catch {}
      const result = { saleId: sale._id, status: sale.status, remaining: sale.paymentPlan?.remaining ?? Math.max(0, sale.total - sale.paid), reservations: sale.reservations };
      mockDb.set(idempotencyKey, result);
      return NextResponse.json(result);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Failed to create partial sale' }, { status: 400 });
    }
  }

  const doc = mockDb.createSale(input.lines, input.total, input.customerId);
  try {
    const g = globalThis as unknown as { __taxConfig?: any };
    const taxConfig = g.__taxConfig || { priceMode: 'tax_exclusive', defaultRate: 0.15, rules: [], precision: 2, roundingStrategy: 'half_up', receiptRounding: 'none' };
    const res = evaluateTotals({ lines: input.lines.map((l:any)=> ({ sku: l.sku, qty: l.qty, unitPrice: l.price })) }, (body?.discounts || []) as any, taxConfig as any, { defaultCurrency: 'SAR', displayLocale: 'ar-SA' } as any);
    (doc as any).tax = res.totals.tax;
    (doc as any).priceMode = taxConfig.priceMode;
    if ((doc as any).lines && res.perLine) {
      const withRates = (doc as any).lines.map((l: any, idx: number) => ({ ...l, taxRateApplied: res.perLine[idx]?.rate }));
      (doc as any).lines = withRates;
    }
  } catch {}
  const result = { saleId: String(doc._id) };
  mockDb.set(idempotencyKey, result);
  return NextResponse.json(result);
}

