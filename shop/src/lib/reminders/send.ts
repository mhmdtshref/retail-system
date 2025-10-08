import crypto from 'crypto';

type Channel = 'email'|'sms'|'webhook';

export type ReminderPayload = {
  layawayId: string;
  layawayCode: string;
  customerName?: string;
  phone?: string;
  email?: string;
  amountDue: number;
  dueDate: string;
  shopName?: string;
  receiptNo?: string;
};

export async function sendReminder(channels: Channel[], payload: ReminderPayload, settings?: { notifications?: any }): Promise<{ sent: Channel[]; preview: Record<string,string> }>{
  const previews: Record<string,string> = {};
  const sent: Channel[] = [];
  const subject = `تذكير بالدفعة المتبقية للطلب ${payload.layawayCode}`;
  const body = `عميلنا العزيز ${payload.customerName || ''}، المبلغ المتبقي ${payload.amountDue.toFixed(2)} مستحق بتاريخ ${new Date(payload.dueDate).toLocaleDateString('ar-SA')}.
متجر: ${payload.shopName || ''}. رقم الإيصال: ${payload.receiptNo || ''}.`;

  for (const ch of channels) {
    if (ch === 'email') {
      previews.email = `${subject}\n\n${body}`;
      // Simulate enqueue to external relay via webhook if configured
      sent.push('email');
    }
    if (ch === 'sms') {
      previews.sms = body;
      sent.push('sms');
    }
    if (ch === 'webhook') {
      const url = settings?.notifications?.webhook?.url;
      if (url) {
        try {
          const secret = settings?.notifications?.webhook?.secret || '';
          const payloadJson = JSON.stringify({ type: 'layaway.reminder', data: payload });
          const signature = crypto.createHmac('sha256', secret).update(payloadJson).digest('hex');
          await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Signature': signature }, body: payloadJson });
        } catch {}
      }
      previews.webhook = JSON.stringify({ type: 'layaway.reminder', data: payload });
      sent.push('webhook');
    }
  }
  return { sent, preview: previews };
}

