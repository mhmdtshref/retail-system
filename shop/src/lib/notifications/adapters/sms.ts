import { withRetry } from '../util';

export type SmsPayload = {
  to: { phone?: string };
  message: { text: string };
  metadata: { event: string; entity: 'order'|'layaway'; id: string };
  webhook: { statusCallbackUrl?: string; signature?: string };
};

export async function sendSmsViaRelay(relayWebhookUrl: string, payload: SmsPayload) {
  return withRetry(async () => {
    const res = await fetch(relayWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: 'sms', ...payload }) });
    if (!res.ok) throw new Error(`sms relay ${res.status}`);
    return { status: res.status, id: (await res.json().catch(()=>({})))?.id } as { status: number; id?: string };
  });
}
