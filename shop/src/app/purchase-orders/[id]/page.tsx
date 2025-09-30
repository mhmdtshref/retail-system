"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type ParsedLine = { code?: string; name?: string; size?: string; color?: string; quantity?: number; unitCost?: number; total?: number; raw?: string };

export default function POPage({ params }: { params: { id: string } }) {
  const [po, setPo] = useState<any | null>(null);
  const [tab, setTab] = useState<'attachments'|'ocr'|'lines'>('attachments');
  const [review, setReview] = useState<Array<{ sku?: string; size?: string; color?: string; quantity: number; unitCost: number }>>([]);
  const [rawText, setRawText] = useState('');
  const id = params.id;

  async function load() {
    const res = await fetch(`/api/purchase-orders/${id}`, { cache: 'no-store' });
    const data = await res.json();
    if (res.ok) setPo(data.purchaseOrder);
  }
  useEffect(() => { load(); }, [id]);

  function statusLabel(s: string) { return s==='draft'?'مسودة': s==='partial'?'تم الاستلام جزئيًا': s==='received'?'تم الاستلام':'ملغي'; }

  async function onUpload(file: File) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/purchase-orders/${id}/upload`, { method: 'POST', body: form });
    const data = await res.json();
    if (res.ok) {
      setRawText(data.rawText || '');
      if (Array.isArray(data.parsed)) {
        const mapped = (data.parsed as ParsedLine[]).map((l) => ({ sku: l.code, size: l.size, color: l.color, quantity: l.quantity || 0, unitCost: l.unitCost || 0 }));
        setReview(mapped);
      }
      await load();
    }
  }

  async function onParse() {
    const res = await fetch(`/api/purchase-orders/${id}/ocr/parse`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rawText }) });
    const data = await res.json();
    if (res.ok) {
      const mapped = (data.parsed as ParsedLine[]).map((l) => ({ sku: l.code, size: l.size, color: l.color, quantity: l.quantity || 0, unitCost: l.unitCost || 0 }));
      setReview(mapped);
    }
  }

  async function onReceive() {
    const lines = review.filter((l) => l.sku && l.quantity > 0);
    const res = await fetch(`/api/purchase-orders/${id}/receive`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines }) });
    if (res.ok) {
      alert('تم الاستلام بنجاح');
      await load();
    }
  }

  const attachments = useMemo(() => po?.attachments || [], [po]);

  return (
    <div className="p-4" dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm text-gray-500">رقم الأمر</div>
          <div className="text-xl font-semibold">{po?.poNumber}</div>
        </div>
        <div className="px-3 py-1 rounded-full border text-sm">{po && statusLabel(po.status)}</div>
      </div>

      <div className="flex gap-2 mb-4">
        <button className={`px-3 py-2 rounded border ${tab==='attachments'?'bg-gray-100':''}`} onClick={()=>setTab('attachments')}>المرفقات</button>
        <button className={`px-3 py-2 rounded border ${tab==='ocr'?'bg-gray-100':''}`} onClick={()=>setTab('ocr')}>المراجعة (OCR)</button>
        <button className={`px-3 py-2 rounded border ${tab==='lines'?'bg-gray-100':''}`} onClick={()=>setTab('lines')}>البنود</button>
      </div>

      {tab==='attachments' && (
        <div className="space-y-3">
          <div className="text-sm">تحميل الفاتورة/الإيصال</div>
          <input type="file" accept="image/*,.png,.jpg,.jpeg,.pdf,.txt" onChange={(e)=>{ const f=e.target.files?.[0]; if (f) onUpload(f); }} />
          <div className="grid grid-cols-2 gap-3">
            {attachments.map((u: string, i: number) => (
              <a key={i} href={u} target="_blank" rel="noreferrer" className="block border rounded overflow-hidden">
                <img src={u} alt="attachment" className="w-full object-contain" />
              </a>
            ))}
          </div>
        </div>
      )}

      {tab==='ocr' && (
        <div className="space-y-3">
          <div className="text-sm">نص الإيصال</div>
          <textarea value={rawText} onChange={(e)=>setRawText(e.target.value)} placeholder="ألصق النص المستخرج هنا (اختياري)" className="w-full h-32 border rounded p-2" />
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={onParse}>قراءة النص (OCR)</button>
            <button className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={onReceive}>تأكيد الاستلام</button>
          </div>
          <div className="overflow-auto border rounded">
            <table className="min-w-full text-right">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="p-2">الكود/الرمز</th>
                  <th className="p-2">الاسم</th>
                  <th className="p-2">المقاس</th>
                  <th className="p-2">اللون</th>
                  <th className="p-2">الكمية</th>
                  <th className="p-2">سعر الوحدة</th>
                  <th className="p-2">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {review.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2"><input value={r.sku || ''} onChange={(e)=>{ const next=[...review]; next[idx].sku=e.target.value; setReview(next); }} className="border rounded px-2 py-1 w-40"/></td>
                    <td className="p-2 text-gray-400">—</td>
                    <td className="p-2"><input value={r.size || ''} onChange={(e)=>{ const next=[...review]; next[idx].size=e.target.value; setReview(next); }} className="border rounded px-2 py-1 w-24"/></td>
                    <td className="p-2"><input value={r.color || ''} onChange={(e)=>{ const next=[...review]; next[idx].color=e.target.value; setReview(next); }} className="border rounded px-2 py-1 w-24"/></td>
                    <td className="p-2"><input type="number" value={r.quantity} onChange={(e)=>{ const next=[...review]; next[idx].quantity=Number(e.target.value); setReview(next); }} className="border rounded px-2 py-1 w-20"/></td>
                    <td className="p-2"><input type="number" value={r.unitCost} onChange={(e)=>{ const next=[...review]; next[idx].unitCost=Number(e.target.value); setReview(next); }} className="border rounded px-2 py-1 w-24"/></td>
                    <td className="p-2">{(r.quantity*r.unitCost||0).toFixed(2)}</td>
                  </tr>
                ))}
                {review.length===0 && (
                  <tr><td colSpan={7} className="p-3 text-sm text-gray-500">أضف ملفًا أو الصق نص الإيصال لبدء المراجعة</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='lines' && (
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2">الكود</th>
                <th className="p-2">المقاس</th>
                <th className="p-2">اللون</th>
                <th className="p-2">الكمية المطلوبة</th>
                <th className="p-2">المستلمة</th>
                <th className="p-2">سعر الوحدة</th>
              </tr>
            </thead>
            <tbody>
              {(po?.lines||[]).map((l: any, i: number) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{l.sku || '-'}</td>
                  <td className="p-2">{l.size || '-'}</td>
                  <td className="p-2">{l.color || '-'}</td>
                  <td className="p-2">{l.quantityOrdered || '-'}</td>
                  <td className="p-2">{l.quantityReceived || '-'}</td>
                  <td className="p-2">{l.unitCost?.toFixed?.(2) || '-'}</td>
                </tr>
              ))}
              {(po?.lines||[]).length===0 && (
                <tr><td colSpan={6} className="p-3 text-sm text-gray-500">لا توجد بنود</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Link href="/purchase-orders" className="text-blue-600">عودة للقائمة</Link>
      </div>
    </div>
  );
}

