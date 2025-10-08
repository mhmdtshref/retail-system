import { createHmac } from 'crypto';

export type Channel = 'email'|'sms'|'webhook';

export function renderArabicTemplate(input: { customerName?: string; amountDue: number; dueDate: string; shopName?: string; receiptNo?: string; layawayCode: string; locale?: string; currency?: string }) {
  const amount = new Intl.NumberFormat(input.locale || 'ar-SA', { style: 'currency', currency: input.currency || 'SAR' }).format(input.amountDue);
  const subject = `تذكير بالدفعة المتبقية للطلب ${input.layawayCode}`;
  const body = `عميلنا العزيز ${input.customerName || ''}، المبلغ المتبقي ${amount} مستحق بتاريخ ${new Date(input.dueDate).toLocaleDateString(input.locale || 'ar-SA')}.
متجر: ${input.shopName || ''}. رقم الإيصال: ${input.receiptNo || ''}.`;
  return { subject, body };
}

export async function sendEmail(payload: { to?: string; subject: string; body: string; relayUrl?: string; from?: { name?: string; address?: string } }) {
  // stub: relay via webhook if provided
  if (payload.relayUrl) {
    await fetch(payload.relayUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'email', to: payload.to, subject: payload.subject, body: payload.body, from: payload.from }) });
  }
  return { ok: true } as const;
}

export async function sendSms(payload: { to?: string; text: string; relayUrl?: string }) {
  if (payload.relayUrl) {
    await fetch(payload.relayUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'sms', to: payload.to, text: payload.text }) });
  }
  return { ok: true } as const;
}

export async function sendWebhook(url: string, secret: string | undefined, body: any) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (secret) {
    const sig = createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');
    headers['X-Signature'] = sig;
  }
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  return { ok: res.ok } as const;
}

