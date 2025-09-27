import mongoose from 'mongoose';

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
    cached.promise = mongoose.connect(uri, { dbName: process.env.MONGODB_DB || 'shop' });
  }
  cached.conn = await cached.promise;
  return cached.conn as unknown as typeof mongoose;
}

