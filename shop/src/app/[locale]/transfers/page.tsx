"use client";
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { VirtualTable } from '@/components/virtualized/VirtualTable';

export default function TransfersPage() {
  const t = useTranslations();
  const [list, setList] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (cursor) params.set('cursor', cursor);
      const res = await fetch('/api/transfers?' + params.toString());
      if (res.ok) {
        const data = await res.json();
        setList((prev) => cursor ? [...prev, ...(data.transfers || [])] : (data.transfers || []));
        setHasMore(!!data.nextCursor);
        setCursor(data.nextCursor);
      }
    })();
  }, [status]);

  const columns = useMemo(() => ([
    { key: 'code', header: 'الكود', width: 160 },
    { key: 'fromLocationId', header: 'من' },
    { key: 'toLocationId', header: 'إلى' },
    { key: 'status', header: 'الحالة', width: 140 },
    { key: 'lines', header: 'الأسطر', cell: (t: any) => (t.lines||[]).reduce((s:number,l:any)=> s + (l.qty||0), 0), width: 120 },
    { key: 'updatedAt', header: 'تاريخ', cell: (t: any) => new Date(t.updatedAt || t.createdAt).toLocaleString('ar-SA'), width: 220 },
  ]), []);

  return (
    <main className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold">{t('transfers.title') || 'تحويلات المخزون'}</h1>
        <select value={status} onChange={(e)=> setStatus(e.target.value)} className="border rounded px-2 py-1">
          <option value="">الكل</option>
          {['draft','requested','approved','picking','dispatched','received','closed','canceled'].map((s)=> (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <VirtualTable rows={list} columns={columns as any} rowKey={(r:any)=> r._id} />
      {hasMore && (
        <div className="flex justify-center py-2">
          <button className="px-3 py-1 rounded border" onClick={() => {
            const c = cursor; // use last captured cursor
            if (!c) return;
            // trigger effect by updating status to same value; instead, manual fetch
            (async () => {
              const params = new URLSearchParams();
              if (status) params.set('status', status);
              params.set('cursor', c);
              const res = await fetch('/api/transfers?' + params.toString());
              if (res.ok) {
                const data = await res.json();
                setList((prev) => [...prev, ...(data.transfers || [])]);
                setHasMore(!!data.nextCursor);
                setCursor(data.nextCursor);
              }
            })();
          }}>تحميل المزيد</button>
        </div>
      )}
    </main>
  );
}
