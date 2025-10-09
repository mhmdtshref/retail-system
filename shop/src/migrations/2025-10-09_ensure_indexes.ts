import type mongoose from 'mongoose';
import { type Migration, type Ctx } from '@/lib/migrations/runner';

// Helper to create/drop indexes idempotently and drop unknown ones (except _id_)
async function ensureCollectionIndexes(db: typeof mongoose, collName: string, desired: Array<{ keys: Record<string, 1|-1|'text'>; options?: any; name?: string }>, ctx: Ctx) {
  const coll = db.connection.db.collection(collName);
  const existing = await coll.indexes();
  const desiredWithNames = desired.map((d) => ({ ...d, name: d.name || Object.entries(d.keys).map(([k,v]) => `${k}_${v}`).join('__') }));
  const desiredNames = new Set(desiredWithNames.map((d) => d.name!));

  // Create/ensure desired indexes
  for (const d of desiredWithNames) {
    const opts = { name: d.name, background: true, ...(d.options || {}) };
    if (!existing.find((e: any) => e.name === d.name)) {
      await coll.createIndex(d.keys as any, opts);
      ctx.logger(`Created index ${collName}.${d.name}`);
    } else {
      // Optionally verify key equality and recreate if different
      const ex = existing.find((e: any) => e.name === d.name);
      const same = JSON.stringify(ex.key) === JSON.stringify(d.keys);
      if (!same) {
        await coll.dropIndex(d.name);
        await coll.createIndex(d.keys as any, opts);
        ctx.logger(`Recreated index ${collName}.${d.name} to match desired keys`);
      }
    }
  }

  // Drop obsolete indexes (excluding _id_)
  for (const ex of existing) {
    if (ex.name === '_id_') continue;
    if (!desiredNames.has(ex.name)) {
      try {
        await coll.dropIndex(ex.name);
        ctx.logger(`Dropped obsolete index ${collName}.${ex.name}`);
      } catch (e) {
        ctx.logger(`Skip drop ${collName}.${ex.name}: ${String((e as Error).message || e)}`);
      }
    }
  }
}

