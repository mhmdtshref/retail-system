export function stableHash(obj: unknown): string {
  const seen = new WeakSet();
  const str = JSON.stringify(obj, function replacer(key, value) {
    if (value && typeof value === 'object') {
      if (seen.has(value as object)) return;
      seen.add(value as object);
      if (!Array.isArray(value)) {
        return Object.keys(value as Record<string, unknown>)
          .sort()
          .reduce((acc: Record<string, unknown>, k: string) => { acc[k] = (value as any)[k]; return acc; }, {});
      }
    }
    return value;
  });
  // Simple FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16);
}
