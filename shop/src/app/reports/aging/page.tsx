"use client";
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AgingReportPage() {
  const t = useTranslations('reports');
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/aging?type=layaway&from=${from}&to=${to}`);
        const json = await res.json();
        setData(json.data);
      } finally { setLoading(false); }
    })();
  }, [from, to]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">{t('aging')}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1">{t('filters.dateFrom')}<input type="date" value={from} onChange={(e)=> setFrom(e.target.value)} className="border rounded px-2 py-1" /></label>
        <label className="flex items-center gap-1">{t('filters.dateTo')}<input type="date" value={to} onChange={(e)=> setTo(e.target.value)} className="border rounded px-2 py-1" /></label>
      </div>
      {loading && <div>...</div>}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {data.buckets?.map((b: any) => (
            <div key={b.key} className="border rounded p-3 bg-white">
              <div className="text-sm text-gray-500">{b.key}</div>
              <div className="text-lg font-bold">{Number(b.balance || 0).toFixed(2)}</div>
              <div className="text-xs">{b.count}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

