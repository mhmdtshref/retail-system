"use client";
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePosStore } from '@/lib/store/posStore';
import { posDb } from '@/lib/db/posDexie';
import { Box, MenuItem, Select, Typography } from '@mui/material';

export function LocationSwitcher() {
  const t = useTranslations();
  const [locations, setLocations] = useState<Array<{ id: string; code: string; name: string; isSellable: boolean }>>([]);
  const activeLocationId = usePosStore((s: any) => s.activeLocationId);
  const setActive = (id: string) => usePosStore.setState({ activeLocationId: id });

  useEffect(() => {
    (async () => {
      try {
        if (navigator.onLine) {
          const res = await fetch('/api/locations');
          if (res.ok) {
            const data = await res.json();
            const list = (data.locations || []).map((l: any) => ({ id: l._id || l.id, code: l.code, name: l.name_ar || l.name, isSellable: !!l.isSellable }));
            setLocations(list);
            try { await posDb.locations.bulkPut(list.map((l) => ({ ...l, updatedAt: Date.now() } as any))); } catch {}
            if (!activeLocationId && list.length) setActive(list.find((l)=>l.isSellable)?.id || list[0].id);
            return;
          }
        }
      } catch {}
      // offline fallback
      const cached = await posDb.locations.orderBy('updatedAt').reverse().toArray();
      setLocations(cached as any);
      if (!activeLocationId && cached.length) setActive((cached[0] as any).id);
    })();
  }, []);

  if (!locations.length) return null;
  const active = locations.find((l) => l.id === activeLocationId);

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="caption" color="text.secondary">{t('pos.location') || 'الموقع'}</Typography>
      <Select size="small" value={active?.id || ''} onChange={(e)=> setActive(e.target.value as string)}>
        {locations.map((l) => (
          <MenuItem key={l.id} value={l.id}>
            {l.code} — {l.name}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}
