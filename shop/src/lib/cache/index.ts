import { unstable_cache, revalidateTag } from 'next/cache';
import { MemoryCache } from './memory';

export type CacheAdapter = {
  get<T>(key: string): Promise<T | undefined> | T | undefined;
  set(key: string, value: any, ttlSec?: number, tags?: string[]): Promise<void> | void;
  del(key: string): Promise<void> | void;
  invalidateTag(tag: string): Promise<number> | number;
};

const memory = new MemoryCache();

export const cache: CacheAdapter & {
  withCache<T>(key: string, tags: string[], ttlSec: number, fn: () => Promise<T>): Promise<T>;
  tag(tag: string): void;
  invalidateTag(tag: string): Promise<number>;
} = {
  async get(key) { return memory.get(key); },
  async set(key, value, ttlSec, tags) { memory.set(key, value, ttlSec, tags); },
  async del(key) { memory.del(key); },
  async invalidateTag(tag) {
    try { revalidateTag(tag); } catch {}
    return memory.invalidateTag(tag);
  },
  async withCache(key, tags, ttlSec, fn) {
    const versioned = `v1:${key}`;
    const hit = await this.get(versioned);
    if (hit !== undefined) return hit as any;
    const val = await fn();
    await this.set(versioned, val, ttlSec, tags);
    return val;
  },
  tag(tag: string) {
    try { revalidateTag(tag); } catch {}
  }
};

export const cacheTags = {
  product: (id: string) => `product:${id}`,
  productsList: (hash: string) => `products:list:${hash}`,
  stock: (loc: string, sku: string) => `stock:${loc}:${sku}`,
  stockList: (loc: string) => `stock:list:${loc}`,
  order: (id: string) => `order:${id}`,
  orders: (status?: string) => `orders:${status || 'all'}`,
  reportDaily: (date: string) => `report:daily:${date}`,
  reportValuation: (date: string, method: string) => `report:valuation:${date}:${method}`,
};
