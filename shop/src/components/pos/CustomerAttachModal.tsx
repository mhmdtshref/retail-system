"use client";
import { useEffect, useState } from 'react';
import { CustomerSearch } from '@/components/customers/CustomerSearch';
import { QuickCreate } from '@/components/customers/QuickCreate';

type Props = { onClose: () => void; onAttach: (c: any) => void };

export function CustomerAttachModal({ onClose, onAttach }: Props) {
  const [tab, setTab] = useState<'search'|'create'>('search');
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
      <div className="w-full max-w-xl bg-white dark:bg-neutral-900 rounded shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">اختيار العميل</div>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="flex gap-2 mb-3">
          <button className={`px-3 py-1 rounded ${tab==='search'?'bg-neutral-200 dark:bg-neutral-800':''}`} onClick={()=> setTab('search')}>بحث</button>
          <button className={`px-3 py-1 rounded ${tab==='create'?'bg-neutral-200 dark:bg-neutral-800':''}`} onClick={()=> setTab('create')}>إنشاء سريع</button>
        </div>
        {tab === 'search' && (
          <CustomerSearch onSelect={(c)=> setSelected(c)} />
        )}
        {tab === 'create' && (
          <QuickCreate onCreated={(c)=> { setSelected(c); setTab('search'); }} />
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="px-3 py-1 rounded border" onClick={onClose}>إلغاء</button>
          <button className="px-3 py-1 rounded bg-emerald-600 text-white disabled:opacity-50" disabled={!selected} onClick={()=> selected && onAttach(selected)}>إرفاق</button>
        </div>
      </div>
    </div>
  );
}

