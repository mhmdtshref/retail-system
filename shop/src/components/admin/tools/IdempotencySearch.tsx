"use client";
import { useEffect, useState } from 'react';

export default function IdempotencySearch() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    try {
      const url = new URL('/api/admin/tools/idempotency', window.location.origin);
      if (q) url.searchParams.set('q', q);
      const res = await fetch(url.toString());
      const data = await res.json();
      setItems(data.items || []);
    } finally { setLoading(false); }
  }

  async function rerun(key: string) {
    await fetch('/api/admin/tools/idempotency/replay', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `${key}:rerun:${Date.now()}` }, body: JSON.stringify({ key, newKey: `${key}:rerun:${Date.now()}`, dryRun: true }) });
  }

  async function invalidate(key: string) {
    await fetch(`/api/admin/tools/idempotency/${encodeURIComponent(key)}`, { method: 'DELETE' });
    await search();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <input dir="ltr" className="border rounded px-2 py-1 flex-1" placeholder="ابحث بالمفتاح/المسار" value={q} onChange={(e)=> setQ(e.target.value)} />
        <button onClick={search} className="px-3 py-1 rounded bg-blue-600 text-white">بحث</button>
      </div>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-right">
              <th className="p-2">المفتاح</th>
              <th className="p-2">المسار</th>
              <th className="p-2">الطريقة</th>
              <th className="p-2">الكيان</th>
              <th className="p-2">الوقت</th>
              <th className="p-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it)=> (
              <tr key={it._id} className="border-t">
                <td className="p-2" dir="ltr">{it._id}</td>
                <td className="p-2" dir="ltr">{it.route}</td>
                <td className="p-2">{it.method}</td>
                <td className="p-2">{it.entity?.type} {it.entity?.id}</td>
                <td className="p-2">{new Date(it.createdAt).toLocaleString('ar-SA')}</td>
                <td className="p-2 flex gap-2">
                  <button onClick={()=> rerun(it._id)} className="px-2 py-1 rounded border">تجربة إعادة</button>
                  <button onClick={()=> invalidate(it._id)} className="px-2 py-1 rounded border text-rose-700">إلغاء</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
