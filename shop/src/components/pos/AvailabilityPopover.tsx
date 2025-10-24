"use client";
import { useEffect, useState } from 'react';
import { usePosStore } from '@/lib/store/posStore';
import { Box, Stack, Typography } from '@mui/material';

export function AvailabilityPopover({ skus }: { skus: string[] }) {
  const activeLocationId = usePosStore((s: any) => s.activeLocationId);
  const [map, setMap] = useState<Record<string, { onHand: number; reserved: number; available: number }> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/pos/availability/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skus, locationId: activeLocationId }) });
        if (res.ok) {
          const data = await res.json();
          const m: any = {};
          for (const a of data.availability || []) m[a.sku] = { onHand: a.onHand, reserved: a.reserved, available: a.available };
          setMap(m);
          return;
        }
      } catch {}
      setMap(null);
    })();
  }, [JSON.stringify(skus), activeLocationId]);

  if (!map) return null;
  return (
    <Box>
      <Stack spacing={0.5} sx={{ fontSize: 12 }}>
        {skus.map((sku) => (
          <Stack key={sku} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Typography component="span" sx={{ fontFamily: 'monospace' }}>{sku}</Typography>
            <Typography component="span">{map[sku]?.available ?? 0}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
