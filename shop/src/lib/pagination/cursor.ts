import { Types } from 'mongoose';

export type CursorResult<T> = { items: T[]; nextCursor?: string };

export function encodeCursor(doc: any, fields: Array<string>): string {
  const payload: Record<string, unknown> = {};
  for (const f of fields) payload[f] = doc[f];
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor<T = any>(cursor?: string): T | undefined {
  if (!cursor) return undefined;
  try { return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as T; } catch { return undefined; }
}

export function applyStableCursorQuery(base: any, cursor: any, sort: Record<string, 1|-1>) {
  // For simple `_id` desc, accept `_id` from cursor
  const keys = Object.keys(sort);
  if (keys.length === 1 && keys[0] === '_id' && sort._id === -1 && cursor?._id) {
    base._id = { $lt: new Types.ObjectId(cursor._id) };
    return base;
  }
  // For compound like { createdAt: -1, _id: -1 }
  if (keys.length >= 2 && keys[0] === 'createdAt' && keys[1] === '_id' && cursor?.createdAt && cursor?._id) {
    base.$or = [
      { createdAt: { $lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, _id: { $lt: new Types.ObjectId(cursor._id) } }
    ];
  }
  return base;
}
