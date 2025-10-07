export type RoundingMode = 'half_up' | 'bankers';

export function round(value: number, decimals = 2, mode: RoundingMode = 'half_up'): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, Math.max(0, decimals));
  if (mode === 'half_up') {
    return Math.round(value * factor + Number.EPSILON) / factor;
  }
  // bankers (round half to even)
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;
  if (diff > 0.5) return (floor + 1) / factor;
  if (diff < 0.5) return floor / factor;
  // exactly .5 -> round to even
  return (floor % 2 === 0 ? floor : floor + 1) / factor;
}

export function roundToIncrement(amount: number, increment: 0.05 | 0.1): { rounded: number; adj: number } {
  const inc = Number(increment);
  if (inc <= 0) return { rounded: amount, adj: 0 };
  const rounded = Math.round(amount / inc) * inc;
  const adj = Number((rounded - amount).toFixed(2));
  return { rounded: Number(rounded.toFixed(2)), adj };
}
