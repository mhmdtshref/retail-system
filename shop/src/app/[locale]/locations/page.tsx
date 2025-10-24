"use client";
import { useEffect, useState } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';

export default function LocationsPage() {
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
    <Box component="main" sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>المواقع</Typography>
      </Stack>
      {loading ? (
        <Typography variant="body2">…</Typography>
      ) : (
        <Paper variant="outlined" sx={{ '& > *': { px: 1, py: 0.5 } }}>
          <Stack direction="row" sx={{ gap: 2, p: 1, fontSize: 12, color: 'text.secondary' }}>
            <Typography sx={{ width: 120 }}>CODE</Typography>
            <Typography sx={{ flex: 1 }}>{'الاسم'}</Typography>
            <Typography sx={{ width: 120 }}>{'النوع'}</Typography>
            <Typography sx={{ width: 80 }}>POS</Typography>
            <Typography sx={{ width: 100 }}>Storage</Typography>
            <Typography sx={{ width: 220 }}>{'آخر تحديث'}</Typography>
          </Stack>
          {list.map((l: any) => (
            <Stack key={l._id} direction="row" sx={{ gap: 2, p: 1, borderTop: (t)=> `1px solid ${t.palette.divider}` }}>
              <Typography sx={{ width: 120, fontFamily: 'monospace' }}>{l.code}</Typography>
              <Typography sx={{ flex: 1 }} noWrap>{l.name_ar || l.name}</Typography>
              <Typography sx={{ width: 120 }}>{l.type}</Typography>
              <Typography sx={{ width: 80 }}>{l.isSellable ? '✓' : '—'}</Typography>
              <Typography sx={{ width: 100 }}>{l.isStorageOnly ? '✓' : '—'}</Typography>
              <Typography sx={{ width: 220 }}>{new Date(l.updatedAt || l.createdAt).toLocaleString('ar-SA')}</Typography>
            </Stack>
          ))}
        </Paper>
      )}
    </Box>
  );
}
