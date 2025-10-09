import crypto from 'crypto';

export type ManifestFile = {
  name: string; // filename
  sha256: string;
  bytes: number;
  count?: number;
  encrypted?: boolean;
};

export type BackupManifest = {
  appVersion?: string;
  env?: string;
  tz?: string;
  startedAt: string;
  finishedAt?: string;
  collections: string[];
  files: ManifestFile[];
  migrationVersion?: string;
  counts?: Record<string, number>;
};

export function sha256Hex(buf: Buffer | string): string {
  const h = crypto.createHash('sha256');
  h.update(buf);
  return h.digest('hex');
}

export function manifestFingerprint(m: BackupManifest): string {
  const copy: any = { ...m, files: m.files.map(f => ({ name: f.name, sha256: f.sha256, bytes: f.bytes })) };
  const s = JSON.stringify(copy);
  return sha256Hex(s);
}
