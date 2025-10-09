"use client";
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function LocationsPage() {
  const t = useTranslations();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/locations');
        if (res.ok) {
          const data = await res.json();
          setList(data.locations || []);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <main className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">{t('locations.title') || 'المواقع'}</h1>
      </div>
      {loading ? (
        <div>…</div>
      ) : (
        <div className="rounded border divide-y">
          <div className="grid grid-cols-6 gap-2 p-2 text-xs text-muted-foreground">
            <div>CODE</div>
            <div>{t('locations.name') || 'الاسم'}</div>
            <div>{t('locations.type') || 'النوع'}</div>
            <div>POS</div>
            <div>Storage</div>
            <div>{t('locations.updatedAt') || 'آخر تحديث'}</div>
          </div>
          {list.map((l: any) => (
            <div key={l._id} className="grid grid-cols-6 gap-2 p-2 text-sm">
              <div className="font-mono">{l.code}</div>
              <div className="truncate">{l.name_ar || l.name}</div>
              <div>{l.type}</div>
              <div>{l.isSellable ? '✓' : '—'}</div>
              <div>{l.isStorageOnly ? '✓' : '—'}</div>
              <div>{new Date(l.updatedAt || l.createdAt).toLocaleString('ar-SA')}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
