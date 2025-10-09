#!/usr/bin/env tsx
import { dbConnect } from '@/lib/db/mongo';
import { Product } from '@/lib/models/Product';

async function main() {
  await dbConnect();
  const sku = process.argv[2] || 'SKU-TEST-123';
  const cursor = Product.find({ 'variants.sku': sku }).lean();
  // @ts-ignore
  const plan = await (cursor as any).explain('executionStats');
  const winning = JSON.stringify(plan?.queryPlanner?.winningPlan, null, 2);
  const exec = plan?.executionStats || {};
  console.log(JSON.stringify({ summary: { nReturned: exec.nReturned, totalDocsExamined: exec.totalDocsExamined, totalKeysExamined: exec.totalKeysExamined }, winningPlan: JSON.parse(winning || '{}') }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
