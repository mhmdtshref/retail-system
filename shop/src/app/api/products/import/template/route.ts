import { NextResponse } from 'next/server';
import { toCsv } from '@/lib/csv';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'basic';
  if (type !== 'basic') return NextResponse.json({ error: 'Unsupported template' }, { status: 400 });
  const headers = ['productCode','name_ar','name_en','category','brand','size','color','retailPrice','costPrice','barcode','status'];
  const sample = [
    { productCode: 'TSHIRT-001', name_ar: 'تيشيرت قطن', name_en: 'Cotton T-Shirt', category: 'Tops', brand: 'BrandA', size: 'M', color: 'Black', retailPrice: 50, costPrice: 25, barcode: '123456789000', status: 'active' }
  ];
  const csv = toCsv(headers, sample);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="products_template_basic.csv"'
    }
  });
}


