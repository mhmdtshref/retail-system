import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db/mongo';
import { SeedRun } from '@/lib/models/SeedRun';
import { Settings } from '@/lib/models/Settings';
import { User } from '@/lib/models/User';
import { Product } from '@/lib/models/Product';
import { Customer } from '@/lib/models/Customer';
import { hashPassword } from '@/lib/auth/password';

export type SeedFlags = { wipe?: boolean; append?: boolean; location?: string; arabic?: boolean; seedRandom?: number };

export async function runSeed(pack: 'dev-minimal'|'demo'|'test-fixtures'|'anonymize-staging', flags: SeedFlags, userId?: string) {
  await dbConnect();
  const start = Date.now();
  const run = await SeedRun.create({ pack, args: flags, status: 'success', createdBy: userId });

  try {
    if (flags.wipe) {
      // Drop selected collections safely
      await Promise.all([
        Product.deleteMany({}), Customer.deleteMany({})
      ]);
    }

    if (pack === 'dev-minimal') {
      // Settings (deterministic)
      await Settings.updateOne({ _id: 'global' }, { $setOnInsert: { _id: 'global' }, $set: { locales: { defaultLang: flags.arabic === false ? 'en' : 'ar' } } }, { upsert: true });

      // Users: owner + cashier with deterministic emails
      const defaultHash = await hashPassword('password');
      await User.updateOne(
        { email: 'owner@example.com' },
        { $setOnInsert: { email: 'owner@example.com', name: 'Owner', role: 'owner' }, $set: { hashedPassword: defaultHash, status: 'active' } },
        { upsert: true }
      );
      await User.updateOne(
        { email: 'cashier@example.com' },
        { $setOnInsert: { email: 'cashier@example.com', name: 'Cashier', role: 'cashier' }, $set: { hashedPassword: defaultHash, status: 'active' } },
        { upsert: true }
      );

      // Products: 10 with variants
      const colors = ['أسود','أبيض'];
      const sizes = ['S','M','L','XL'];
      for (let i = 1; i <= 10; i++) {
        const code = `SKU-${String(i).padStart(3, '0')}`;
        const variants = [] as any[];
        for (const sz of sizes) for (const c of colors) {
          variants.push({ sku: `${code}-${sz}-${c}`, size: sz, color: c, retailPrice: 50 + i });
        }
        await Product.updateOne({ productCode: code }, { $setOnInsert: { productCode: code }, $set: { name_ar: `قميص ${i}`, name_en: `Shirt ${i}`, basePrice: 50 + i, variants } }, { upsert: true });
      }
    } else if (pack === 'test-fixtures') {
      await Settings.updateOne({ _id: 'global' }, { $setOnInsert: { _id: 'global' } }, { upsert: true });
      const testHash = await hashPassword('password');
      await User.updateOne({ email: 'test@example.com' }, { $setOnInsert: { email: 'test@example.com', name: 'Test', role: 'manager' }, $set: { hashedPassword: testHash, status: 'active' } }, { upsert: true });
      await Product.updateOne({ productCode: 'SKU-T-1' }, { $setOnInsert: { productCode: 'SKU-T-1', name_ar: 'عنصر تجريبي', name_en: 'Test Item', basePrice: 10, variants: [{ sku: 'SKU-T-1-DEF' }] } }, { upsert: true });
    } else if (pack === 'anonymize-staging') {
      const customers = await Customer.find({}).select({ _id: 1 }).lean();
      for (const c of customers) {
        await Customer.updateOne({ _id: c._id }, { $set: { firstName_ar: 'مجهول', lastName_ar: 'مستخدم', fullName_ar: 'مستخدم مجهول', firstName_en: 'Anon', lastName_en: 'User', fullName_en: 'Anon User', email: undefined, phones: [] } });
      }
    } else if (pack === 'demo') {
      // Minimal demo: defer full richness in later PR; create 50 SKUs
      for (let i = 1; i <= 50; i++) {
        const code = `DEMO-${String(i).padStart(3, '0')}`;
        await Product.updateOne({ productCode: code }, { $setOnInsert: { productCode: code }, $set: { name_ar: `منتج ${i}`, name_en: `Product ${i}`, basePrice: 20 + i, variants: [{ sku: `${code}-DEF` }] } }, { upsert: true });
      }
    }

    const durationMs = Date.now() - start;
    await SeedRun.updateOne({ _id: run._id }, { durationMs, status: 'success' });
    return { ok: true };
  } catch (e: any) {
    await SeedRun.updateOne({ _id: run._id }, { status: 'failed', log: String(e?.stack || e?.message || e) });
    throw e;
  }
}
