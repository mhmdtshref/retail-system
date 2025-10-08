"use client";
import { useEffect, useState } from 'react';

type Chan = 'email'|'sms'|'whatsapp';

export default function NotificationsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({ channels: { email: true, sms: false, whatsapp: false }, throttling: { hoursPerEvent: 24 } });
  const [test, setTest] = useState<{ channel: Chan; to: any; key: string; lang: 'ar'|'en' }>({ channel: 'email', to: {}, key: 'ORDER_CREATED', lang: 'ar' });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/notifications/settings');
        const data = await res.json();
        setSettings({ channels: { email: true, sms: false, whatsapp: false }, throttling: { hoursPerEvent: 24 }, ...(data?.settings || {}) });
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch('/api/notifications/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    } finally { setSaving(false); }
  }

  async function testSend() {
    const body: any = { channel: test.channel, to: test.to, key: test.key, lang: test.lang };
    await fetch('/api/notifications/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }

  if (loading) return <main className="p-4">...تحميل</main>;
  return (
    <main className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">الإشعارات</h1>
      <section className="space-y-2">
        <div className="font-medium">القنوات</div>
        <div className="flex gap-4">
          {(['email','sms','whatsapp'] as Chan[]).map(ch => (
            <label key={ch} className="flex items-center gap-2"><input type="checkbox" checked={!!settings.channels?.[ch]} onChange={(e)=> setSettings((s:any)=> ({ ...s, channels: { ...s.channels, [ch]: e.target.checked } }))} /> {ch}</label>
          ))}
        </div>
      </section>
      <section className="space-y-2">
        <div className="font-medium">حد الإرسال</div>
        <div className="flex items-center gap-2">
          <input className="border rounded px-2 py-1 w-24" type="number" min={1} max={168} value={settings.throttling?.hoursPerEvent ?? 24} onChange={(e)=> setSettings((s:any)=> ({ ...s, throttling: { hoursPerEvent: Number(e.target.value || 24) } }))} />
          <span className="text-sm text-muted-foreground">ساعات لكل حدث</span>
        </div>
      </section>
      <section className="space-y-2">
        <div className="font-medium">إعدادات المزود</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded p-3">
            <div className="font-medium">البريد</div>
            <input className="border rounded px-2 py-1 w-full mt-2" placeholder="From Name" value={settings.email?.fromName || ''} onChange={(e)=> setSettings((s:any)=> ({ ...s, email: { ...(s.email||{}), fromName: e.target.value } }))} />
            <input className="border rounded px-2 py-1 w-full mt-2" placeholder="From Address" value={settings.email?.fromAddress || ''} onChange={(e)=> setSettings((s:any)=> ({ ...s, email: { ...(s.email||{}), fromAddress: e.target.value } }))} />
            <input className="border rounded px-2 py-1 w-full mt-2" placeholder="Relay Webhook URL" value={settings.email?.relayWebhookUrl || ''} onChange={(e)=> setSettings((s:any)=> ({ ...s, email: { ...(s.email||{}), relayWebhookUrl: e.target.value } }))} />
          </div>
          <div className="border rounded p-3">
            <div className="font-medium">SMS</div>
            <input className="border rounded px-2 py-1 w-full mt-2" placeholder="Sender ID" value={settings.sms?.senderId || ''} onChange={(e)=> setSettings((s:any)=> ({ ...s, sms: { ...(s.sms||{}), senderId: e.target.value } }))} />
            <input className="border rounded px-2 py-1 w-full mt-2" placeholder="Relay Webhook URL" value={settings.sms?.relayWebhookUrl || ''} onChange={(e)=> setSettings((s:any)=> ({ ...s, sms: { ...(s.sms||{}), relayWebhookUrl: e.target.value } }))} />
          </div>
          <div className="border rounded p-3">
            <div className="font-medium">واتساب</div>
            <input className="border rounded px-2 py-1 w-full mt-2" placeholder="WA Number (whatsapp:+9665...)" value={settings.whatsapp?.waNumber || ''} onChange={(e)=> setSettings((s:any)=> ({ ...s, whatsapp: { ...(s.whatsapp||{}), waNumber: e.target.value } }))} />
            <input className="border rounded px-2 py-1 w-full mt-2" placeholder="Relay Webhook URL" value={settings.whatsapp?.relayWebhookUrl || ''} onChange={(e)=> setSettings((s:any)=> ({ ...s, whatsapp: { ...(s.whatsapp||{}), relayWebhookUrl: e.target.value } }))} />
          </div>
        </div>
      </section>
      <div className="flex gap-2">
        <button className="px-3 py-1 rounded border" disabled={saving} onClick={save}>حفظ</button>
      </div>

      <section className="space-y-2">
        <div className="font-medium">اختبار الإرسال</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <select className="border rounded px-2 py-1" value={test.channel} onChange={(e)=> setTest(t => ({ ...t, channel: e.target.value as Chan }))}>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          <input className="border rounded px-2 py-1" placeholder="To (email/phone/wa)" onChange={(e)=> setTest(t => ({ ...t, to: t.channel==='email'?{ email: e.target.value }: t.channel==='sms'?{ phone: e.target.value }:{ wa: e.target.value }))} />
          <select className="border rounded px-2 py-1" value={test.key} onChange={(e)=> setTest(t => ({ ...t, key: e.target.value as any }))}>
            {['ORDER_CREATED','ORDER_PAID','SHIPMENT_CREATED','OUT_FOR_DELIVERY','DELIVERED','COD_REMINDER','LAYAWAY_CREATED','LAYAWAY_PAYMENT_POSTED','LAYAWAY_DUE_SOON','LAYAWAY_OVERDUE','LAYAWAY_FORFEITED'].map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <select className="border rounded px-2 py-1" value={test.lang} onChange={(e)=> setTest(t => ({ ...t, lang: e.target.value as any }))}>
            <option value="ar">AR</option>
            <option value="en">EN</option>
          </select>
          <button className="px-3 py-1 rounded border" onClick={testSend}>إرسال</button>
        </div>
      </section>
    </main>
  );
}
