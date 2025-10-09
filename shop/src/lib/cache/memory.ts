type Entry = { value: any; expiresAt?: number; tags?: Set<string> };

export class MemoryCache {
  private store = new Map<string, Entry>();
  private tagToKeys = new Map<string, Set<string>>();

  get<T>(key: string): T | undefined {
    const ent = this.store.get(key);
    if (!ent) return undefined;
    if (ent.expiresAt && ent.expiresAt <= Date.now()) {
      this.del(key);
      return undefined;
    }
    return ent.value as T;
  }

  set(key: string, value: any, ttlSec?: number, tags?: string[]) {
    const expiresAt = ttlSec ? Date.now() + ttlSec * 1000 : undefined;
    const entry: Entry = { value, expiresAt };
    if (tags && tags.length) {
      entry.tags = new Set(tags);
      for (const t of tags) {
        const set = this.tagToKeys.get(t) || new Set<string>();
        set.add(key);
        this.tagToKeys.set(t, set);
      }
    }
    this.store.set(key, entry);
  }

  del(key: string) {
    const ent = this.store.get(key);
    if (!ent) return;
    if (ent.tags) {
      for (const t of ent.tags) {
        const set = this.tagToKeys.get(t);
        if (set) { set.delete(key); if (set.size === 0) this.tagToKeys.delete(t); }
      }
    }
    this.store.delete(key);
  }

  invalidateTag(tag: string) {
    const set = this.tagToKeys.get(tag);
    if (!set) return 0;
    for (const key of set) this.store.delete(key);
    this.tagToKeys.delete(tag);
    return set.size;
  }

  clear() {
    this.store.clear();
    this.tagToKeys.clear();
  }
}
