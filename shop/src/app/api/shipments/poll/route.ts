import { runTrackingPoll } from '@/lib/delivery/poller';

export async function POST() {
  const res = await runTrackingPoll();
  return new Response(JSON.stringify(res), { headers: { 'content-type': 'application/json' } });
}

