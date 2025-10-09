import { pipeline, Transform } from 'stream';
import { promisify } from 'util';
import zlib from 'zlib';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db/mongo';
import { BackupJob } from '@/lib/models/BackupJob';
import { sha256Hex, type BackupManifest, manifestFingerprint } from './manifest';
import { putFile, uploadStream, type StorageTarget } from './storage';
import crypto from 'crypto';

const pipe = promisify(pipeline);

export type ExportOptions = {
  collections: string[];
  destination: StorageTarget;
  encrypted?: boolean;
  passphrase?: string;
  appVersion?: string;
  env?: string;
};

function getModelByName(name: string): mongoose.Model<any> | null {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

export async function exportCollections(opts: ExportOptions, userId?: string) {
  await dbConnect();
  const startedAt = new Date();
  const job = await BackupJob.create({
    kind: 'backup', collections: opts.collections, destination: opts.destination,
    encrypted: !!opts.passphrase, status: 'running', startedAt, createdBy: userId
  });

  const manifest: BackupManifest = {
    appVersion: opts.appVersion, env: opts.env || process.env.NODE_ENV,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    startedAt: startedAt.toISOString(),
    collections: opts.collections,
    files: [],
    counts: {}
  };

  let totalBytes = 0;

  try {
    for (const name of opts.collections) {
      const model = getModelByName(name);
      if (!model) continue;
      const cursor = model.find({}).lean().cursor({ batchSize: 1000 });
      const gzip = zlib.createGzip({ level: 9 });
      let count = 0;
      const transform = new Transform({
        transform(chunk: any, _enc: any, cb: any) {
          const line = Buffer.from(JSON.stringify(chunk) + "\n");
          count++;
          cb(null, line);
        }, objectMode: true
      });

      const filename = `${name}.jsonl.gz${opts.passphrase ? '.enc' : ''}`;

      let finalData: Buffer | null = null;
      let sha = '';
      let bytes = 0;

      if (!opts.passphrase) {
        // Fully streaming path: gzip -> hash -> uploadStream
        const hasher = crypto.createHash('sha256');
        const { writable, done } = uploadStream(opts.destination, filename);
        const meter = new Transform({
          transform(chunk: any, _enc: any, cb: any) {
            const buf = chunk as Buffer;
            bytes += buf.length;
            hasher.update(buf);
            cb(null, buf);
          }
        });
        await pipe(cursor, transform, gzip, meter, writable as any);
        const uri = await done;
        sha = hasher.digest('hex');
        manifest.files.push({ name: filename, sha256: sha, bytes, encrypted: false, count });
        totalBytes += bytes;
        job.logs.push(`wrote ${uri}`);
      } else {
        // Encrypt in-memory for now
        const bufParts: Buffer[] = [];
        gzip.on('data', (c) => bufParts.push(c as Buffer));
        await pipe(cursor, transform, gzip);
        const data = Buffer.concat(bufParts);
        const { encryptAesGcm } = await import('@/lib/crypto/encrypt');
        const blob = encryptAesGcm(data, opts.passphrase);
        const header = Buffer.from(JSON.stringify({ alg: blob.alg, salt: blob.salt, iv: blob.iv, tag: blob.tag }) + "\n");
        finalData = Buffer.concat([header, blob.ciphertext]);
        const uri = await putFile(opts.destination, filename, finalData);
        sha = sha256Hex(finalData);
        manifest.files.push({ name: filename, sha256: sha, bytes: finalData.length, encrypted: true, count });
        totalBytes += finalData.length;
        job.logs.push(`wrote ${uri}`);
      }
      manifest.counts![name] = count;
    }

    manifest.finishedAt = new Date().toISOString();
    const manifestData = Buffer.from(JSON.stringify(manifest, null, 2));
    const manifestName = 'manifest.json';
    await putFile(opts.destination, manifestName, manifestData);

    const fingerprint = manifestFingerprint(manifest);

    await BackupJob.updateOne({ _id: job._id }, {
      status: 'success', finishedAt: new Date(), bytes: totalBytes,
      files: manifest.files, manifestSha256: sha256Hex(manifestData), fingerprintSha256: fingerprint
    });

    return { jobId: String(job._id), manifest, fingerprint };
  } catch (e: any) {
    await BackupJob.updateOne({ _id: job._id }, { status: 'failed', error: String(e?.stack || e?.message || e) });
    throw e;
  }
}
