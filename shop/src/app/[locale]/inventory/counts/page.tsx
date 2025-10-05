"use client";
import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { upsertLocalCountSession, queueSyncCountSession } from '@/lib/offline/count-sync';

type SessionLite = { _id: string; name: string; status: 'open'|'reviewing'|'posted'; createdAt: string };

export default function CountsPage() {
  const locale = useLocale();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'all'|'filter'|'upload'>('all');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [creating, setCreating] = useState(false);
  const [offline, setOffline] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/inventory/count-sessions');
    const data = await res.json();
    setSessions((data.sessions || []).map((s: any) => ({ _id: s._id, name: s.name, status: s.status, createdAt: s.createdAt })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  async function createSession() {
    setCreating(true);
    try {
      const body: any = { name, scope: { type: scope } };
      if (scope === 'filter') body.scope.filter = { category: category || undefined, brand: brand || undefined };
      const idempotencyKey = `${Date.now()}-${Math.random()}`;
      if (offline) {
        const localId = await upsertLocalCountSession({ name, scope: body.scope });
        await queueSyncCountSession(localId, idempotencyKey);
        router.push(`/${locale}/inventory/counts/local-${localId}`);
        return;
      }
      const res = await fetch('/api/inventory/count-sessions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        router.push(`/${locale}/inventory/counts/${data.session._id}`);
      } else {
        // fallback to offline local
        const localId = await upsertLocalCountSession({ name, scope: body.scope });
        await queueSyncCountSession(localId, idempotencyKey);
        router.push(`/${locale}/inventory/counts/local-${localId}`);
      }
    } finally { setCreating(false); }
  }

  return (
    <main className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">الجرد الدوري</h1>
        <a className="underline" href={`/${locale}/inventory/adjustments`}>التسويات</a>
      </div>
      <div className="p-3 rounded border flex flex-col gap-2">
        <div className="font-semibold">بدء جلسة جرد</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input className="border rounded px-2 py-1" placeholder="اسم الجلسة" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="border rounded px-2 py-1" value={scope} onChange={(e) => setScope(e.target.value as any)}>
            <option value="all">كل الأصناف</option>
            <option value="filter">تصفية</option>
            <option value="upload">رفع ملف</option>
          </select>
          {scope === 'filter' && (
            <>
              <input className="border rounded px-2 py-1" placeholder="التصنيف" value={category} onChange={(e) => setCategory(e.target.value)} />
              <input className="border rounded px-2 py-1" placeholder="العلامة" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </>
          )}
          <button disabled={creating || !name} onClick={createSession} className="px-3 py-2 bg-blue-600 text-white rounded">إنشاء</button>
        </div>
      </div>
      {offline && <div className="text-amber-700">أنت غير متصل. سيتم إنشاء جلسة محليًا والمزامنة لاحقًا.</div>}
      {loading ? <div>جارٍ التحميل...</div> : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-600">
                <th className="p-2 text-right">الاسم</th>
                <th className="p-2 text-right">الحالة</th>
                <th className="p-2 text-right">تاريخ الإنشاء</th>
                <th className="p-2 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s._id} className="border-b">
                  <td className="p-2">{s.name}</td>
                  <td className="p-2">{s.status === 'open' ? 'مفتوح' : s.status === 'reviewing' ? 'قيد المراجعة' : 'تم الترحيل'}</td>
                  <td className="p-2">{new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(s.createdAt))}</td>
                  <td className="p-2"><a className="underline" href={`/${locale}/inventory/counts/${s._id}`}>فتح</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}


