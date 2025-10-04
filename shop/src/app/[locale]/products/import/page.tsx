"use client";
import { useState } from 'react';
import { useTranslations } from 'next-intl';

type Result = { idx: number; outcome: 'insert'|'update'|'error'; messages: string[]; preview?: any };

export default function ImportProductsPage() {
  const t = useTranslations();
  const [step, setStep] = useState<'upload'|'map'|'preview'>('upload');
  const [csvText, setCsvText] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Result[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);

  async function onValidate() {
    const res = await fetch('/api/products/import/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: csvText, mapping })
    });
    if (res.ok) {
      const data = await res.json();
      setResults(data.results || []);
      setBatchId(data.batchId);
      setStep('preview');
    }
  }

  async function onApply() {
    if (!batchId) return;
    const res = await fetch('/api/products/import/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId })
    });
    if (res.ok) {
      const data = await res.json();
      alert((t('products.importApplied') || 'تم التطبيق') + `\n+${JSON.stringify(data)}`);
    }
  }

  return (
    <main className="p-4 flex flex-col gap-4" dir="rtl">
      <h1 className="text-xl font-semibold">{t('products.importCsv') || 'استيراد CSV'}</h1>

      {step === 'upload' && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <a className="px-3 py-2 rounded border" href={`/api/products/import/template?type=basic`}>{t('products.downloadTemplate') || 'تنزيل قالب CSV'}</a>
          </div>
          <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder={t('products.pasteCsv') || 'ألصق CSV هنا (UTF-8)'} className="border rounded p-2 min-h-60" />
          <div className="flex gap-2">
            <button onClick={() => setStep('map')} disabled={!csvText} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50">{t('products.next') || 'التالي'}</button>
          </div>
        </div>
      )}

      {step === 'map' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">{t('products.mappingHint') || 'يمكن تعيين الأعمدة يدويًا (اختياري)'}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {['productCode','name_ar','name_en','category','brand','size','color','retailPrice','costPrice','barcode','status','sku'].map((k) => (
              <label key={k} className="flex items-center gap-2">
                <span className="w-32 text-sm">{k}</span>
                <input dir="ltr" className="border rounded px-2 py-1 flex-1" value={mapping[k] || ''} onChange={(e) => setMapping({ ...mapping, [k]: e.target.value })} placeholder={`${k} => Header`} />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={onValidate} className="px-3 py-2 rounded bg-green-600 text-white">{t('products.validate') || 'تحقق/معاينة'}</button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button onClick={onApply} className="px-3 py-2 rounded bg-green-600 text-white">{t('products.apply') || 'تطبيق'}</button>
          </div>
          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">{t('products.outcome') || 'النتيجة'}</th>
                  <th className="p-2">{t('products.messages') || 'رسائل'}</th>
                  <th className="p-2">{t('products.preview') || 'المعاينة'}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.idx} className="border-t">
                    <td className="p-2">{r.idx}</td>
                    <td className="p-2">{r.outcome}</td>
                    <td className="p-2 text-red-600">{r.messages.join('; ')}</td>
                    <td className="p-2"><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(r.preview, null, 2)}</pre></td>
                  </tr>
                ))}
                {results.length === 0 && <tr><td className="p-3 text-center text-gray-500" colSpan={4}>{t('products.noResults') || 'لا نتائج'}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}


