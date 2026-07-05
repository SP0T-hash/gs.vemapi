import { NextRequest, NextResponse } from 'next/server';
import { generateSetupData, enableUser2FA, twoFactorStore, verifyTOTPToken } from '@/lib/gs/totp';

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

interface PendingSetup {
  secretHex: string;
  backupCodes: string[];
  expiresAt: number;
}

const pendingSetup = new Map<string, PendingSetup>();

setInterval(() => {
  const now = Date.now();
  pendingSetup.forEach((value, key) => {
    if (value.expiresAt < now) pendingSetup.delete(key);
  });
}, 60_000);

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

  const existing = twoFactorStore.get(payload.sub);
  if (existing?.enabled) {
    return NextResponse.json({ error: '2FA já está habilitado para esta conta.' }, { status: 409 });
  }

  const setup = generateSetupData(payload.email, 'GS VEMAPI');

  pendingSetup.set(payload.sub, {
    secretHex: setup.secretHex,
    backupCodes: setup.backupCodes,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  return NextResponse.json({
    secret: setup.secret,
    otpauthUrl: setup.otpauthUrl,
    qrCodeSvg: setup.qrCodeSvg,
    backupCodes: setup.backupCodes,
  });
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

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  if (!body.token) {
    return NextResponse.json({ error: 'Código TOTP é obrigatório.' }, { status: 400 });
  }

  const pending = pendingSetup.get(payload.sub);
  if (!pending) {
    return NextResponse.json({ error: 'Nenhum setup pendente. Solicite um novo setup.' }, { status: 400 });
  }

  if (pending.expiresAt < Date.now()) {
    pendingSetup.delete(payload.sub);
    return NextResponse.json({ error: 'Setup expirado. Solicite um novo.' }, { status: 400 });
  }

  const verification = verifyTOTPToken(body.token, pending.secretHex);
  if (!verification.valid) {
    return NextResponse.json({ error: 'Código inválido. Verifique o aplicativo autenticador.' }, { status: 401 });
  }

  enableUser2FA(payload.sub, pending.secretHex, pending.backupCodes);
  pendingSetup.delete(payload.sub);

  const { logAudit } = await import('@/lib/gs/audit');
  logAudit({
    event: 'USER_UPDATED',
    severity: 'HIGH',
    userId: payload.sub,
    userName: payload.nome,
    userLevel: payload.nivel,
    description: '2FA habilitado para o usuário',
    metadata: { action: '2FA_ENABLED' },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    backupCodes: pending.backupCodes,
  });
}
