import type { CarrierAccountDoc } from '@/lib/models/CarrierAccount';

export type RoutingInput = {
  to: { city: string; country: string };
  weightKg?: number;
  codEnabled?: boolean;
};

export function scoreAccount(acc: CarrierAccountDoc, input: RoutingInput): number {
  if (!acc.enabled) return Infinity;
  const r = acc.routing || {};
  let score = r.priority ?? 100;
  if (r.countries && r.countries.length && !r.countries.includes(input.to.country)) return Infinity;
  if (r.cities && r.cities.length && !r.cities.includes(input.to.city)) return Infinity;
  if (typeof r.weightMinKg === 'number' && (input.weightKg || 0) < r.weightMinKg) return Infinity;
  if (typeof r.weightMaxKg === 'number' && (input.weightKg || 0) > r.weightMaxKg) return Infinity;
  if (r.codOnly && !input.codEnabled) return Infinity;
  if (r.nonCodOnly && input.codEnabled) return Infinity;
  // Prefer more specific routes by decreasing score
  if (r.cities && r.cities.length) score -= 5;
  if (r.countries && r.countries.length) score -= 3;
  return score;
}

export function chooseCarrierAccount(accounts: CarrierAccountDoc[], input: RoutingInput): CarrierAccountDoc | null {
  const ranked = accounts
    .map((a) => ({ a, s: scoreAccount(a, input) }))
    .filter((x) => x.s !== Infinity)
    .sort((x, y) => (x.s - y.s));
  return ranked.length ? ranked[0].a : null;
}

