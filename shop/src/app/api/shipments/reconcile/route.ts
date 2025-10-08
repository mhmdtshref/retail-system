import { runDailyReconciliation } from '@/lib/delivery/poller';

export async function POST() {
  const res = await runDailyReconciliation();
  return new Response(JSON.stringify(res), { headers: { 'content-type': 'application/json' } });
}

