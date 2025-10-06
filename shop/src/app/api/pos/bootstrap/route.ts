import { NextResponse } from 'next/server';
import productsSeed from '@/data/products.json';
import availabilitySeed from '@/data/availability.json';
import { dbConnect } from '@/lib/db/mongo';
import { Product } from '@/lib/models/Product';
import { Promotion } from '@/lib/models/Promotion';
import { Coupon } from '@/lib/models/Coupon';

export async function GET() {
  try {
    await dbConnect();
    const docs = await Product.find({ status: { $ne: 'archived' } }).lean();
    const products = docs.flatMap((p: any) =>
      (p.variants || []).map((v: any) => ({
        sku: v.sku,
        productCode: p.productCode,
        name_ar: p.name_ar,
        name_en: p.name_en,
        category: p.category,
        brand: p.brand,
        size: v.size,
        color: v.color,
        retailPrice: v.retailPrice ?? p.basePrice ?? 0,
        barcode: v.barcode,
        version: 1
      }))
    );
    // Active promotions and coupons index (compact)
    const promosDocs: any[] = await Promotion.find({ active: true }).sort({ priority: 1 }).lean();
    const promotions = promosDocs.map((d: any) => ({ id: String(d._id), ruleJson: {
      _id: String(d._id), name: d.name, code: d.code, type: d.type, level: d.level, value: d.value, x: d.x, y: d.y, yDiscount: d.yDiscount,
      scope: d.scope, constraints: d.constraints, schedule: d.schedule, stacking: d.stacking, priority: d.priority, active: d.active
    }, updatedAt: new Date(d.updatedAt || d.createdAt || Date.now()).toISOString(), startsAt: d?.schedule?.startsAt, endsAt: d?.schedule?.endsAt }));
    const couponsDocs: any[] = await Coupon.find({ active: true }).select('code constraints expiresAt').lean();
    const couponsIndex = couponsDocs.map((c: any) => ({ codeLower: String(c.code).toLowerCase(), policyJson: { constraints: c.constraints }, expiresAt: c.expiresAt }));
    // Availability for POS bootstrap still comes from seed for offline-first start
    return NextResponse.json({
      products,
      availability: availabilitySeed,
      topSkus: products.slice(0, 8).map((p) => p.sku),
      promotions,
      couponsIndex,
      translations: { ar: {}, en: {} }
    });
  } catch {
    return NextResponse.json({
      products: productsSeed,
      availability: availabilitySeed,
      topSkus: (productsSeed as any[]).slice(0, 8).map((p) => p.sku),
      promotions: [],
      couponsIndex: [],
      translations: { ar: {}, en: {} }
    });
  }
}

