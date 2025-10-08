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

export default function ValuationReportPage() {
  const t = useTranslations('reports');
  const [asOf, setAsOf] = useState(todayIso());
  const [method, setMethod] = useState<'FIFO'|'WAVG'>('WAVG');
  const [includeReserved, setIncludeReserved] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/valuation?asOf=${asOf}&method=${method}&includeReserved=${includeReserved}`);
        const json = await res.json();
        setData(json.data);
      } finally { setLoading(false); }
    })();
  }, [asOf, method, includeReserved]);

  const totals = useMemo(() => data?.totals || { units: 0, value: 0 }, [data]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">{t('valuation')}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1">{t('filters.asOf')}<input type="date" value={asOf} onChange={(e)=> setAsOf(e.target.value)} className="border rounded px-2 py-1" /></label>
        <label className="flex items-center gap-1">{t('filters.method')}
          <select value={method} onChange={(e)=> setMethod(e.target.value as any)} className="border rounded px-2 py-1">
            <option value="WAVG">WAVG</option>
            <option value="FIFO">FIFO</option>
          </select>
        </label>
        <label className="flex items-center gap-1">{t('filters.includeReserved')}<input type="checkbox" checked={includeReserved} onChange={(e)=> setIncludeReserved(e.target.checked)} /></label>
      </div>
      {loading && <div>...</div>}
      {data && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">{t('valuation.method')}: {data.method}</div>
          <div className="border rounded overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="p-2 text-right">{t('valuation.sku')}</th>
                  <th className="p-2 text-right">{t('valuation.name')}</th>
                  <th className="p-2 text-right">{t('valuation.units')}</th>
                  <th className="p-2 text-right">{t('valuation.unitCost')}</th>
                  <th className="p-2 text-right">{t('valuation.value')}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows?.map((r: any) => (
                  <tr key={r.sku} className="odd:bg-white even:bg-gray-50">
                    <td className="p-2">{r.sku}</td>
                    <td className="p-2">{r.name || ''}</td>
                    <td className="p-2">{Number(r.units||0).toFixed(2)}</td>
                    <td className="p-2">{Number(r.unitCost||0).toFixed(2)}</td>
                    <td className="p-2">{Number(r.value||0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td className="p-2" colSpan={2}>المجموع</td>
                  <td className="p-2">{Number(totals.units||0).toFixed(2)}</td>
                  <td className="p-2">—</td>
                  <td className="p-2">{Number(totals.value||0).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

