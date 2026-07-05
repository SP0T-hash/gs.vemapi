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

export async function POST(req: NextRequest) {
  const token = req.cookies.get('gs_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const payload = safeDecodeJwt(token);
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
  }

  const newToken = [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(JSON.stringify({
      sub: payload.sub,
      email: payload.email,
      nome: payload.nome,
      nivel: payload.nivel,
      arId: payload.arId,
      tenant_id: payload.arId,
      tenant_level: payload.nivel,
      role: [payload.nivel],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 8 * 3600,
    })),
    'mock_signature',
  ].join('.');

  const response = NextResponse.json({
    token: newToken,
    user: {
      usuarioId: payload.sub,
      nome: payload.nome,
      email: payload.email,
      nivel: payload.nivel,
      arId: payload.arId,
      unidadeId: payload.unidadeId,
    },
  });

  response.cookies.set('gs_token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 3600,
  });

  return response;
}
