import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'crypto';

export type EncryptedBlob = {
  alg: 'AES-256-GCM';
  salt: string; // base64
  iv: string;   // base64 (12 bytes)
  tag: string;  // base64 (16 bytes)
  ciphertext: Buffer;
};

export function deriveKey(passphrase: string, saltB64?: string): { key: Buffer; saltB64: string } {
  const salt = saltB64 ? Buffer.from(saltB64, 'base64') : randomBytes(16);
  const key = pbkdf2Sync(Buffer.from(passphrase, 'utf8'), salt, 120000, 32, 'sha256');
  return { key, saltB64: salt.toString('base64') };
}

export function encryptAesGcm(plaintext: Buffer, passphrase: string): EncryptedBlob {
  const { key, saltB64 } = deriveKey(passphrase);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    alg: 'AES-256-GCM',
    salt: saltB64,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext
  };
}

export function decryptAesGcm(blob: EncryptedBlob, passphrase: string): Buffer {
  const { key } = deriveKey(passphrase, blob.salt);
  const iv = Buffer.from(blob.iv, 'base64');
  const tag = Buffer.from(blob.tag, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(blob.ciphertext), decipher.final()]);
  return plaintext;
}
