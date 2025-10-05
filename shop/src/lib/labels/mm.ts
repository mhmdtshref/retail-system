// Unit helpers for precise print layouts

export function mmToPt(mm: number): number {
  return (mm / 25.4) * 72; // 1in = 25.4mm, 1in = 72pt
}

export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

export const A4_MM = { width: 210, height: 297 } as const;