export const migrationEnsureIndexes: Migration = {
  version: '2025-10-09_ensure_indexes',
  title: 'Ensure MongoDB indexes for hot paths',
  async up(ctx) {
    const db = ctx.db;

    // products
    await ensureCollectionIndexes(db as any, 'products', [
      { keys: { productCode: 1 }, options: { unique: true }, name: 'productCode_unique' },
      { keys: { status: 1 }, name: 'status_1' },
      { keys: { category: 1 }, name: 'category_1' },
      { keys: { brand: 1 }, name: 'brand_1' },
      { keys: { 'variants.sku': 1 }, options: { unique: true, sparse: false }, name: 'variants.sku_unique' },
      { keys: { 'variants.barcode': 1 }, name: 'variants.barcode_1' },
      { keys: { updatedAt: -1 }, name: 'updatedAt_-1' },
      // Optional compound used in queries
      { keys: { 'variants.size': 1, 'variants.color': 1, productCode: 1 }, name: 'variants.size_color_productCode' },
    ], ctx);

    // stocklevels
    await ensureCollectionIndexes(db as any, 'stocklevels', [
      { keys: { locationId: 1, sku: 1, variantId: 1 }, options: { unique: true }, name: 'location_sku_variant_unique' },
      { keys: { sku: 1 }, name: 'sku_1' },
    ], ctx);

    // stockmovements
    await ensureCollectionIndexes(db as any, 'stockmovements', [
      { keys: { sku: 1, occurredAt: -1 }, name: 'sku_occurredAt' },
      { keys: { locationId: 1, sku: 1, occurredAt: -1 }, name: 'loc_sku_time' },
    ], ctx);

    // sales (orders)
    await ensureCollectionIndexes(db as any, 'sales', [
      { keys: { status: 1 }, name: 'status_1' },
      { keys: { createdAt: -1 }, name: 'createdAt_-1' },
      { keys: { customerId: 1, createdAt: -1 }, name: 'customer_createdAt' },
      { keys: { fulfillFromLocationId: 1, createdAt: -1 }, name: 'fulfill_loc_createdAt' },
    ], ctx);

    // payments
    await ensureCollectionIndexes(db as any, 'payments', [
      { keys: { saleId: 1, createdAt: -1 }, name: 'sale_createdAt' },
      { keys: { method: 1, createdAt: -1 }, name: 'method_createdAt' },
    ], ctx);

    // transfers
    await ensureCollectionIndexes(db as any, 'transfers', [
      { keys: { code: 1 }, options: { unique: true }, name: 'code_unique' },
      { keys: { status: 1, createdAt: -1 }, name: 'status_createdAt' },
      { keys: { fromLocationId: 1 }, name: 'fromLocationId_1' },
      { keys: { toLocationId: 1 }, name: 'toLocationId_1' },
    ], ctx);

    // customers
    await ensureCollectionIndexes(db as any, 'customers', [
      { keys: { 'phones.e164': 1 }, options: { unique: true, sparse: true }, name: 'phones.e164_unique' },
      { keys: { 'search.name_ar_norm': 1 }, options: { collation: { locale: 'ar', strength: 1 } }, name: 'search.name_ar_norm_1' },
      { keys: { 'search.name_en_norm': 1 }, name: 'search.name_en_norm_1' },
      { keys: { 'search.phone_index': 1 }, name: 'search.phone_index_1' },
      { keys: { 'search.name_ar_norm': 1, 'search.name_en_norm': 1, 'phones.e164': 1 }, name: 'search_combo' },
      { keys: { email: 1 }, name: 'email_1' },
      { keys: { createdAt: -1 }, name: 'createdAt_-1' },
    ], ctx);

    // notificationlogs
    await ensureCollectionIndexes(db as any, 'notificationlogs', [
      { keys: { idempotencyKey: 1, channel: 1 }, options: { unique: true }, name: 'idempotency_channel_unique' },
      { keys: { event: 1 }, name: 'event_1' },
      { keys: { channel: 1 }, name: 'channel_1' },
      { keys: { status: 1 }, name: 'status_1' },
      { keys: { createdAt: 1 }, name: 'createdAt_1' },
      { keys: { 'entity.type': 1, 'entity.id': 1, event: 1, channel: 1, createdAt: 1 }, name: 'entity_event_channel_createdAt' },
    ], ctx);

    // dailysnapshots — primary key is _id (yyyy-mm-dd)
    await ensureCollectionIndexes(db as any, 'dailysnapshots', [
      { keys: { _id: 1 }, name: '_id_1' },
    ], ctx);
  },
  async down(ctx) {
    // Down migration: best-effort drop the indexes we created (except _id_)
    const db = ctx.db;
    const dropAll = async (collName: string, names: string[]) => {
      const coll = db.connection.db.collection(collName);
      for (const n of names) {
        if (n === '_id_1') continue;
        try { await coll.dropIndex(n); ctx.logger(`Dropped index ${collName}.${n}`); } catch {}
      }
    };
    await dropAll('products', ['productCode_unique','status_1','category_1','brand_1','variants.sku_unique','variants.barcode_1','updatedAt_-1','variants.size_color_productCode']);
    await dropAll('stocklevels', ['location_sku_variant_unique','sku_1']);
    await dropAll('stockmovements', ['sku_occurredAt','loc_sku_time']);
    await dropAll('sales', ['status_1','createdAt_-1','customer_createdAt','fulfill_loc_createdAt']);
    await dropAll('payments', ['sale_createdAt','method_createdAt']);
    await dropAll('transfers', ['code_unique','status_createdAt','fromLocationId_1','toLocationId_1']);
    await dropAll('customers', ['phones.e164_unique','search.name_ar_norm_1','search.name_en_norm_1','search.phone_index_1','search_combo','email_1','createdAt_-1']);
    await dropAll('notificationlogs', ['idempotency_channel_unique','event_1','channel_1','status_1','createdAt_1','entity_event_channel_createdAt']);
    await dropAll('dailysnapshots', ['_id_1']);
  }
};

export default migrationEnsureIndexes;
