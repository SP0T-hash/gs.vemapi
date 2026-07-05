export interface BucketConfig {
  name: string;
  public: boolean;
  corsRules: CorsRule[];
  allowedMimes: string[];
  maxSizeMB: number;
}

export interface CorsRule {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  maxAgeSeconds: number;
}

export const GS_BUCKETS: Record<string, BucketConfig> = {
  documentos: {
    name: 'gs-documentos',
    public: false,
    corsRules: [{ allowedOrigins: ['*'], allowedMethods: ['GET', 'PUT', 'POST'], allowedHeaders: ['*'], maxAgeSeconds: 3600 }],
    allowedMimes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeMB: 10,
  },
  certificados: {
    name: 'gs-certificados',
    public: false,
    corsRules: [{ allowedOrigins: ['*'], allowedMethods: ['GET', 'PUT'], allowedHeaders: ['*'], maxAgeSeconds: 3600 }],
    allowedMimes: ['application/x-pkcs12', 'application/x-pem-file', 'application/pkix-cert', 'application/pkcs10'],
    maxSizeMB: 5,
  },
  nfs: {
    name: 'gs-notas-fiscais',
    public: false,
    corsRules: [{ allowedOrigins: ['*'], allowedMethods: ['GET', 'PUT', 'POST'], allowedHeaders: ['*'], maxAgeSeconds: 3600 }],
    allowedMimes: ['application/pdf', 'text/xml'],
    maxSizeMB: 5,
  },
};

export function getBucketConfig(bucketType: string): BucketConfig | undefined {
  return GS_BUCKETS[bucketType];
}

export function generateBucketPolicy(bucketName: string, publicAccess: boolean): string {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadGetObject',
        Effect: publicAccess ? 'Allow' : 'Deny',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucketName}/*`],
      },
      {
        Sid: 'AllowServiceRole',
        Effect: 'Allow',
        Principal: { AWS: '*' },
        Action: [
          's3:PutObject',
          's3:GetObject',
          's3:DeleteObject',
          's3:ListBucket',
        ],
        Resource: [
          `arn:aws:s3:::${bucketName}`,
          `arn:aws:s3:::${bucketName}/*`,
        ],
        Condition: {
          StringEquals: {
            'aws:PrincipalTag/Role': 'service',
          },
        },
      },
    ],
  }, null, 2);
}

export function generateCorsConfig(bucketType: string): string {
  const config = getBucketConfig(bucketType);
  if (!config) return JSON.stringify({ error: `Unknown bucket type: ${bucketType}` });

  return JSON.stringify({
    CORSRules: config.corsRules.map(rule => ({
      AllowedOrigins: rule.allowedOrigins,
      AllowedMethods: rule.allowedMethods,
      AllowedHeaders: rule.allowedHeaders,
      MaxAgeSeconds: rule.maxAgeSeconds,
    })),
  }, null, 2);
}

export function getStorageInstructions(provider: 's3' | 'r2'): string {
  const base = provider === 'r2'
    ? 'Cloudflare R2'
    : 'Amazon S3';

  return `## ${base} — Configuração Manual

### 1. Criar Buckets

Crie os seguintes buckets no console do ${provider}:

${Object.values(GS_BUCKETS).map(b => `- \`${b.name}\` (${b.public ? 'público' : 'privado'}, máx: ${b.maxSizeMB}MB)`).join('\n')}

### 2. Configurar CORS

Para cada bucket, aplique a política CORS gerada por \`generateCorsConfig()\`.

### 3. Credenciais

Crie um access key com permissão de leitura/escrita nos buckets e adicione ao \`.env.local\`:

\`\`\`env
STORAGE_PROVIDER=${provider}
STORAGE_ENDPOINT=${provider === 'r2' ? 'https://<account-id>.r2.cloudflarestorage.com' : ''}
STORAGE_REGION=${provider === 's3' ? 'us-east-1' : 'auto'}
STORAGE_ACCESS_KEY_ID=<sua-access-key>
STORAGE_SECRET_ACCESS_KEY=<sua-secret-key>
STORAGE_BUCKET=gs-documentos
STORAGE_PUBLIC_URL=${provider === 'r2' ? 'https://pub-<hash>.r2.dev' : ''}
ENCRYPT_UPLOADS=true
\`\`\`

### 4. Verificar

Execute \`GET /api/gs/storage/test\` para validar a conexão.`;
}

async function isEdgeRuntime(): Promise<boolean> {
  try {
    return typeof (globalThis as any).EdgeRuntime === 'string';
  } catch {
    return false;
  }
}

export async function validateStorageConnection(config: {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}): Promise<{ success: boolean; error?: string; bucketExists?: boolean; region?: string }> {
  if (await isEdgeRuntime()) {
    return { success: false, error: 'Storage validation requires Node.js runtime.' };
  }

  try {
    const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');

    const client = new S3Client({
      endpoint: config.endpoint || undefined,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: !config.endpoint?.includes('amazonaws.com'),
    });

    const command = new ListObjectsV2Command({
      Bucket: config.bucket,
      MaxKeys: 1,
    });

    await client.send(command);

    return {
      success: true,
      bucketExists: true,
      region: config.region,
    };
  } catch (error: any) {
    if (error?.name === 'NoSuchBucket') {
      return { success: false, error: `Bucket "${config.bucket}" não encontrado.`, bucketExists: false };
    }
    if (error?.name === 'CredentialsError' || error?.name === 'InvalidAccessKeyId') {
      return { success: false, error: 'Credenciais inválidas.', bucketExists: undefined };
    }
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: msg, bucketExists: undefined };
  }
}
