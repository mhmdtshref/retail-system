export function normalizeSegment(input: string): string {
  return (input || '')
    .toString()
    .trim()
    .replace(/\s+/g, '-')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
}

export function generateSku(productCode: string, size?: string, color?: string): string {
  const parts = [normalizeSegment(productCode)];
  if (size) parts.push(normalizeSegment(size));
  if (color) parts.push(normalizeSegment(color));
  return parts.join('-');
}


