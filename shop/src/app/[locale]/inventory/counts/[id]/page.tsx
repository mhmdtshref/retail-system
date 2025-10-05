"use client";
import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { posDb } from '@/lib/db/posDexie';
import { queueSyncCountSession, addLocalCountItem, upsertLocalCountSession, queuePostVariances } from '@/lib/offline/count-sync';

type CountItem = { sku: string; onHandAtStart: number; counted?: number; variance?: number; recount?: boolean; note?: string };
type Session = { _id: string; name: string; status: 'open'|'reviewing'|'posted'; items: CountItem[]; createdAt: string };

export default function CountSessionPage({ params }: { params: { id: string } }) {
  const locale = useLocale();
  const id = (params as any).id as string;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [offline, setOffline] = useState(false);
  const isLocal = id.startsWith('local-');

  async function load() {
    setLoading(true);
    if (isLocal) {
      const localId = id.replace('local-','');
      const s = await posDb.countSessions.get({ localId } as any);
      const items = await posDb.countItems.where('localSessionId').equals(localId).toArray();
      const sess: Session = { _id: id, name: s?.name || 'محلي', status: s?.status || 'open', items: items.map((i: any) => ({ sku: i.sku, onHandAtStart: i.onHandAtStart || 0, counted: i.counted, variance: i.variance, recount: i.recount, note: i.note })), createdAt: new Date(s?.createdAt || Date.now()).toISOString() };
      setSession(sess);
      setLoading(false);
      return;
    }
    const res = await fetch(`/api/inventory/count-sessions/${id}`);
    const data = await res.json();
    setSession(data.session);
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  function filteredItems(): CountItem[] {
    if (!session) return [];
    const q = search.trim().toLowerCase();
    if (!q) return session.items || [];
    return (session.items || []).filter((i) => i.sku.toLowerCase().includes(q));
  }

  async function saveItems(patch: Array<Partial<CountItem> & { sku: string }>, status?: 'open'|'reviewing') {
    setSaving(true);
    try {
      if (isLocal) {
        const localId = id.replace('local-','');
        for (const p of patch) {
          const existing = await posDb.countItems.where({ localSessionId: localId, sku: p.sku } as any).first();
          if (existing) {
            const next = { ...existing, counted: typeof p.counted === 'number' ? p.counted : existing.counted, recount: typeof p.recount === 'boolean' ? p.recount : existing.recount, note: typeof p.note === 'string' ? p.note : existing.note } as any;
            next.variance = (next.counted ?? 0) - (next.onHandAtStart || 0);
            await posDb.countItems.update(existing.id, next);
          } else {
            await addLocalCountItem(localId, { sku: p.sku, onHandAtStart: 0, counted: p.counted, variance: (p.counted || 0) - 0, recount: p.recount, note: p.note });
          }
        }
        if (status) await posDb.countSessions.where({ localId } as any).modify({ status });
        await load();
      } else {
        const res = await fetch(`/api/inventory/count-sessions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `${Date.now()}-${Math.random()}` }, body: JSON.stringify({ items: patch, status }) });
        if (res.ok) {
          const data = await res.json();
          setSession(data.session);
        }
      }
    } finally { setSaving(false); }
  }

  async function postVariances() {
    setPosting(true);
    try {
      if (isLocal) {
        // Require online and synced
        if (!navigator.onLine) return;
        const localId = id.replace('local-','');
        const map = await posDb.syncLog.get({ key: `count:${localId}` } as any);
        if (!map) return;
        const serverId = map.value as string;
        await queuePostVariances(serverId, `${Date.now()}-${Math.random()}`);
        return;
      }
      const res = await fetch(`/api/inventory/count-sessions/${id}/post`, { method: 'POST', headers: { 'Idempotency-Key': `${Date.now()}-${Math.random()}` } });
      if (res.ok) await load();
    } finally { setPosting(false); }
  }

  if (loading || !session) return <main className="p-4">جارٍ التحميل...</main>;

  const statusLabel = session.status === 'open' ? 'مفتوح' : session.status === 'reviewing' ? 'قيد المراجعة' : 'تم الترحيل';
  const showReview = session.status !== 'posted';

  return (
    <main className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold">{session.name}</h1>
          <div className="text-sm text-gray-600">الحالة: {statusLabel}</div>
        </div>
        <div className="flex gap-2 items-center">
          {session.status === 'open' && <button disabled={saving} onClick={() => saveItems([], 'reviewing')} className="px-3 py-2 bg-gray-200 rounded">الانتقال للمراجعة</button>}
          {session.status === 'reviewing' && <button disabled={posting || (isLocal && (!navigator.onLine))} onClick={postVariances} className="px-3 py-2 bg-blue-600 text-white rounded">ترحيل الفروقات</button>}
        </div>
      </div>

      {showReview && (
        <div className="p-3 rounded border bg-white sticky top-0 z-10">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث/مسح SKU" className="w-full border rounded px-3 py-2" />
          {isLocal && !navigator.onLine && (
            <div className="text-amber-700 mt-2">أنت غير متصل. سيتم حفظ العد محليًا وسيتم المزامنة لاحقًا. يتطلب ترحيل الفروقات اتصالاً بالإنترنت.</div>
          )}
        </div>
      )}

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-600">
              <th className="p-2 text-right">SKU</th>
              <th className="p-2 text-right">على المخزون</th>
              <th className="p-2 text-right">العد</th>
              <th className="p-2 text-right">الفارق</th>
              <th className="p-2 text-right">إعادة الجرد</th>
              <th className="p-2 text-right">ملاحظة</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems().map((it) => (
              <tr key={it.sku} className="border-b">
                <td className="p-2"><bdi dir="ltr">{it.sku}</bdi></td>
                <td className="p-2">{new Intl.NumberFormat(locale).format(it.onHandAtStart)}</td>
                <td className="p-2">
                  {session.status === 'open' ? (
                    <input type="number" className="border rounded px-2 py-1 w-24" value={it.counted ?? ''} onChange={(e) => saveItems([{ sku: it.sku, counted: Number(e.target.value) }])} />
                  ) : (
                    new Intl.NumberFormat(locale).format(it.counted ?? 0)
                  )}
                </td>
                <td className="p-2">
                  <span className={((it.variance || 0) > 0 ? 'text-green-700' : (it.variance || 0) < 0 ? 'text-red-700' : 'text-gray-500'))}>{new Intl.NumberFormat(locale).format(it.variance || 0)}</span>
                </td>
                <td className="p-2">
                  {session.status !== 'posted' ? (
                    <input type="checkbox" checked={!!it.recount} onChange={(e) => saveItems([{ sku: it.sku, recount: e.target.checked }])} />
                  ) : (
                    it.recount ? '✔' : ''
                  )}
                </td>
                <td className="p-2">
                  {session.status !== 'posted' ? (
                    <input className="border rounded px-2 py-1 w-full" value={it.note || ''} onChange={(e) => saveItems([{ sku: it.sku, note: e.target.value }])} />
                  ) : (
                    it.note || ''
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}


