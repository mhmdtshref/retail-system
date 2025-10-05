"use client";
import { useEffect, useState } from 'react';

export default function SettingsInventoryPage() {
  const [reasons, setReasons] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { (async () => { const res = await fetch('/api/settings/inventory'); const data = await res.json(); setReasons(data.reasons || []); setText((data.reasons || []).join('\n')); })(); }, []);
  async function save() { setSaving(true); try { const res = await fetch('/api/settings/inventory', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reasons: text.split(/\n+/).map((s) => s.trim()).filter(Boolean) }) }); if (res.ok) { const data = await res.json(); setReasons(data.reasons || []); } } finally { setSaving(false); } }
  return (
    <main className="p-4 flex flex-col gap-4">
      <h1 className="text-xl font-semibold">الإعدادات</h1>
      <div className="p-3 border rounded flex flex-col gap-2">
        <div className="font-semibold">أسباب التسوية</div>
        <textarea className="border rounded p-2 min-h-[160px]" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="text-sm text-gray-600">سطر لكل سبب</div>
        <button disabled={saving} onClick={save} className="px-3 py-2 bg-blue-600 text-white rounded w-fit">حفظ</button>
      </div>
    </main>
  );
}


