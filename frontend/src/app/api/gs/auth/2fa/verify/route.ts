import { NextRequest, NextResponse } from 'next/server';
import { verifyTOTPToken, verifyBackupCode, removeUsedBackupCode, getUser2FA } from '@/lib/gs/totp';
import { logAudit } from '@/lib/gs/audit';

interface TempSession {
  userId: string;
  nome: string;
  email: string;
  nivel: string;
  arId: string | null;
  unidadeId: string | null;
  arNome?: string;
  unidadeNome?: string;
  expiresAt: number;
}

interface TempSessionEntry {
  session: TempSession;
  expiresAt: number;
}

const tempSessions = new Map<string, TempSessionEntry>();
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

setInterval(() => {
  const now = Date.now();
  tempSessions.forEach((value, key) => {
    if (value.expiresAt < now) tempSessions.delete(key);
  });
  rateLimitMap.forEach((value, key) => {
    if (Date.now() - value.windowStart > 5 * 60 * 1000) rateLimitMap.delete(key);
  });
}, 60_000);

export function createTempSession(user: {
  usuarioId: string;
  nome: string;
  email: string;
  nivel: string;
  arId: string | null;
  unidadeId: string | null;
  arNome?: string;
  unidadeNome?: string;
}): string {
  tempSessions.forEach((value, key) => {
    if (value.session.userId === user.usuarioId) tempSessions.delete(key);
  });

  const tempToken = Buffer.from(
    JSON.stringify({
      sub: user.usuarioId,
      jti: Math.random().toString(36).slice(2) + Date.now().toString(36),
      iat: Date.now(),
    })
  ).toString('base64url');

  const expiresAt = Date.now() + 5 * 60 * 1000;
  tempSessions.set(tempToken, {
    session: {
      userId: user.usuarioId,
      nome: user.nome,
      email: user.email,
      nivel: user.nivel,
      arId: user.arId,
      unidadeId: user.unidadeId,
      arNome: user.arNome,
      unidadeNome: user.unidadeNome,
      expiresAt,
    },
    expiresAt,
  });

  return tempToken;
}

export async function POST(req: NextRequest) {
  let body: { tempToken?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  if (!body.tempToken || !body.code) {
    return NextResponse.json({ error: 'tempToken e code são obrigatórios.' }, { status: 400 });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0';

  const rateKey = `${ip}:${body.tempToken}`;
  const rateEntry = rateLimitMap.get(rateKey);
  const now = Date.now();

  if (rateEntry && now - rateEntry.windowStart < 5 * 60 * 1000) {
    if (rateEntry.count >= 5) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em 5 minutos.' },
        { status: 429 }
      );
    }
    rateEntry.count++;
  } else {
    rateLimitMap.set(rateKey, { count: 1, windowStart: now });
  }

  const entry = tempSessions.get(body.tempToken);
  if (!entry) {
    return NextResponse.json({ error: 'Sessão temporária inválida ou expirada.' }, { status: 401 });
  }

  if (entry.expiresAt < now) {
    tempSessions.delete(body.tempToken);
    return NextResponse.json({ error: 'Sessão temporária expirada. Faça login novamente.' }, { status: 401 });
  }

  const session = entry.session;

  const user2FA = getUser2FA(session.userId);
  if (!user2FA || !user2FA.enabled) {
    return NextResponse.json({ error: '2FA não está habilitado para esta conta.' }, { status: 400 });
  }

  const code = body.code.trim();

  if (/^\d{6}$/.test(code)) {
    const verification = verifyTOTPToken(code, user2FA.secret);
    if (!verification.valid) {
      logAudit({
        event: 'LOGIN_FAILED',
        severity: 'MEDIUM',
        userId: session.userId,
        userName: session.nome,
        userLevel: session.nivel,
        description: 'Tentativa de 2FA com código inválido',
        ipAddress: ip,
        metadata: { action: '2FA_VERIFY_FAILED' },
      }).catch(() => {});
      return NextResponse.json({ error: 'Código 2FA inválido.' }, { status: 401 });
    }
  } else if (/^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(code.toUpperCase())) {
    const match = verifyBackupCode(code, user2FA.backupCodesHashed);
    if (!match) {
      return NextResponse.json({ error: 'Código de backup inválido ou já utilizado.' }, { status: 401 });
    }
    removeUsedBackupCode(session.userId, match);
  } else {
    return NextResponse.json(
      { error: 'Formato inválido. Use um código de 6 dígitos ou um código de backup (XXXXX-XXXXX).' },
      { status: 400 }
    );
  }

  const newToken = [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(JSON.stringify({
      sub: session.userId,
      email: session.email,
      nome: session.nome,
      nivel: session.nivel,
      arId: session.arId,
      tenant_id: session.arId,
      tenant_level: session.nivel,
      role: [session.nivel],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 8 * 3600,
    })),
    'mock_signature',
  ].join('.');

  tempSessions.delete(body.tempToken);

  const response = NextResponse.json({
    token: newToken,
    user: {
      usuarioId: session.userId,
      nome: session.nome,
      email: session.email,
      nivel: session.nivel,
      arId: session.arId,
      unidadeId: session.unidadeId,
      arNome: session.arNome,
      unidadeNome: session.unidadeNome,
    },
  });

  response.cookies.set('gs_token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 3600,
  });

  logAudit({
    event: 'LOGIN',
    severity: 'MEDIUM',
    userId: session.userId,
    userName: session.nome,
    userLevel: session.nivel,
    description: 'Login com 2FA',
    ipAddress: ip,
    metadata: { action: '2FA_VERIFY_SUCCESS' },
  }).catch(() => {});

  return response;
}
