"use client";
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { VirtualTable } from '@/components/virtualized/VirtualTable';
import { Box, Button, MenuItem, Select, Stack, Typography } from '@mui/material';

export default function TransfersPage() {
  const t = useTranslations();
  const [list, setList] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (cursor) params.set('cursor', cursor);
      const res = await fetch('/api/transfers?' + params.toString());
      if (res.ok) {
        const data = await res.json();
        setList((prev) => cursor ? [...prev, ...(data.transfers || [])] : (data.transfers || []));
        setHasMore(!!data.nextCursor);
        setCursor(data.nextCursor);
      }
    })();
  }, [status]);

  const columns = useMemo(() => ([
    { key: 'code', header: 'الكود', width: 160 },
    { key: 'fromLocationId', header: 'من' },
    { key: 'toLocationId', header: 'إلى' },
    { key: 'status', header: 'الحالة', width: 140 },
    { key: 'lines', header: 'الأسطر', cell: (t: any) => (t.lines||[]).reduce((s:number,l:any)=> s + (l.qty||0), 0), width: 120 },
    { key: 'updatedAt', header: 'تاريخ', cell: (t: any) => new Date(t.updatedAt || t.createdAt).toLocaleString('ar-SA'), width: 220 },
  ]), []);

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h6" fontWeight={600}>{t('transfers.title') || 'تحويلات المخزون'}</Typography>
        <Select size="small" value={status} onChange={(e)=> setStatus(e.target.value)} displayEmpty sx={{ minWidth: 160 }}>
          <MenuItem value="">الكل</MenuItem>
          {['draft','requested','approved','picking','dispatched','received','closed','canceled'].map((s)=> (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </Select>
      </Stack>
      <VirtualTable rows={list} columns={columns as any} rowKey={(r:any)=> r._id} />
      {hasMore && (
        <Stack alignItems="center" sx={{ py: 1 }}>
          <Button variant="outlined" onClick={() => {
            const c = cursor; if (!c) return;
            (async () => {
              const params = new URLSearchParams();
              if (status) params.set('status', status);
              params.set('cursor', c);
              const res = await fetch('/api/transfers?' + params.toString());
              if (res.ok) {
                const data = await res.json();
                setList((prev) => [...prev, ...(data.transfers || [])]);
                setHasMore(!!data.nextCursor);
                setCursor(data.nextCursor);
              }
            })();
          }}>تحميل المزيد</Button>
        </Stack>
      )}
    </Box>
  );
}
