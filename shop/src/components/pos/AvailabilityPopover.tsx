"use client";
import { useEffect, useState } from 'react';
import { usePosStore } from '@/lib/store/posStore';

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
    <div className="text-xs text-muted-foreground">
      {skus.map((sku) => (
        <div key={sku} className="flex items-center justify-between gap-2">
          <span className="font-mono">{sku}</span>
          <span>{map[sku]?.available ?? 0}</span>
        </div>
      ))}
    </div>
  );
}
