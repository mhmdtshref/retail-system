import { withRetry } from '../util';

export type EmailPayload = {
  to: { email?: string };
  message: { subject?: string; text: string; html?: string };
  metadata: { event: string; entity: 'order'|'layaway'; id: string };
  webhook: { statusCallbackUrl?: string; signature?: string };
};

export async function sendEmailViaRelay(relayWebhookUrl: string, payload: EmailPayload) {
  return withRetry(async () => {
    const res = await fetch(relayWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: 'email', ...payload }) });
    if (!res.ok) throw new Error(`email relay ${res.status}`);
    return { status: res.status, id: (await res.json().catch(()=>({})))?.id } as { status: number; id?: string };
  });
}
