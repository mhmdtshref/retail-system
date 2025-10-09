import { NextRequest, NextResponse } from 'next/server';

export type RateLimitKeyParts = {
  ip?: string;
  userId?: string;
  routeKey: string;
};

export type RateLimitConfig = {
  limit: number; // tokens per window
  windowMs: number; // sliding window size
  burst?: number; // extra burst capacity
};

export type RateLimitHeaders = {
  limit: number;
  remaining: number;
  reset: number; // epoch seconds
};

export interface RateLimiterAdapter {
  // Returns remaining and resetAt timestamp (seconds)
  take(key: string, cfg: RateLimitConfig): Promise<{ remaining: number; reset: number }>;
}

class InMemoryLimiter implements RateLimiterAdapter {
  private buckets = new Map<string, { tokens: number; updatedAt: number; resetAt: number }>();
  async take(key: string, cfg: RateLimitConfig) {
    const now = Date.now();
    const win = cfg.windowMs;
    const burst = Math.max(0, cfg.burst ?? 0);
    const capacity = cfg.limit + burst;
    const b = this.buckets.get(key) || { tokens: capacity, updatedAt: now, resetAt: Math.floor((now + win) / 1000) };
    // Refill proportional to elapsed time (token bucket)
    const elapsed = now - b.updatedAt;
    const refill = (elapsed / win) * cfg.limit;
    b.tokens = Math.min(capacity, b.tokens + refill);
    b.updatedAt = now;
    b.resetAt = Math.floor((now + win) / 1000);
    // Consume one token
    if (b.tokens >= 1) {
      b.tokens -= 1;
      this.buckets.set(key, b);
      return { remaining: Math.max(0, Math.floor(b.tokens)), reset: b.resetAt };
    }
    this.buckets.set(key, b);
    return { remaining: 0, reset: b.resetAt };
  }
}

let adapter: RateLimiterAdapter | null = null;

export function getRateLimiter(): RateLimiterAdapter {
  if (adapter) return adapter;
  // Placeholder: in real deployment, plug Redis-based adapter via env
  adapter = new InMemoryLimiter();
  return adapter;
}

export function buildKey(parts: RateLimitKeyParts): string {
  const ip = parts.ip || 'ip:unknown';
  const uid = parts.userId || 'user:anon';
  return `rl:${ip}:${uid}:${parts.routeKey}`;
}

export async function takeRateLimit(req: NextRequest, cfg: RateLimitConfig, routeKey: string, userId?: string): Promise<{ limited: boolean; response?: NextResponse; headers: Record<string,string> }>{
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
  const limiter = getRateLimiter();
  const key = buildKey({ ip, userId, routeKey });
  const { remaining, reset } = await limiter.take(key, cfg);
  const headers = {
    'X-RateLimit-Limit': String(cfg.limit),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
    'X-RateLimit-Reset': String(reset),
  } as Record<string,string>;
  if (remaining <= 0) {
    const res = NextResponse.json({ error: { message: 'تم تجاوز الحد، حاول لاحقًا' } }, { status: 429 });
    res.headers.set('Retry-After', String(Math.max(1, Math.floor(reset - Date.now() / 1000))));
    for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
    return { limited: true, response: res, headers };
  }
  return { limited: false, headers };
}

export function applyRateHeaders(res: NextResponse, headers: Record<string,string>) {
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}
