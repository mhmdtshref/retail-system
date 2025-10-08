export async function sendWhatsAppViaRelay(input: { relayUrl?: string; to?: { wa?: string }; message: { text: string }; metadata: any; webhook?: { statusCallbackUrl?: string; signature?: string } }) {
  if (!input.relayUrl) return { ok: false as const, status: 412, id: undefined };
  const res = await fetch(input.relayUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: 'whatsapp', to: input.to, message: input.message, metadata: input.metadata, webhook: input.webhook })
  });
  const id = res.headers.get('x-relay-id') || undefined;
  return { ok: res.ok as boolean, status: res.status, id } as const;
}

import { withRetry } from '../util';

export async function sendWhatsAppViaRelay(relayWebhookUrl: string, payload: { to: { wa?: string }, message: { text: string }, metadata: { event: string; entity: string; id: string }, webhook: { statusCallbackUrl?: string; signature?: string } }) {
  const body = { channel: 'whatsapp', to: { wa: payload.to.wa }, message: payload.message, metadata: payload.metadata, webhook: payload.webhook } as const;
  const res = await withRetry(async () => fetch(relayWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  const status = (res as any).status || 200;
  let id: string | undefined;
  try { const j = await (res as any).json(); id = j?.id; } catch {}
  if (!(res as any).ok) throw new Error(`Relay error ${status}`);
  return { status, id } as const;
}

import { withRetry } from '../util';

export type WhatsAppPayload = {
  to: { wa?: string };
  message: { text: string };
  metadata: { event: string; entity: 'order'|'layaway'; id: string };
  webhook: { statusCallbackUrl?: string; signature?: string };
};

export async function sendWhatsAppViaRelay(relayWebhookUrl: string, payload: WhatsAppPayload) {
  return withRetry(async () => {
    const res = await fetch(relayWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: 'whatsapp', ...payload }) });
    if (!res.ok) throw new Error(`whatsapp relay ${res.status}`);
    return { status: res.status, id: (await res.json().catch(()=>({})))?.id } as { status: number; id?: string };
  });
}
