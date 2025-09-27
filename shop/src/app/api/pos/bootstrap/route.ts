import { NextResponse } from 'next/server';

export async function GET() {
  // Return minimal catalogs for offline bootstrapping (stubbed)
  return NextResponse.json({
    products: [
      { sku: 'SKU-001', productCode: 'TSHIRT-001', name_ar: 'تيشيرت', name_en: 'T-Shirt', retailPrice: 50, version: 1 },
    ],
    availability: [
      { sku: 'SKU-001', onHand: 100, reserved: 0, available: 100, asOf: Date.now() }
    ],
    topSkus: ['SKU-001'],
    translations: { ar: {}, en: {} }
  });
}

