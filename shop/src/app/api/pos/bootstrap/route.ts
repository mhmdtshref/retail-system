import { NextResponse } from 'next/server';
import products from '@/data/products.json';
import availability from '@/data/availability.json';

export async function GET() {
  return NextResponse.json({
    products,
    availability,
    topSkus: (products as any[]).slice(0, 8).map((p) => p.sku),
    translations: { ar: {}, en: {} }
  });
}

