import { NextRequest, NextResponse } from 'next/server';
import { getSignedUrl } from '@/lib/gs/file-upload';

export const runtime = 'nodejs';

interface DocumentoRecord {
  id: string;
  storage_key: string;
  [key: string]: unknown;
}

const documentosDb: DocumentoRecord[] = [];

export function setDocumentos(docs: DocumentoRecord[]) {
  documentosDb.length = 0;
  documentosDb.push(...docs);
}

export function addDocumento(doc: DocumentoRecord) {
  documentosDb.push(doc);
}

export function removeDocumento(id: string) {
  const idx = documentosDb.findIndex(d => d.id === id);
  if (idx >= 0) {
    const doc = documentosDb[idx];
    documentosDb.splice(idx, 1);
    return doc;
  }
  return null;
}

export function findDocumento(id: string) {
  return documentosDb.find(d => d.id === id) || null;
}

export function getDocumentos() {
  return [...documentosDb];
}

export async function POST(req: NextRequest) {
  let body: { documentoId: string; expiresIn?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  if (!body.documentoId) {
    return NextResponse.json({ error: 'Campo obrigatório: documentoId' }, { status: 400 });
  }

  const documento = findDocumento(body.documentoId);
  if (!documento) {
    return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
  }

  try {
    const expiresIn = body.expiresIn ?? 3600;
    if (expiresIn < 60 || expiresIn > 86400) {
      return NextResponse.json({ error: 'expiresIn deve estar entre 60 e 86400 segundos.' }, { status: 400 });
    }

    const url = await getSignedUrl(documento.storage_key, expiresIn);

    return NextResponse.json({
      success: true,
      url,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: `Falha ao gerar URL assinada: ${msg}` }, { status: 502 });
  }
}
