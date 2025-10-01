"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewPOPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<Array<{ sku?: string; size?: string; color?: string; unitCost?: number; quantityOrdered?: number }>>([
    {}
  ]);

  useEffect(() => {
    // For now there is no suppliers endpoint; allow free text id or seed later
    setSuppliers([{ _id: 'SUP-1', name: 'المورد التجريبي' }]);
    setSupplierId('SUP-1');
  }, []);

  async function create() {
    const res = await fetch('/api/purchase-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supplierId, lines }) });
    const data = await res.json();
    if (res.ok) {
      router.push(`/purchase-orders/${data._id}`);
    }
  }

  return (
    <div className="p-4" dir="rtl">
      <h1 className="text-xl font-semibold mb-4">إنشاء أمر شراء</h1>
      <div className="mb-4">
        <label className="block text-sm mb-1">المورد</label>
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="border rounded px-3 py-2">
          {suppliers.map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div className="mb-4 overflow-auto border rounded">
        <table className="min-w-full text-right">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2">الكود/الرمز</th>
              <th className="p-2">المقاس</th>
              <th className="p-2">اللون</th>
              <th className="p-2">الكمية</th>
              <th className="p-2">سعر الوحدة</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-2"><input value={l.sku || ''} onChange={(e)=>{
                  const next=[...lines]; next[idx].sku=e.target.value; setLines(next);
                }} className="border rounded px-2 py-1 w-40" /></td>
                <td className="p-2"><input value={l.size || ''} onChange={(e)=>{ const next=[...lines]; next[idx].size=e.target.value; setLines(next); }} className="border rounded px-2 py-1 w-28" /></td>
                <td className="p-2"><input value={l.color || ''} onChange={(e)=>{ const next=[...lines]; next[idx].color=e.target.value; setLines(next); }} className="border rounded px-2 py-1 w-28" /></td>
                <td className="p-2"><input type="number" value={l.quantityOrdered || 0} onChange={(e)=>{ const next=[...lines]; next[idx].quantityOrdered=Number(e.target.value); setLines(next); }} className="border rounded px-2 py-1 w-24" /></td>
                <td className="p-2"><input type="number" value={l.unitCost || 0} onChange={(e)=>{ const next=[...lines]; next[idx].unitCost=Number(e.target.value); setLines(next); }} className="border rounded px-2 py-1 w-24" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button className="px-3 py-2 rounded border" onClick={()=>setLines([...lines, {}])}>إضافة بند</button>
        <button className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={create}>حفظ ومتابعة</button>
      </div>
    </div>
  );
}

