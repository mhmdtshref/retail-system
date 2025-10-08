"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { posDb } from '@/lib/db/posDexie';

type Props = {
  onSelect: (c: any) => void;
  placeholder?: string;
  offlineBanner?: (isOffline: boolean) => JSX.Element | null;
};

export function CustomerSearch({ onSelect, placeholder, offlineBanner }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [offline, setOffline] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    const id = setTimeout(async () => {
      const term = q.trim();
      if (!term) { setResults([]); return; }
      if (offline) {
        try {
          await posDb.customerLookups.add({ q: term, ts: Date.now() } as any);
        } catch {}
        const list = await posDb.recentCustomers
          .filter((c: any) => (c.name || '').toLowerCase().startsWith(term.toLowerCase()) || JSON.stringify(c.phones || []).includes(term.replace(/\D+/g, '')))
          .limit(10)
          .toArray();
        setResults(list);
        return;
      }
      try {
        const url = new URL('/api/customers', window.location.origin);
        url.searchParams.set('q', term);
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          setResults(data.items || []);
          try { await posDb.customerLookups.add({ q: term, ts: Date.now() } as any); } catch {}
          try {
            const recents = (data.items || []).slice(0, 10).map((c: any) => ({ id: c._id, name: c.fullName_ar || c.fullName_en || '', phones: c.phones, stats: c.stats, updatedAt: Date.now() }));
            await posDb.recentCustomers.bulkPut(recents);
          } catch {}
        }
      } catch {}
    }, 200);
    return () => clearTimeout(id);
  }, [q, offline]);

  return (
    <div className="w-full">
      {offline && (offlineBanner ? offlineBanner(true) : (
        <div className="mb-1 text-xs text-yellow-800 bg-yellow-50 rounded px-2 py-1">نتائج محدودة دون اتصال</div>
      ))}
      <input ref={inputRef} className="w-full border rounded px-2 py-1" placeholder={placeholder || 'ابحث بالاسم أو الهاتف'} value={q} onChange={(e)=> setQ(e.target.value)} />
      {results.length > 0 && (
        <div className="mt-2 max-h-64 overflow-auto border rounded bg-white dark:bg-neutral-900 text-sm">
          {results.map((c: any) => (
            <button key={c._id || c.id} className="w-full text-right px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 border-b last:border-b-0" onClick={() => onSelect(c)}>
              <div className="font-medium">{c.fullName_ar || c.name || c.fullName_en}</div>
              <div className="text-xs text-muted-foreground">{(c.phones || []).map((p: any) => p.e164).join(' • ')}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

