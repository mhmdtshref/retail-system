"use client";
import { posDb } from '@/lib/db/posDexie';
import { uuid } from '@/lib/pos/idempotency';

export async function enqueueNotifSend(input: { localId?: string; event: string; entity: { type: 'order'|'layaway'; id: string }; customerId: string; channels?: Array<'email'|'sms'|'whatsapp'> }) {
  const id = uuid();
  const idempotencyKey = `notif:${input.entity.type}:${input.entity.id}:${input.event}:${Date.now()}`;
  await posDb.notifOutbox.add({ id, type: 'NOTIF_SEND', payload: input, idempotencyKey, createdAt: Date.now(), retryCount: 0 });
}

export async function saveNotifDraft(input: { localId: string; event: string; entity: { type: 'order'|'layaway'; id: string }; customerId: string; channels?: Array<'email'|'sms'|'whatsapp'> }) {
  await posDb.notifDrafts.put({ ...input, createdAt: Date.now() });
}
