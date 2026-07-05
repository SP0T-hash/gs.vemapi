import { randomBytes, createHash } from 'crypto';
import { encryptSync } from './encryption';

type StorageProvider = 's3' | 'r2';

interface S3Client {
  send: (command: any) => Promise<any>;
}

let s3ClientInstance: S3Client | null = null;

function validateStorageConfig(): void {
  const required = ['STORAGE_ACCESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY', 'STORAGE_BUCKET'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

function getStorageConfig() {
  const provider = (process.env.STORAGE_PROVIDER || 's3') as StorageProvider;
  return {
    provider,
    endpoint: process.env.STORAGE_ENDPOINT || '',
    region: process.env.STORAGE_REGION || 'us-east-1',
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
    bucket: process.env.STORAGE_BUCKET!,
    publicUrl: process.env.STORAGE_PUBLIC_URL || '',
  };
}

async function getS3Client(): Promise<S3Client> {
  if (s3ClientInstance) return s3ClientInstance;

  const config = getStorageConfig();

  if (isEdgeRuntime()) {
    throw new Error('S3 uploads are not supported in Edge Runtime. Use Node.js runtime.');
  }

  const { S3Client } = await import('@aws-sdk/client-s3');

  s3ClientInstance = new S3Client({
    endpoint: config.endpoint || undefined,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.provider === 'r2',
    requestChecksumCalculation: 'WHEN_REQUIRED',
  }) as unknown as S3Client;

  return s3ClientInstance;
}

function isEdgeRuntime(): boolean {
  try {
    return typeof (globalThis as any).EdgeRuntime === 'string';
  } catch {
    return false;
  }
}

export interface UploadOptions {
  folder?: string;
  encrypt?: boolean;
  maxSizeMB?: number;
  allowedMimes?: string[];
  public?: boolean;
}

export interface UploadResult {
  key: string;
  url: string;
  encrypted: boolean;
  size: number;
  mimeType: string;
  originalName: string;
  hash: string;
}

export interface StoredFile {
  id: string;
  tipo: 'RG' | 'CNH' | 'COMPROVANTE' | 'CERTIFICADO' | 'NF' | 'OUTROS';
  cliente_id?: string;
  pedido_id?: string;
  usuario_id?: string;
  storage_key: string;
  url: string;
  original_name: string;
  mime_type: string;
  size: number;
  hash: string;
  encrypted: boolean;
  uploaded_by: string;
  uploaded_at: string;
}

const DEFAULT_ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
];

export function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

export function generateStorageKey(folder: string, fileName: string, arId: string): string {
  const uuid = randomBytes(16).toString('hex');
  const cleanName = sanitizeFileName(fileName);
  const folderClean = folder.replace(/^\/+|\/+$/g, '');
  return `${folderClean}/${arId}/${uuid}-${cleanName}`;
}

export function validateFile(
  file: File | { size: number; type: string },
  options?: UploadOptions
): void {
  const maxSizeMB = options?.maxSizeMB ?? 10;
  const maxBytes = maxSizeMB * 1024 * 1024;
  const allowedMimes = options?.allowedMimes ?? DEFAULT_ALLOWED_MIMES;

  if (file.size > maxBytes) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(
      `File size exceeds limit: ${sizeMB}MB (max: ${maxSizeMB}MB)`
    );
  }

  if (file.size === 0) {
    throw new Error('File is empty');
  }

  if (allowedMimes.length > 0 && !allowedMimes.includes(file.type)) {
    throw new Error(
      `File type "${file.type}" is not allowed. Allowed types: ${allowedMimes.join(', ')}`
    );
  }
}

async function bufferFromFile(file: File | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(file)) return file;
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToS3(
  buffer: Buffer,
  key: string,
  mimeType: string,
  isPublic: boolean
): Promise<string> {
  if (isEdgeRuntime()) {
    throw new Error('File uploads require Node.js runtime. Use `export const runtime = "nodejs"` in your API route.');
  }

  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = await getS3Client();
  const config = getStorageConfig();

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ...(isPublic ? { ACL: 'public-read' } : {}),
  });

  await client.send(command);

  if (isPublic && config.publicUrl) {
    return `${config.publicUrl.replace(/\/+$/, '')}/${key}`;
  }

  return key;
}

async function deleteFromS3(key: string): Promise<void> {
  if (isEdgeRuntime()) {
    throw new Error('File deletion requires Node.js runtime.');
  }

  const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const client = await getS3Client();
  const config = getStorageConfig();

  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  await client.send(command);
}

export async function uploadFile(
  file: File | Buffer,
  fileName: string,
  options?: UploadOptions
): Promise<UploadResult> {
  validateStorageConfig();

  const buffer = await bufferFromFile(file);
  const mimeType = Buffer.isBuffer(file) ? 'application/octet-stream' : (file as File).type || 'application/octet-stream';

  const fileLike = { size: buffer.length, type: mimeType };
  validateFile(fileLike, options);

  const folder = options?.folder ?? 'uploads';
  const shouldEncrypt = options?.encrypt ?? process.env.ENCRYPT_UPLOADS === 'true';
  const isPublic = options?.public ?? false;

  const hash = createHash('sha256').update(buffer).digest('hex');

  let uploadBuffer = buffer;
  let isEncrypted = false;

  if (shouldEncrypt) {
    const encryptedBase64 = encryptSync(buffer.toString('base64'));
    uploadBuffer = Buffer.from(encryptedBase64, 'utf8');
    isEncrypted = true;
  }

  const arId = 'system';
  const key = generateStorageKey(folder, fileName, arId);

  const url = await uploadToS3(uploadBuffer, key, mimeType, isPublic);

  return {
    key,
    url,
    encrypted: isEncrypted,
    size: buffer.length,
    mimeType,
    originalName: fileName,
    hash,
  };
}

export async function deleteFile(key: string): Promise<void> {
  validateStorageConfig();
  await deleteFromS3(key);
}

export async function getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  if (isEdgeRuntime()) {
    throw new Error('Signed URLs require Node.js runtime.');
  }

  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl: s3GetSignedUrl } = await import('@aws-sdk/s3-request-presigner');
  const client = await getS3Client();
  const config = getStorageConfig();

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  return s3GetSignedUrl(client as any, command, { expiresIn });
}

export async function getFileBuffer(key: string): Promise<Buffer> {
  if (isEdgeRuntime()) {
    throw new Error('File downloads require Node.js runtime.');
  }

  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const client = await getS3Client();
  const config = getStorageConfig();

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  const response = await client.send(command);
  const body = await (response.Body as any).transformToByteArray();
  return Buffer.from(body);
}
