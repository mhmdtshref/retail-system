import { Shipment } from '@/lib/models/Shipment';
import { CarrierAccount } from '@/lib/models/CarrierAccount';
import { dbConnect } from '@/lib/db/mongo';
import { getAdapterFor } from '@/lib/delivery/registry';

function nextBackoffMinutes(attempt: number): number {
  const seq = [15, 30, 60, 180, 360, 720, 1440];
  return seq[Math.min(seq.length - 1, Math.max(0, attempt))];
}

export async function runTrackingPoll(): Promise<{ processed: number; updated: number }> {
  await dbConnect();
  const now = new Date();
  const pending = await Shipment.find({ status: { $in: ['created','label_generated','handover','in_transit','out_for_delivery'] }, nextPollAt: { $lte: now } }).lean();
  let updated = 0;
  for (const s of pending) {
    const account = await CarrierAccount.findById(s.carrierAccountId).lean();
    if (!account) continue;
    const adapter = getAdapterFor(account.type);
    try {
      const res = await adapter.track(s.trackingNumber || '', account as any);
      const lastStatus = s.status;
      const events = [...(s.events || []), ...(res.events || [])];
      const patch: any = { events, lastSyncAt: new Date(), pollAttempt: (s.pollAttempt || 0) + 1, nextPollAt: new Date(Date.now() + nextBackoffMinutes(s.pollAttempt || 0) * 60000) };
      if (res.status && res.status !== lastStatus) patch.status = res.status;
      await Shipment.updateOne({ _id: s._id }, { $set: patch });
      if (patch.status && patch.status !== lastStatus) updated++;
    } catch {
      await Shipment.updateOne({ _id: s._id }, { $set: { pollAttempt: (s.pollAttempt || 0) + 1, nextPollAt: new Date(Date.now() + nextBackoffMinutes((s.pollAttempt || 0) + 1) * 60000) } });
    }
  }
  return { processed: pending.length, updated };
}

export async function runDailyReconciliation(): Promise<{ scanned: number; corrections: number }> {
  await dbConnect();
  const list = await Shipment.find({ status: { $in: ['delivered','failed','returned'] } }).lean();
  // Placeholder for reconciliation logic
  return { scanned: list.length, corrections: 0 };
}

