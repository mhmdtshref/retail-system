import path from 'path';
import fs from 'fs';
import { BackupJob } from '@/lib/models/BackupJob';

export async function applyRetention() {
  const daily = Number(process.env.BACKUP_KEEP_DAILY || 7);
  const weekly = Number(process.env.BACKUP_KEEP_WEEKLY || 4);
  const monthly = Number(process.env.BACKUP_KEEP_MONTHLY || 12);

  const jobs = await BackupJob.find({ kind: 'backup', status: 'success' }).sort({ createdAt: -1 }).lean();
  // Simple policy preview: mark old ones for deletion; actual file deletion can be done by ops.
  const now = new Date();
  const toDelete: string[] = [];
  let d = 0, w = 0, m = 0;
  for (const j of jobs) {
    const ageDays = (now.getTime() - new Date(j.createdAt!).getTime()) / 86400000;
    if (ageDays <= 7) {
      if ((d++) >= daily) toDelete.push(String(j._id));
    } else if (ageDays <= 35) {
      if ((w++) >= weekly) toDelete.push(String(j._id));
    } else {
      if ((m++) >= monthly) toDelete.push(String(j._id));
    }
  }
  return { toDelete };
}
