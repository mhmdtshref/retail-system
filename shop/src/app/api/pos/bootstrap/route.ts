import { NextResponse } from 'next/server';
import productsSeed from '@/data/products.json';
import availabilitySeed from '@/data/availability.json';
import { dbConnect } from '@/lib/db/mongo';
import { Product } from '@/lib/models/Product';

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
        size: v.size,
        color: v.color,
        retailPrice: v.retailPrice ?? p.basePrice ?? 0,
        barcode: v.barcode,
        version: 1
      }))
    );
    // Availability for POS bootstrap still comes from seed for offline-first start
    return NextResponse.json({
      products,
      availability: availabilitySeed,
      topSkus: products.slice(0, 8).map((p) => p.sku),
      translations: { ar: {}, en: {} }
    });
  } catch {
    return NextResponse.json({
      products: productsSeed,
      availability: availabilitySeed,
      topSkus: (productsSeed as any[]).slice(0, 8).map((p) => p.sku),
      translations: { ar: {}, en: {} }
    });
  }
}

