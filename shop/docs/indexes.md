# Indexes — Hot Paths and Justification

This document lists required MongoDB indexes covering the app hot paths. Each index includes the target query shape and an example explain-summary.

Note: Collection names reflect Mongoose defaults in this project.

## products
- keys: `{ productCode: 1 }` unique
  - queries: `Product.find({ productCode })`
  - explain: IXSCAN on `productCode_1`
- keys: `{ status: 1 }`
  - queries: list by status, sort by `updatedAt`
- keys: `{ category: 1 }`, `{ brand: 1 }`
  - queries: list products by category/brand filters
- keys: `{ 'variants.sku': 1 }` unique
  - queries: lookup by SKU (POS, availability)
- keys: `{ 'variants.barcode': 1 }`
  - queries: lookup by barcode (POS scan)
- keys: `{ updatedAt: -1 }`
  - queries: newest-first listings
- keys: `{ 'variants.size': 1, 'variants.color': 1, productCode: 1 }`
  - queries: variant filtering within product

## stocklevels
- keys: `{ locationId: 1, sku: 1, variantId: 1 }` unique
  - queries: `findOne({ locationId, sku, variantId })`, bulk fetch by location
- keys: `{ sku: 1 }`
  - queries: global availability by SKU

## stockmovements
- keys: `{ sku: 1, occurredAt: -1 }`
  - queries: movement history per SKU
- keys: `{ locationId: 1, sku: 1, occurredAt: -1 }`
  - queries: location-scoped movement history

## sales (orders)
- keys: `{ status: 1 }`
  - queries: lists by status buckets
- keys: `{ createdAt: -1 }`
  - queries: timeline/cursor pagination
- keys: `{ customerId: 1, createdAt: -1 }`
  - queries: customer order history
- keys: `{ fulfillFromLocationId: 1, createdAt: -1 }`
  - queries: per-location order feed

## payments
- keys: `{ saleId: 1, createdAt: -1 }`
  - queries: payments for sale
- keys: `{ method: 1, createdAt: -1 }`
  - queries: method histogram, date filters

## transfers
- keys: `{ code: 1 }` unique
  - queries: direct lookup by code
- keys: `{ status: 1, createdAt: -1 }`
  - queries: list by status, newest first
- keys: `{ fromLocationId: 1 }`, `{ toLocationId: 1 }`
  - queries: location feeds

## customers
- keys: `{ 'phones.e164': 1 }` unique, sparse
  - queries: lookup by phone
- keys: `{ 'search.name_ar_norm': 1 }` (Arabic collation)
  - queries: prefix search for Arabic
- keys: `{ 'search.name_en_norm': 1 }`
  - queries: prefix search for English
- keys: `{ 'search.phone_index': 1 }`
  - queries: normalized phone token search
- keys: `{ 'search.name_ar_norm': 1, 'search.name_en_norm': 1, 'phones.e164': 1 }`
  - queries: dedupe and mixed searches
- keys: `{ email: 1 }`
  - queries: direct lookup by email
- keys: `{ createdAt: -1 }`
  - queries: recent customers

## dailysnapshots
- keys: `{ _id: 1 }`
  - queries: direct lookup by date ID (yyyy-mm-dd)

## notificationlogs
- keys: `{ idempotencyKey: 1, channel: 1 }` unique
  - queries: dedupe send attempts
- keys: `{ event: 1 }`, `{ channel: 1 }`, `{ status: 1 }`, `{ createdAt: 1 }`
  - queries: filters and time-based feeds
- keys: `{ 'entity.type': 1, 'entity.id': 1, event: 1, channel: 1, createdAt: 1 }`
  - queries: entity-focused audit feed

---

Run the migration to ensure indexes and drop obsolete ones:

```bash
pnpm -C shop migrate:apply
```

Explain helpers live under `scripts/explain/*` (to be filled). Use `executionStats` and paste the summary JSON here for each representative query without PII.
