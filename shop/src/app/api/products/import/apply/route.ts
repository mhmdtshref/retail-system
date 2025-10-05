import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { ImportBatch } from '@/lib/models/ImportBatch';
import { Product } from '@/lib/models/Product';
import { z } from 'zod';

const BodySchema = z.object({ batchId: z.string().min(1) });

export async function POST(req: Request) {
  await dbConnect();
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const batch: any = await ImportBatch.findById(parsed.data.batchId).lean();
  if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  if (batch.status !== 'validated') return NextResponse.json({ error: 'Batch not validated' }, { status: 400 });

  let insertedProducts = 0;
  let updatedProducts = 0;
  let insertedVariants = 0;
  let updatedVariants = 0;

  for (const row of (batch.rows || [])) {
    if (row.status !== 'valid') continue;
    const d: any = row.data;
    const v = d.variant || {};
    const existing = await Product.findOne({ productCode: d.productCode });
    if (!existing) {
      await Product.create({
        productCode: d.productCode,
        name_ar: d.name_ar,
        name_en: d.name_en,
        category: d.category,
        brand: d.brand,
        status: d.status || 'active',
        variants: [v]
      });
      insertedProducts++;
      insertedVariants++;
      continue;
    }
    // Update existing product core fields (idempotent upsert)
    const set: any = {};
    if (d.name_ar) set.name_ar = d.name_ar;
    if (d.name_en) set.name_en = d.name_en;
    if (d.category) set.category = d.category;
    if (d.brand) set.brand = d.brand;
    if (d.status) set.status = d.status;
    if (Object.keys(set).length) {
      await Product.updateOne({ _id: existing._id }, { $set: set });
      updatedProducts++;
    }
    // Upsert variant by sku (preferred), fallback to size+color
    const idx = (existing.variants || []).findIndex((x: any) => x.sku === v.sku || (x.size === v.size && x.color === v.color));
    if (idx === -1) {
      await Product.updateOne({ _id: existing._id }, { $addToSet: { variants: v } });
      insertedVariants++;
    } else {
      const setVariant: any = {};
      if (v.barcode !== undefined) setVariant['variants.$.barcode'] = v.barcode;
      if (v.costPrice !== undefined) setVariant['variants.$.costPrice'] = v.costPrice;
      if (v.retailPrice !== undefined) setVariant['variants.$.retailPrice'] = v.retailPrice;
      await Product.updateOne({ _id: existing._id, 'variants.sku': existing.variants[idx].sku }, { $set: setVariant });
      updatedVariants++;
    }
  }

  await ImportBatch.updateOne({ _id: batch._id }, { $set: { status: 'applied', summary: { insertedProducts, updatedProducts, insertedVariants, updatedVariants } } });
  return NextResponse.json({ insertedProducts, updatedProducts, insertedVariants, updatedVariants });
}


