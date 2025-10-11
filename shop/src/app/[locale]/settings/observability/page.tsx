"use client";
import { useEffect, useState } from 'react';

export default function ObservabilitySettingsPage() {
  const [role, setRole] = useState<string>('viewer');
  const [loading, setLoading] = useState(true);
  const [samplingInfo, setSamplingInfo] = useState(10);
  const [clientLogsEnabled, setClientLogsEnabled] = useState(true);
  const [metricsPublic, setMetricsPublic] = useState(false);
  const [provider, setProvider] = useState<'none'|'sentry-webhook'|'console'>('console');
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/self');
        if (res.ok) {
          const data = await res.json();
          setRole(data?.user?.role || 'viewer');
        }
        const s = await fetch('/api/settings/observability');
        if (s.ok) {
          const j = await s.json();
          setSamplingInfo(Math.round((j?.sampling?.info ?? 0.1) * 100));
          setClientLogsEnabled(!!j?.clientLogsEnabled);
          setMetricsPublic(!!j?.metrics?.exposePublic);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <main className="p-4">...تحميل</main>;
  if (!(role === 'owner' || role === 'manager')) return <main className="p-4"><div className="rounded border p-4 text-rose-700">مرفوض: يتطلب صلاحيات مدير</div></main>;

  return (
    <main className="p-4 space-y-4" dir="rtl">
      <h1 className="text-xl font-semibold">إعدادات المراقبة</h1>
      <div className="rounded border p-4 bg-white space-y-3">
        <div>
          <label className="block text-sm text-neutral-600 mb-1">معدل أخذ عينات سجلات المعلومات (%)</label>
          <input type="range" min={0} max={100} value={samplingInfo} onChange={async (e)=> {
            const v = Number(e.target.value);
            setSamplingInfo(v);
            try { await fetch('/api/settings/observability', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sampling: { info: v/100 } }) }); } catch {}
          }} />
          <div className="text-sm">{samplingInfo}%</div>
        </div>
        <div className="flex items-center gap-2">
          <input id="clientLogs" type="checkbox" checked={clientLogsEnabled} onChange={async (e)=> { const c = e.target.checked; setClientLogsEnabled(c); try { await fetch('/api/settings/observability', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientLogsEnabled: c }) }); } catch {} }} />
          <label htmlFor="clientLogs">تفعيل سجلات العميل (POS/المزامنة)</label>
        </div>
        <div className="flex items-center gap-2">
          <input id="metricsPublic" type="checkbox" checked={metricsPublic} onChange={async (e)=> { const c = e.target.checked; setMetricsPublic(c); try { await fetch('/api/settings/observability', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metrics: { exposePublic: c } }) }); } catch {} }} />
          <label htmlFor="metricsPublic">فتح /api/_metrics بدون مصادقة</label>
        </div>
        <div>
          <label className="block text-sm text-neutral-600 mb-1">موفر الأخطاء</label>
          <select value={provider} onChange={(e)=> setProvider(e.target.value as any)} className="border rounded p-1">
            <option value="none">بدون</option>
            <option value="console">Console</option>
            <option value="sentry-webhook">Sentry Webhook</option>
          </select>
        </div>
        {provider === 'sentry-webhook' && (
          <div>
            <label className="block text-sm text-neutral-600 mb-1">عنوان Webhook</label>
            <input className="border rounded p-1 w-full" value={webhookUrl} onChange={(e)=> setWebhookUrl(e.target.value)} placeholder="https://..." />
          </div>
        )}
        <div className="text-sm text-neutral-600">سيتم تطبيق الإعدادات على الفور (تجريبي: إعدادات وقت التشغيل).</div>
      </div>
    </main>
  );
}
