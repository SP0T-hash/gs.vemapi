/**
 * AC ANGRY - Middleware de API 🛡️
 * Arquivo: src/lib/ac-angry/api-middleware.ts
 *
 * Uso:
 *   import { withAuth } from '@/lib/ac-angry/api-middleware';
 *
 *   export const POST = withAuth(async (req, ctx) => {
 *     const { session } = ctx;  // sessão validada disponível aqui
 *     ...
 *   }, { rateLimit: 'EMIT' });
 */

import { NextRequest, NextResponse } from 'next/server';
import { SessionManager, RateLimiter, RateLimitError, AuditLogger } from './security';

export interface AuthContext {
  session: Awaited<ReturnType<typeof SessionManager.validate>>;
  ip: string;
}

type AuthHandler = (req: NextRequest, ctx: AuthContext) => Promise<NextResponse>;

interface MiddlewareOptions {
  rateLimit?: string; // ação para rate limiting (LOGIN, SIGN, EMIT...)
  requireRole?: 'AGR' | 'SUPERVISOR' | 'ADMIN';
}

/**
 * HOF que envolve um handler de API com:
 * 1. Rate Limiting por IP
 * 2. Validação de sessão (Bearer token)
 * 3. Log de auditoria automático
 */
export function withAuth(handler: AuthHandler, opts: MiddlewareOptions = {}) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      '0.0.0.0';

    // 1. Rate Limiting
    if (opts.rateLimit) {
      try {
        await RateLimiter.check(`ip:${ip}`, opts.rateLimit);
      } catch (e) {
        if (e instanceof RateLimitError) {
          return NextResponse.json(
            { error: e.message, retryAfter: e.retryAfterSeconds },
            { status: 429, headers: { 'Retry-After': String(e.retryAfterSeconds) } },
          );
        }
      }
    }

    // 2. Validar sessão
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de sessão ausente.' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    let session: Awaited<ReturnType<typeof SessionManager.validate>>;

    try {
      session = await SessionManager.validate(token);
    } catch (e) {
      await AuditLogger.log({
        eventType: 'AUTH_FAILURE',
        ipAddress: ip,
        payload: { reason: e instanceof Error ? e.message : 'unknown' },
        severity: 'WARN',
      });
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Sessão inválida.' },
        { status: 401 },
      );
    }

    // 3. Executar handler
    try {
      return await handler(req, { session, ip });
    } catch (e) {
      await AuditLogger.log({
        eventType: 'API_ERROR',
        agrId: session.agrId,
        ipAddress: ip,
        payload: { error: e instanceof Error ? e.message : 'unknown', path: req.nextUrl.pathname },
        severity: 'ERROR',
      });
      return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
  };
}

/**
 * Utilitário: extrai IP da request
 */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0'
  );
}
