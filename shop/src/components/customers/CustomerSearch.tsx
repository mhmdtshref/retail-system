"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { posDb } from '@/lib/db/posDexie';
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';

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
    <Box sx={{ width: '100%' }}>
      {offline && (offlineBanner ? offlineBanner(true) : (
        <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }} color="warning.main">نتائج محدودة دون اتصال</Typography>
      ))}
      <TextField inputRef={inputRef} size="small" fullWidth placeholder={placeholder || 'ابحث بالاسم أو الهاتف'} value={q} onChange={(e)=> setQ(e.target.value)} />
      {results.length > 0 && (
        <Paper variant="outlined" sx={{ mt: 1, maxHeight: 260, overflow: 'auto' }}>
          {results.map((c: any) => (
            <Button key={c._id || c.id} onClick={() => onSelect(c)} sx={{ justifyContent: 'flex-start', width: '100%', textAlign: 'right', borderBottom: (t)=> `1px solid ${t.palette.divider}`, borderRadius: 0, py: 1 }}>
              <Box sx={{ width: '100%' }}>
                <Typography fontWeight={600} sx={{ lineHeight: 1.2 }}>{c.fullName_ar || c.name || c.fullName_en}</Typography>
                <Typography variant="caption" color="text.secondary">{(c.phones || []).map((p: any) => p.e164).join(' • ')}</Typography>
              </Box>
            </Button>
          ))}
        </Paper>
      )}
    </Box>
  );
}

