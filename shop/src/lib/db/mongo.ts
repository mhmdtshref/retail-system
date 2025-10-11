import mongoose from 'mongoose';
import { recordDb } from '@/lib/obs/metrics';
import { ObsEvent } from '@/lib/models/ObsEvent';
import { configureErrors } from '@/lib/obs/errors';

type MongooseCache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = global as unknown as { mongoose?: MongooseCache };
if (!g.mongoose) {
  g.mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  const cached = g.mongoose!;
  if (cached.conn) return cached.conn as unknown as typeof mongoose;

  const uri = process.env.MONGODB_URI || '';
  if (!uri) {
    throw new Error('MONGODB_URI not set');
  }
  if (!cached.promise) {
    // Install lightweight DB metrics via mongoose debug hook if enabled
    if ((process.env.OBS_DB_METRICS || '1') === '1') {
      try {
        mongoose.set('debug', function (collectionName: string, method: string) {
          try { recordDb(collectionName, method); } catch {}
        } as any);
      } catch {}
    }
    // Configure error reporting context if env provided
    try {
      configureErrors({ env: process.env.NODE_ENV, release: process.env.RELEASE, commitSha: process.env.VERCEL_GIT_COMMIT_SHA, provider: (process.env.OBS_ERRORS_PROVIDER as any) || 'console', webhookUrl: process.env.OBS_ERRORS_WEBHOOK });
    } catch {}
    cached.promise = mongoose.connect(uri, { dbName: process.env.MONGODB_DB || 'shop' });
  }
  cached.conn = await cached.promise;
  return cached.conn as unknown as typeof mongoose;
}

