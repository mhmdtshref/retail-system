import { NextResponse } from 'next/server';
import { evaluateTotals } from '@/lib/tax/apply';

const g = globalThis as unknown as { __taxConfig?: any; __currencyConfig?: any };

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const taxConfig = g.__taxConfig || { priceMode: 'tax_exclusive', defaultRate: 0.15, rules: [], precision: 2, roundingStrategy: 'half_up', receiptRounding: 'none' };
    const currency = g.__currencyConfig || { defaultCurrency: 'SAR', displayLocale: 'ar-SA' };
    const { cart, discounts, paymentMethod } = body || {};
    const res = evaluateTotals(cart || { lines: [] }, discounts || [], taxConfig, currency, { paymentMethod });
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 });
  }
}
