"use client";
import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export type Column<T> = { key: keyof T | string; header: React.ReactNode; width?: number | string; cell?: (row: T) => React.ReactNode };

export function VirtualTable<T extends { _id?: string }>(props: { rows: T[]; columns: Column<T>[]; rowKey?: (row: T, i: number) => string; estimatedRowHeight?: number }) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rows = props.rows || [];
  const estimatedSize = props.estimatedRowHeight ?? 40;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedSize,
    overscan: 10,
  });

  const totalSize = rowVirtualizer.getTotalSize();
  const virtualItems = rowVirtualizer.getVirtualItems();

  const header = useMemo(() => (
    <div className="grid gap-2 p-2 text-xs text-muted-foreground sticky top-0 z-10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur" style={{ gridTemplateColumns: props.columns.map(c => c.width || '1fr').join(' ') }} dir="rtl">
      {props.columns.map((c, i) => (
        <div key={i} className="px-2 py-1 whitespace-nowrap">{c.header}</div>
      ))}
    </div>
  ), [props.columns]);

  return (
    <div ref={parentRef} className="overflow-auto border rounded" dir="rtl" style={{ height: '60vh' }}>
      {header}
      <div style={{ height: totalSize, position: 'relative' }}>
        {virtualItems.map((vi) => {
          const row = rows[vi.index];
          const key = props.rowKey ? props.rowKey(row, vi.index) : (row?._id || String(vi.index));
          return (
            <div key={key} className="grid gap-2 p-2 text-sm border-t absolute left-0 right-0" style={{ transform: `translateY(${vi.start}px)`, gridTemplateColumns: props.columns.map(c => c.width || '1fr').join(' ') }}>
              {props.columns.map((c, i) => (
                <div key={i} className="px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis">
                  {c.cell ? c.cell(row) : (row as any)[c.key as string]}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
