import zlib from 'zlib';
import { Readable } from 'stream';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db/mongo';
import { BackupJob } from '@/lib/models/BackupJob';
import { getFile, type StorageTarget } from './storage';
import { sha256Hex } from './manifest';
import { type BackupManifest } from './manifest';

export type RestoreOptions = {
  source: StorageTarget;
  collections?: string[];
  passphrase?: string;
  dryRun?: boolean;
};

function getModelByName(name: string): mongoose.Model<any> | null {
  try { return mongoose.model(name); } catch { return null; }
}

function bufferToLineObjects(buf: Buffer): any[] {
  const lines = buf.toString('utf8').split(/\n/).filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

async function upsertBatch(model: mongoose.Model<any>, docs: any[]) {
  if (docs.length === 0) return;
  const ops = docs.map((d) => ({
    updateOne: { filter: { _id: d._id }, update: { $set: d }, upsert: true }
  }));
  await model.bulkWrite(ops, { ordered: false });
}

export async function restoreCollections(opts: RestoreOptions, userId?: string) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_RESTORE !== 'true') {
    throw new Error('Restore blocked in production. Set ALLOW_PROD_RESTORE=true to override.');
  }

  await dbConnect();
  const job = await BackupJob.create({ kind: 'restore', destination: opts.source, source: opts.source, status: 'running', createdBy: userId, startedAt: new Date(), encrypted: !!opts.passphrase });

  try {
    const manifestBuf = await getFile(opts.source, 'manifest.json');
    const manifest: BackupManifest = JSON.parse(manifestBuf.toString('utf8'));
    const collections = opts.collections && opts.collections.length > 0 ? opts.collections : manifest.collections;

    for (const name of collections) {
      const model = getModelByName(name);
      if (!model) continue;

      const fileEntry = manifest.files.find((f) => f.name.startsWith(name + '.jsonl.gz')) || manifest.files.find(f => f.name.includes(name));
      if (!fileEntry) continue;

      const enc = fileEntry.name.endsWith('.enc');
      const fileBuf = await getFile(opts.source, fileEntry.name);
      const computedSha = sha256Hex(fileBuf);
      if (computedSha !== fileEntry.sha256) {
        throw new Error(`Checksum mismatch for ${fileEntry.name}`);
      }

      let gzBuf: Buffer;
      if (enc) {
        if (!opts.passphrase) throw new Error(`Passphrase required for encrypted file ${fileEntry.name}`);
        const firstNl = fileBuf.indexOf(0x0a);
        const header = JSON.parse(fileBuf.slice(0, firstNl).toString('utf8'));
        const { decryptAesGcm } = await import('@/lib/crypto/encrypt');
        const ciphertext = fileBuf.slice(firstNl + 1);
        const plain = decryptAesGcm({ alg: header.alg, salt: header.salt, iv: header.iv, tag: header.tag, ciphertext }, opts.passphrase);
        gzBuf = plain;
      } else {
        gzBuf = fileBuf;
      }

      const jsonlBuf = zlib.gunzipSync(gzBuf);
      if (opts.dryRun) {
        // count only
        const count = jsonlBuf.toString('utf8').split(/\n/).filter(Boolean).length;
        job.logs.push(`would restore ${name}: ${count} docs`);
        continue;
      }

      const docs = bufferToLineObjects(jsonlBuf);
      const batchSize = Number(process.env.RESTORE_BATCH_SIZE || 500);
      for (let i = 0; i < docs.length; i += batchSize) {
        await upsertBatch(model, docs.slice(i, i + batchSize));
      }
      job.logs.push(`restored ${name}: ${docs.length} docs`);
    }

    await BackupJob.updateOne({ _id: job._id }, { status: 'success', finishedAt: new Date() });
    return { jobId: String(job._id) };
  } catch (e: any) {
    await BackupJob.updateOne({ _id: job._id }, { status: 'failed', error: String(e?.stack || e?.message || e) });
    throw e;
  }
}
