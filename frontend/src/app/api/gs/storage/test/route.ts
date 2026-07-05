import { NextRequest, NextResponse } from 'next/server';
import { validateStorageConnection, GS_BUCKETS } from '@/lib/gs/storage-setup';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  const provider = process.env.STORAGE_PROVIDER || 's3';
  const endpoint = process.env.STORAGE_ENDPOINT || '';
  const region = process.env.STORAGE_REGION || 'us-east-1';
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
  const bucket = process.env.STORAGE_BUCKET;

  const missing: string[] = [];
  if (!accessKeyId) missing.push('STORAGE_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('STORAGE_SECRET_ACCESS_KEY');
  if (!bucket) missing.push('STORAGE_BUCKET');

  if (missing.length > 0) {
    return NextResponse.json({
      success: false,
      error: `Variáveis obrigatórias faltando: ${missing.join(', ')}`,
      configured: false,
      provider,
      bucket: bucket || null,
    });
  }

  try {
    const result = await validateStorageConnection({
      endpoint,
      region,
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
      bucket: bucket!,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        configured: true,
        provider,
        bucket,
        bucketExists: result.bucketExists,
      });
    }

    const encryptionEnabled = process.env.GS_ENCRYPTION_KEY ? true : false;
    const envEncrypt = process.env.ENCRYPT_UPLOADS === 'true';

    return NextResponse.json({
      success: true,
      provider,
      bucket,
      bucketExists: true,
      region: result.region || region,
      encryptionEnabled: encryptionEnabled && envEncrypt,
      buckets: Object.values(GS_BUCKETS).map(b => ({
        name: b.name,
        maxSizeMB: b.maxSizeMB,
        public: b.public,
      })),
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({
      success: false,
      error: `Falha ao conectar com storage: ${msg}`,
      configured: true,
      provider,
      bucket,
    });
  }
}
