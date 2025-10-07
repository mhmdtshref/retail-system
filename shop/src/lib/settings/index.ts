import { dbConnect } from '@/lib/db/mongo';
import { Settings } from '@/lib/models/Settings';

export async function getSettings() {
  await dbConnect();
  let doc: any = await Settings.findById('global').lean();
  if (!doc) {
    doc = await Settings.create({ _id: 'global' });
    doc = doc.toObject();
  }
  // Normalize updatedAt to ISO string
  doc.updatedAt = new Date(doc.updatedAt || Date.now()).toISOString();
  return doc;
}

export async function updatePayments(userId: string, payments: any) {
  await dbConnect();
  const now = new Date();
  const res = await Settings.findOneAndUpdate(
    { _id: 'global' },
    { $set: { payments, updatedAt: now, updatedBy: userId }, $inc: { version: 1 } },
    { new: true, upsert: true }
  ).lean();
  const out = res || { _id: 'global', version: 1, payments, locales: {}, receipts: {}, updatedAt: now, updatedBy: userId } as any;
  (out as any).updatedAt = new Date((out as any).updatedAt || now).toISOString();
  return out;
}

export async function updateLocales(userId: string, locales: any) {
  await dbConnect();
  const now = new Date();
  const res = await Settings.findOneAndUpdate(
    { _id: 'global' },
    { $set: { locales, updatedAt: now, updatedBy: userId }, $inc: { version: 1 } },
    { new: true, upsert: true }
  ).lean();
  const out = res || { _id: 'global', version: 1, payments: {}, locales, receipts: {}, updatedAt: now, updatedBy: userId } as any;
  (out as any).updatedAt = new Date((out as any).updatedAt || now).toISOString();
  return out;
}

export async function updateReceipts(userId: string, receipts: any) {
  await dbConnect();
  const now = new Date();
  const res = await Settings.findOneAndUpdate(
    { _id: 'global' },
    { $set: { receipts, updatedAt: now, updatedBy: userId }, $inc: { version: 1 } },
    { new: true, upsert: true }
  ).lean();
  const out = res || { _id: 'global', version: 1, payments: {}, locales: {}, receipts, updatedAt: now, updatedBy: userId } as any;
  (out as any).updatedAt = new Date((out as any).updatedAt || now).toISOString();
  return out;
}

