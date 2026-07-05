import { NextRequest, NextResponse } from 'next/server';
import { verifyTOTPToken, disableUser2FA, getUser2FA } from '@/lib/gs/totp';
import { logAudit } from '@/lib/gs/audit';

const MOCK_USERS = [
  {
    usuarioId: 'usr-001',
    nome: 'Admin GS',
    email: 'admin@gs.vemapi.com.br',
    senha: '123456',
  },
  {
    usuarioId: 'usr-002',
    nome: 'Carlos AR',
    email: 'carlos@ar.com.br',
    senha: '123456',
  },
];

interface JwtPayload {
  sub: string;
  email: string;
  nome: string;
  nivel: string;
  arId: string | null;
  exp: number;
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

export async function POST(req: NextRequest) {
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

  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  if (!body.token || !body.password) {
    return NextResponse.json({ error: 'Código 2FA e senha são obrigatórios.' }, { status: 400 });
  }

  const mockUser = MOCK_USERS.find(u => u.usuarioId === payload.sub);
  if (!mockUser || mockUser.senha !== body.password) {
    return NextResponse.json({ error: 'Senha inválida.' }, { status: 401 });
  }

  const user2FA = getUser2FA(payload.sub);
  if (!user2FA || !user2FA.enabled) {
    return NextResponse.json({ error: '2FA não está habilitado para esta conta.' }, { status: 400 });
  }

  const verification = verifyTOTPToken(body.token, user2FA.secret);
  if (!verification.valid) {
    return NextResponse.json({ error: 'Código 2FA inválido.' }, { status: 401 });
  }

  disableUser2FA(payload.sub);

  logAudit({
    event: 'USER_UPDATED',
    severity: 'HIGH',
    userId: payload.sub,
    userName: payload.nome,
    userLevel: payload.nivel,
    description: '2FA desabilitado para o usuário',
    metadata: { action: '2FA_DISABLED' },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
