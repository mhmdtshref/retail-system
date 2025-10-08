"use client";
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function TransfersPage() {
  const t = useTranslations();
  const [list, setList] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const res = await fetch('/api/transfers?' + params.toString());
      if (res.ok) {
        const data = await res.json();
        setList(data.transfers || []);
      }
    })();
  }, [status]);

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
      <div className="rounded border divide-y">
        <div className="grid grid-cols-6 gap-2 p-2 text-xs text-muted-foreground">
          <div>الكود</div>
          <div>من</div>
          <div>إلى</div>
          <div>الحالة</div>
          <div>الأسطر</div>
          <div>تاريخ</div>
        </div>
        {list.map((t: any) => (
          <a key={t._id} href={`./transfers/${t._id}`} className="grid grid-cols-6 gap-2 p-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900">
            <div className="font-mono">{t.code}</div>
            <div>{t.fromLocationId}</div>
            <div>{t.toLocationId}</div>
            <div>{t.status}</div>
            <div>{(t.lines||[]).reduce((s: number, l: any)=> s + (l.qty||0), 0)}</div>
            <div>{new Date(t.updatedAt || t.createdAt).toLocaleString('ar-SA')}</div>
          </a>
        ))}
      </div>
    </main>
  );
}
