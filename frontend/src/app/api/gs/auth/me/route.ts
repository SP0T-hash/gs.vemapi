import { NextRequest, NextResponse } from 'next/server';

interface JwtPayload {
  sub: string;
  email: string;
  nome: string;
  nivel: string;
  arId: string | null;
  unidadeId: string | null;
  exp: number;
  [key: string]: unknown;
}

function safeDecodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.cookies.get('gs_token')?.value ?? null;
}

export async function GET(req: NextRequest) {
  const token = extractToken(req);

  if (!token) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const payload = safeDecodeJwt(token);
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    return NextResponse.json({ error: 'Token expirado.' }, { status: 401 });
  }

  return NextResponse.json({
    usuarioId: payload.sub,
    nome: payload.nome,
    email: payload.email,
    nivel: payload.nivel,
    arId: payload.arId,
    unidadeId: payload.unidadeId,
  });
}
