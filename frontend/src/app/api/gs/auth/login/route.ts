import { NextRequest, NextResponse } from 'next/server';

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

const MOCK_USERS = [
  {
    usuarioId: 'usr-001',
    nome: 'Admin GS',
    email: 'admin@gs.vemapi.com.br',
    senha: '123456',
    nivel: 'AC_ADMIN' as const,
    arId: 'ar-001',
    unidadeId: null,
    arNome: 'AR Central VEMAPI',
  },
  {
    usuarioId: 'usr-002',
    nome: 'Carlos AR',
    email: 'carlos@ar.com.br',
    senha: '123456',
    nivel: 'AR_ADMIN' as const,
    arId: 'ar-001',
    unidadeId: null,
    arNome: 'AR Central VEMAPI',
  },
];

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0';

  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tente novamente em ${rateCheck.retryAfter} segundos.` },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  if (!body.email || !body.password) {
    return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 });
  }

  const user = MOCK_USERS.find(u => u.email === body.email);
  if (!user || user.senha !== body.password) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
  }

  const token = [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(JSON.stringify({
      sub: user.usuarioId,
      email: user.email,
      nome: user.nome,
      nivel: user.nivel,
      arId: user.arId,
      tenant_id: user.arId,
      tenant_level: user.nivel,
      role: [user.nivel],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 8 * 3600,
    })),
    'mock_signature',
  ].join('.');

  const response = NextResponse.json({
    token,
    user: {
      usuarioId: user.usuarioId,
      nome: user.nome,
      email: user.email,
      nivel: user.nivel,
      arId: user.arId,
      unidadeId: user.unidadeId,
      arNome: user.arNome,
    },
  });

  response.cookies.set('gs_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 3600,
  });

  return response;
}
