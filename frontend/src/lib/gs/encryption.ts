import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const keyHex = process.env.GS_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('GS_ENCRYPTION_KEY environment variable is required for encryption operations');
  }
  return Buffer.from(keyHex, 'hex');
}

function getAlgorithmLabel(): string {
  return process.env.GS_ENCRYPTION_ALGORITHM || ALGORITHM;
}

function isNodeCrypto(): boolean {
  return typeof globalThis.crypto === 'undefined' || typeof (globalThis as any).EdgeRuntime !== 'undefined';
}

export async function encrypt(text: string): Promise<string> {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

export async function decrypt(encrypted: string): Promise<string> {
  const key = getKey();
  const combined = Buffer.from(encrypted, 'base64');
  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted data format');
  }
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

export function encryptSync(text: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

export function decryptSync(encrypted: string): string {
  const key = getKey();
  const combined = Buffer.from(encrypted, 'base64');
  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted data format');
  }
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}

export function maskValue(value: string, type: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'CEP'): string {
  if (!value) return value;

  switch (type) {
    case 'CPF': {
      const digits = value.replace(/\D/g, '');
      if (digits.length !== 11) return value;
      return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
    }
    case 'CNPJ': {
      const digits = value.replace(/\D/g, '');
      if (digits.length !== 14) return value;
      return `**.***.${digits.slice(5, 8)}/${digits.slice(8, 12)}-**`;
    }
    case 'EMAIL': {
      const atIndex = value.indexOf('@');
      if (atIndex <= 1) return value;
      const name = value.slice(0, atIndex);
      const domain = value.slice(atIndex);
      const visible = Math.min(3, Math.ceil(name.length / 3));
      return `${name.slice(0, visible)}${'*'.repeat(Math.max(1, name.length - visible))}${domain}`;
    }
    case 'PHONE': {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 10) return value;
      const ddd = digits.slice(0, 2);
      const last4 = digits.slice(-4);
      return `(${ddd}) ****-${last4}`;
    }
    case 'CEP': {
      const digits = value.replace(/\D/g, '');
      if (digits.length !== 8) return value;
      return `***${digits.slice(3, 5)}-${digits.slice(5)}`;
    }
    default:
      return value;
  }
}
