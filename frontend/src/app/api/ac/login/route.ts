/**
 * POST /api/ac/login
 *
 * Autenticação do AGR (Agente de Registro).
 *
 * Fluxo:
 * 1. Rate limiting por IP (5 tentativas/minuto)
 * 2. Valida credenciais (email+senha com bcrypt ou certificado A3)
 * 3. Cria sessão segura via SessionManager
 * 4. Retorna session_token + dados do AGR
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { SessionManager, RateLimiter, RateLimitError, AuditLogger } from '@/lib/ac-angry';

// Cliente Supabase com Service Role (server-side apenas)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0';

  // ─── 1. Rate Limiting ────────────────────────────────────────────────────
  try {
    await RateLimiter.check(`ip:${ip}`, 'LOGIN');
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json(
        { error: e.message, retryAfter: e.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(e.retryAfterSeconds) } },
      );
    }
    throw e;
  }

  // ─── 2. Validar body ─────────────────────────────────────────────────────
  let body: { email?: string; password?: string; certSerial?: string; signature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: 'Email e senha são obrigatórios.' },
      { status: 400 },
    );
  }

  // ─── 3. Buscar AGR no banco ──────────────────────────────────────────────
  const { data: agr, error } = await supabase
    .from('agr_users')
    .select('id, cpf, nome, email, role, is_active, password_hash')
    .eq('email', body.email)
    .single();

  if (error || !agr) {
    await AuditLogger.log({
      eventType: 'LOGIN_FAILED',
      ipAddress: ip,
      payload: { email: body.email, reason: 'Usuário não encontrado' },
      severity: 'WARN',
    });
    return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
  }

  if (!agr.is_active) {
    await AuditLogger.log({
      eventType: 'LOGIN_FAILED',
      agrId: agr.id,
      ipAddress: ip,
      payload: { reason: 'Conta desativada' },
      severity: 'WARN',
    });
    return NextResponse.json({ error: 'Conta desativada. Contacte o administrador.' }, { status: 403 });
  }

  // ─── 4. Verificar senha com bcrypt ────────────────────────────────────────
  const passwordValid = agr.password_hash
    ? await bcrypt.compare(body.password, agr.password_hash)
    : false;

  if (!passwordValid) {
    await AuditLogger.log({
      eventType: 'LOGIN_FAILED',
      agrId: agr.id,
      ipAddress: ip,
      payload: { email: body.email, reason: 'Senha incorreta' },
      severity: 'WARN',
    });
    return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
  }

  // ─── 5. Criar sessão ─────────────────────────────────────────────────────
  const userAgent = req.headers.get('user-agent') ?? undefined;
  const sessionToken = await SessionManager.create(
    agr.id,
    ip,
    userAgent ?? 'unknown',
    body.certSerial,
  );

  // ─── 6. Atualizar last_login do AGR ──────────────────────────────────────
  await supabase
    .from('agr_users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', agr.id);

  await AuditLogger.log({
    eventType: 'LOGIN_SUCCESS',
    agrId: agr.id,
    ipAddress: ip,
    severity: 'INFO',
  });

  // ─── 7. Response ─────────────────────────────────────────────────────────
  const response = NextResponse.json({
    sessionToken,
    agr: {
      id: agr.id,
      nome: agr.nome,
      email: agr.email,
      role: agr.role,
    },
  });

  // Cookie seguro: HttpOnly + SameSite Strict + Secure em produção
  // OBS: middleware.ts usa 'access_token' como nome do cookie
  response.cookies.set('access_token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 3600, // 8 horas
  });

  return response;
}
