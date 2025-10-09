#!/usr/bin/env tsx
import { dbConnect } from '@/lib/db/mongo';
import { Transfer } from '@/lib/models/Transfer';

async function main() {
  await dbConnect();
  const status = (process.argv[2] || 'requested') as any;
  const cursor = Transfer.find({ status }).sort({ createdAt: -1 }).limit(50).lean();
  // @ts-ignore
  const plan = await (cursor as any).explain('executionStats');
  const winning = JSON.stringify(plan?.queryPlanner?.winningPlan, null, 2);
  const exec = plan?.executionStats || {};
  console.log(JSON.stringify({ summary: { nReturned: exec.nReturned, totalDocsExamined: exec.totalDocsExamined, totalKeysExamined: exec.totalKeysExamined }, winningPlan: JSON.parse(winning || '{}') }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
