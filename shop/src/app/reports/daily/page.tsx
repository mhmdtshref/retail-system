"use client";
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function DailyReportPage() {
  const t = useTranslations('reports');
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const url = `/api/reports/daily?from=${from}&to=${to}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        setData(json.data);
      } catch (e: any) {
        setError(e?.message || 'error');
      } finally { setLoading(false); }
    })();
  }, [from, to]);

  const kpis = useMemo(() => {
    const c = data?.counters || {};
    return [
      { label: t('kpis.grossSales'), value: c.grossSales },
      { label: t('kpis.discounts'), value: c.discounts },
      { label: t('kpis.returns'), value: c.returns },
      { label: t('kpis.netSales'), value: c.netSales },
      { label: t('kpis.tax'), value: c.tax },
      { label: t('kpis.margin'), value: c.margin },
      { label: t('kpis.marginPct'), value: c.marginPct }
    ];
  }, [data, t]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">{t('daily')}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1">{t('filters.dateFrom')}<input type="date" value={from} onChange={(e)=> setFrom(e.target.value)} className="border rounded px-2 py-1" /></label>
        <label className="flex items-center gap-1">{t('filters.dateTo')}<input type="date" value={to} onChange={(e)=> setTo(e.target.value)} className="border rounded px-2 py-1" /></label>
      </div>
      {loading && <div>...</div>}
      {error && <div className="text-rose-600">{error}</div>}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {kpis.map((k) => (
            <div key={k.label} className="border rounded p-3 bg-white">
              <div className="text-sm text-gray-500">{k.label}</div>
              <div className="text-lg font-bold">{Number(k.value || 0).toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

