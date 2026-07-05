import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, createHash } from 'crypto';
import { encryptSync } from '@/lib/gs/encryption';
import { generateStorageKey, validateFile, formatFileSize, getFileCategory } from '@/lib/gs/file-upload';
import { getBucketConfig } from '@/lib/gs/storage-setup';
import { addDocumento, findDocumento, removeDocumento, getDocumentos } from '../url/route';

export const runtime = 'nodejs';

type DocumentoTipo = 'RG' | 'CNH' | 'COMPROVANTE' | 'CERTIFICADO' | 'NF' | 'OUTROS';

interface DocumentoMetadata {
  id: string;
  tipo: DocumentoTipo;
  cliente_id?: string;
  pedido_id?: string;
  usuario_id?: string;
  storage_key: string;
  original_name: string;
  mime_type: string;
  size: number;
  hash: string;
  encrypted: boolean;
  descricao?: string;
  uploaded_by: string;
  uploaded_at: string;
}

const VALID_TIPOS: DocumentoTipo[] = ['RG', 'CNH', 'COMPROVANTE', 'CERTIFICADO', 'NF', 'OUTROS'];

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  p12: 'application/x-pkcs12',
  pem: 'application/x-pem-file',
  cer: 'application/pkix-cert',
  p7b: 'application/pkcs7-signature',
  xml: 'text/xml',
};

function mimeFromExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return MIME_MAP[ext] || 'application/octet-stream';
}

async function detectMagicBytes(buffer: Buffer, declaredMime: string): Promise<boolean> {
  const magicSignatures: [number[], string][] = [
    [[0x25, 0x50, 0x44, 0x46], 'application/pdf'],
    [[0xFF, 0xD8, 0xFF], 'image/jpeg'],
    [[0x89, 0x50, 0x4E, 0x47], 'image/png'],
    [[0x3C, 0x3F, 0x78, 0x6D, 0x6C], 'text/xml'],
    [[0x3C, 0x78, 0x6D, 0x6C], 'text/xml'],
  ];

  for (const [magic, mime] of magicSignatures) {
    if (magic.every((byte, i) => buffer[i] === byte)) {
      if (mime !== declaredMime && !declaredMime.startsWith('application/octet-stream')) {
        return false;
      }
      return true;
    }
  }
  return true;
}

function isEdgeRuntime(): boolean {
  try {
    return typeof (globalThis as any).EdgeRuntime === 'string';
  } catch {
    return false;
  }
}

async function uploadToS3(
  buffer: Buffer,
  key: string,
  mimeType: string,
  bucket: string
): Promise<void> {
  if (isEdgeRuntime()) {
    throw new Error('File uploads require Node.js runtime.');
  }

  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const provider = process.env.STORAGE_PROVIDER || 's3';
  const endpoint = process.env.STORAGE_ENDPOINT || '';

  const client = new S3Client({
    endpoint: endpoint || undefined,
    region: process.env.STORAGE_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: provider === 'r2',
  }) as any;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });

  await client.send(command);
}

async function deleteFromS3(key: string, bucket: string): Promise<void> {
  if (isEdgeRuntime()) {
    throw new Error('File deletion requires Node.js runtime.');
  }

  const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const provider = process.env.STORAGE_PROVIDER || 's3';
  const endpoint = process.env.STORAGE_ENDPOINT || '';

  const client = new S3Client({
    endpoint: endpoint || undefined,
    region: process.env.STORAGE_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: provider === 'r2',
  }) as any;

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await client.send(command);
}

