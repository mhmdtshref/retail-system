import { CartLine, RuleScope } from './types';

export function isLineInScope(line: CartLine, scope?: RuleScope): boolean {
  if (!scope) return true;
  const inc = scope.include || {};
  const exc = scope.exclude || {};
  // Include filters: if provided, at least one must match
  const includeOk = (
    (!inc.categories || (line.category && inc.categories.includes(line.category))) ||
    (!inc.brands || (line.brand && inc.brands.includes(line.brand))) ||
    (!inc.skus || inc.skus.includes(line.sku)) ||
    (!inc.categories && !inc.brands && !inc.skus)
  );
  if (!includeOk) return false;
  // Exclude filters: if any matches, reject
  const excluded = (
    (exc.categories && line.category && exc.categories.includes(line.category)) ||
    (exc.brands && line.brand && exc.brands.includes(line.brand)) ||
    (exc.skus && exc.skus.includes(line.sku))
  );
  return !excluded;
}

export function pickCheapest(lines: CartLine[], count: number): CartLine[] {
  const sorted = [...lines].sort((a,b) => a.unitPrice - b.unitPrice);
  return sorted.slice(0, Math.max(0, count));
}

export function pickMostExpensive(lines: CartLine[], count: number): CartLine[] {
  const sorted = [...lines].sort((a,b) => b.unitPrice - a.unitPrice);
  return sorted.slice(0, Math.max(0, count));
}

export function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(max, num));
}
