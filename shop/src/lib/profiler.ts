import mongoose from 'mongoose';

export type MongoOp = 'find'|'findOne'|'updateOne'|'updateMany'|'aggregate'|'create'|'deleteOne'|'deleteMany'|'countDocuments';
export type ProfiledEvent = {
  ts: number;
  collection: string;
  op: MongoOp;
  durationMs: number;
  docs?: number;
  index?: string;
  filterSample?: any;
};

const MAX_EVENTS = 200;
const slowThresholdMs = Number(process.env.PROFILE_SLOW_MS || 200);
const ring: ProfiledEvent[] = [];

export function record(event: ProfiledEvent) {
  ring.push(event);
  if (ring.length > MAX_EVENTS) ring.shift();
}

export function getRecentSlow(): ProfiledEvent[] {
  return ring.filter((e) => e.durationMs >= slowThresholdMs).slice(-50);
}

export function getStats() {
  const last100 = ring.slice(-100);
  const avg = last100.length ? last100.reduce((s, e) => s + e.durationMs, 0) / last100.length : 0;
  const p95 = percentile(last100.map((e) => e.durationMs), 0.95);
  return { count: ring.length, last100AvgMs: avg, p95Ms: p95 };
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const arr = [...values].sort((a,b)=> a-b);
  const idx = Math.floor((arr.length - 1) * p);
  return arr[idx];
}

export async function profiledFind<T = any>(model: mongoose.Model<any>, filter: any, projection?: any, options?: any): Promise<T[]> {
  const start = Date.now();
  const docs = await model.find(filter, projection, options).lean();
  const duration = Date.now() - start;
  record({ ts: Date.now(), collection: model.collection.name, op: 'find', durationMs: duration, docs: (docs as any[]).length, filterSample: sampleFilter(filter) });
  return docs as any;
}

export async function profiledAggregate<T = any>(model: mongoose.Model<any>, pipeline: any[]): Promise<T[]> {
  const start = Date.now();
  const docs = await model.aggregate(pipeline).exec();
  const duration = Date.now() - start;
  record({ ts: Date.now(), collection: model.collection.name, op: 'aggregate', durationMs: duration, docs: (docs as any[]).length });
  return docs as any;
}

function sampleFilter(f: any) {
  try {
    const trimmed = Object.fromEntries(Object.entries(f || {}).slice(0, 3));
    return trimmed;
  } catch { return undefined; }
}