export async function POST(req: NextRequest) {
  const bucket = process.env.STORAGE_BUCKET;
  if (!bucket) {
    return NextResponse.json({ error: 'STORAGE_BUCKET não configurada.' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const tipo = (formData.get('tipo') as string) || 'OUTROS';
    const clienteId = formData.get('cliente_id') as string | null;
    const pedidoId = formData.get('pedido_id') as string | null;
    const descricao = formData.get('descricao') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });
    }

    if (!VALID_TIPOS.includes(tipo as DocumentoTipo)) {
      return NextResponse.json({ error: `Tipo inválido. Use: ${VALID_TIPOS.join(', ')}` }, { status: 400 });
    }

    const fileMime = file.type || mimeFromExtension(file.name);
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const fileLike = { size: fileBuffer.length, type: fileMime };
    const bucketConfig = getBucketConfig(tipo === 'CERTIFICADO' ? 'certificados' : tipo === 'NF' ? 'nfs' : 'documentos');

    validateFile(fileLike, {
      maxSizeMB: bucketConfig?.maxSizeMB ?? 10,
      allowedMimes: bucketConfig?.allowedMimes ?? [],
    });

    const magicOk = await detectMagicBytes(fileBuffer, fileMime);
    if (!magicOk) {
      return NextResponse.json({ error: 'Tipo de arquivo não corresponde ao conteúdo (magic bytes).' }, { status: 400 });
    }

    const hash = createHash('sha256').update(fileBuffer).digest('hex');
    const shouldEncrypt = process.env.ENCRYPT_UPLOADS === 'true';

    let uploadBuffer = fileBuffer;
    let isEncrypted = false;
    if (shouldEncrypt) {
      const encryptedBase64 = encryptSync(fileBuffer.toString('base64'));
      uploadBuffer = Buffer.from(encryptedBase64, 'utf8');
      isEncrypted = true;
    }

    const key = generateStorageKey(tipo.toLowerCase(), file.name, clienteId || 'anon');

    try {
      await uploadToS3(uploadBuffer, key, fileMime, bucket);
    } catch {
      return NextResponse.json({ error: 'Falha ao fazer upload para o storage.' }, { status: 502 });
    }

    const documento: DocumentoMetadata = {
      id: randomUUID(),
      tipo: tipo as DocumentoTipo,
      cliente_id: clienteId || undefined,
      pedido_id: pedidoId || undefined,
      storage_key: key,
      original_name: file.name,
      mime_type: fileMime,
      size: fileBuffer.length,
      hash,
      encrypted: isEncrypted,
      descricao: descricao || undefined,
      uploaded_by: 'system',
      uploaded_at: new Date().toISOString(),
    };

    addDocumento(documento as any);

    return NextResponse.json({
      success: true,
      documento: {
        id: documento.id,
        tipo: documento.tipo,
        originalName: documento.original_name,
        size: documento.size,
        sizeFormatted: formatFileSize(documento.size),
        mimeType: documento.mime_type,
        uploadedAt: documento.uploaded_at,
        categoria: getFileCategory(documento.mime_type),
      },
    }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: `Falha ao processar upload: ${msg}` }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clienteId = searchParams.get('cliente_id');
  const pedidoId = searchParams.get('pedido_id');
  const tipo = searchParams.get('tipo') as DocumentoTipo | null;
  const includeUrls = searchParams.get('includeUrls') === 'true';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

  let docs = getDocumentos();

  if (clienteId) {
    docs = docs.filter(d => (d as any).cliente_id === clienteId);
  }
  if (pedidoId) {
    docs = docs.filter(d => (d as any).pedido_id === pedidoId);
  }
  if (tipo && VALID_TIPOS.includes(tipo)) {
    docs = docs.filter(d => (d as any).tipo === tipo);
  }

  const total = docs.length;
  const start = (page - 1) * limit;
  const paginated = docs.slice(start, start + limit);

  let result = paginated;

  if (includeUrls) {
    result = await Promise.all(
      paginated.map(async (doc) => {
        try {
          const { getSignedUrl } = await import('@/lib/gs/file-upload');
          const url = await getSignedUrl((doc as any).storage_key, 3600);
          return { ...doc, url };
        } catch {
          return doc;
        }
      })
    );
  }

  return NextResponse.json({
    success: true,
    documentos: result.map(d => ({
      id: (d as any).id,
      tipo: (d as any).tipo,
      originalName: (d as any).original_name,
      size: (d as any).size,
      sizeFormatted: formatFileSize((d as any).size),
      mimeType: (d as any).mime_type,
      clienteId: (d as any).cliente_id,
      pedidoId: (d as any).pedido_id,
      descricao: (d as any).descricao,
      uploadedAt: (d as any).uploaded_at,
      url: (d as any).url || undefined,
      categoria: getFileCategory((d as any).mime_type),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function DELETE(req: NextRequest) {
  const bucket = process.env.STORAGE_BUCKET;
  if (!bucket) {
    return NextResponse.json({ error: 'STORAGE_BUCKET não configurada.' }, { status: 500 });
  }

  let body: { id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: 'Campo obrigatório: id' }, { status: 400 });
  }

  const documento = findDocumento(body.id) as DocumentoMetadata | null;
  if (!documento) {
    return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
  }

  try {
    await deleteFromS3(documento.storage_key, bucket);
  } catch {
    return NextResponse.json({ error: 'Falha ao excluir arquivo do storage.' }, { status: 502 });
  }

  removeDocumento(body.id);

  return NextResponse.json({ success: true });
}
