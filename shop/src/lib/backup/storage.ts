import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PassThrough } from 'stream';

export type StorageTarget = { type: 'local'|'s3'; path?: string; bucket?: string; prefix?: string };

function s3(): S3Client {
  return new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY ? {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!
    } : undefined
  });
}

export async function ensureLocalDir(dir: string) {
  await fs.promises.mkdir(dir, { recursive: true });
}

export function targetKey(target: StorageTarget, filename: string): string {
  const prefix = (target.prefix || '').replace(/^\/+|\/+$|^$/g, '');
  return prefix ? `${prefix}/${filename}` : filename;
}

export async function putFile(target: StorageTarget, filename: string, data: Buffer): Promise<string> {
  if (target.type === 'local') {
    const base = target.path || path.join(process.cwd(), 'storage', 'backups');
    await ensureLocalDir(base);
    const full = path.join(base, filename);
    await ensureLocalDir(path.dirname(full));
    await fs.promises.writeFile(full, data);
    return full;
  } else {
    const key = targetKey(target, filename);
    const client = s3();
    await client.send(new PutObjectCommand({ Bucket: target.bucket!, Key: key, Body: data }));
    return `s3://${target.bucket}/${key}`;
  }
}

export function uploadStream(target: StorageTarget, filename: string): { writable: NodeJS.WritableStream; done: Promise<string> } {
  if (target.type === 'local') {
    const base = target.path || path.join(process.cwd(), 'storage', 'backups');
    const full = path.join(base, filename);
    const p = ensureLocalDir(path.dirname(full)).then(() => full);
    const writable = (fs as any).createWriteStream(full);
    const done = new Promise<string>((resolve, reject) => {
      writable.on('finish', () => resolve(full));
      writable.on('error', reject);
    });
    return { writable, done };
  } else {
    const key = targetKey(target, filename);
    const client = s3();
    const pass = new PassThrough();
    const done = client.send(new PutObjectCommand({ Bucket: target.bucket!, Key: key, Body: pass })).then(() => `s3://${target.bucket}/${key}`);
    return { writable: pass, done };
  }
}

export async function getFile(target: StorageTarget, filename: string): Promise<Buffer> {
  if (target.type === 'local') {
    const base = target.path || path.join(process.cwd(), 'storage', 'backups');
    const full = path.join(base, filename);
    return await fs.promises.readFile(full);
  } else {
    const key = targetKey(target, filename);
    const client = s3();
    const res = await client.send(new GetObjectCommand({ Bucket: target.bucket!, Key: key }));
    const body = await res.Body!.transformToByteArray();
    return Buffer.from(body);
  }
}

export async function getSignedDownloadUrl(target: StorageTarget, filename: string, expiresSec = 3600): Promise<string | null> {
  if (target.type === 'local') return null;
  const client = s3();
  const key = targetKey(target, filename);
  const command = new GetObjectCommand({ Bucket: target.bucket!, Key: key });
  return await getSignedUrl(client, command, { expiresIn: expiresSec });
}
