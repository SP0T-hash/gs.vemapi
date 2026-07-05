/**
 * AC ANGRY - Middleware de API 🛡️
 * Arquivo: src/lib/ac-angry/api-middleware.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import {
  SessionManager,
  RateLimiter,
  RateLimitError,
  AuditLogger,
  NonceManager,
  CertValidator,
  DataEncryptor,
} from './security';
import type { CertInfo, NonceScope } from './security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ===========================================================================
// Types
// ===========================================================================

export interface AuthContext {
  session: Awaited<ReturnType<typeof SessionManager.validate>>;
  ip: string;
}

type AuthHandler = (req: NextRequest, ctx: AuthContext) => Promise<NextResponse>;

interface RateLimitOpts {
  action: string;
  max?: number;
  window?: number;
}

export interface AuthOptions {
  rateLimit?: string | RateLimitOpts;
  requireRole?: 'AGR' | 'SUPERVISOR' | 'ADMIN';
  requireCert?: boolean;
  requireNonce?: boolean;
  auditEvent?: string;
  csrfProtection?: boolean;
  permissions?: string[];
}

// ===========================================================================
// Core: withAuth
// ===========================================================================

export function withAuth(handler: AuthHandler, opts: AuthOptions = {}) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ip = getClientIp(req);

    if (opts.rateLimit) {
      try {
        const action = typeof opts.rateLimit === 'string' ? opts.rateLimit : opts.rateLimit.action;
        await RateLimiter.check(`ip:${ip}`, action);
      } catch (e) {
        if (e instanceof RateLimitError) {
          return NextResponse.json(
            { error: e.message, retryAfter: e.retryAfterSeconds },
            { status: 429, headers: { ...generateSecurityHeaders(), 'Retry-After': String(e.retryAfterSeconds) } },
          );
        }
      }
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de sessão ausente.' }, { status: 401, headers: generateSecurityHeaders() });
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
        { status: 401, headers: generateSecurityHeaders() },
      );
    }

    if (opts.requireRole) {
      const { data: user } = await supabase
        .from('agr_users')
        .select('role')
        .eq('id', session.agrId)
        .single();

      const roles = ['AGR', 'SUPERVISOR', 'ADMIN'];
      const userIdx = roles.indexOf(user?.role ?? '');
      const requiredIdx = roles.indexOf(opts.requireRole);

      if (userIdx < requiredIdx) {
        return NextResponse.json(
          { error: 'Permissão insuficiente.' },
          { status: 403, headers: generateSecurityHeaders() },
        );
      }
    }

    if (opts.requireCert && !session.certSerial) {
      return NextResponse.json(
        { error: 'Certificado A3 obrigatório para esta ação.' },
        { status: 403, headers: generateSecurityHeaders() },
      );
    }

    if (opts.requireNonce) {
      try {
        const body = await req.clone().json();
        if (!body.nonce) {
          return NextResponse.json(
            { error: 'Nonce obrigatório.' },
            { status: 400, headers: generateSecurityHeaders() },
          );
        }
        await NonceManager.consume(body.nonce, 'EMIT' as NonceScope);
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : 'Nonce inválido.' },
          { status: 400, headers: generateSecurityHeaders() },
        );
      }
    }

    if (opts.csrfProtection) {
      const csrfToken = req.headers.get('x-csrf-token');
      if (!csrfToken || !NonceManager.validateCSRFToken(csrfToken)) {
        return NextResponse.json(
          { error: 'CSRF token inválido.' },
          { status: 403, headers: generateSecurityHeaders() },
        );
      }
    }

    if (opts.permissions && opts.permissions.length > 0) {
      const { data: user } = await supabase
        .from('agr_users')
        .select('role')
        .eq('id', session.agrId)
        .single();

      const role = user?.role ?? 'AGR';
      if (opts.permissions.includes('ADMIN') && role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Permissão insuficiente.' },
          { status: 403, headers: generateSecurityHeaders() },
        );
      }
      if (opts.permissions.includes('SUPERVISOR') && !['SUPERVISOR', 'ADMIN'].includes(role)) {
        return NextResponse.json(
          { error: 'Permissão insuficiente.' },
          { status: 403, headers: generateSecurityHeaders() },
        );
      }
    }

    try {
      const response = await handler(req, { session, ip });
      const enhancedHeaders = { ...Object.fromEntries(response.headers.entries()), ...generateSecurityHeaders() };
      const newResponse = new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: enhancedHeaders,
      });

      if (opts.auditEvent) {
        await AuditLogger.log({
          eventType: opts.auditEvent,
          agrId: session.agrId,
          ipAddress: ip,
          severity: 'INFO',
        });
      }

      return newResponse;
    } catch (e) {
      await AuditLogger.log({
        eventType: 'API_ERROR',
        agrId: session.agrId,
        ipAddress: ip,
        payload: { error: e instanceof Error ? e.message : 'unknown', path: req.nextUrl.pathname },
        severity: 'ERROR',
      });
      return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500, headers: generateSecurityHeaders() });
    }
  };
}

// ===========================================================================
// Middleware: withCertAuth
// ===========================================================================

export function withCertAuth(handler: (req: NextRequest, certInfo: CertInfo) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const certInfo = getClientCert(req);
    if (!certInfo) {
      return NextResponse.json(
        { error: 'Certificado A3 do cliente não fornecido.' },
        { status: 401, headers: generateSecurityHeaders() },
      );
    }

    const validation = await CertValidator.validateCertificateChain(
      `-----BEGIN CERTIFICATE-----\n${certInfo.serialNumber}\n-----END CERTIFICATE-----`
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Certificado inválido.', details: validation.errors },
        { status: 403, headers: generateSecurityHeaders() },
      );
    }

    if (!certInfo.isICPBr) {
      return NextResponse.json(
        { error: 'Apenas certificados ICP-Brasil são aceitos.' },
        { status: 403, headers: generateSecurityHeaders() },
      );
    }

    return handler(req, certInfo);
  };
}

// ===========================================================================
// Middleware: withNonce
// ===========================================================================

export function withNonce(handler: (req: NextRequest) => Promise<NextResponse>, scope: string) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const body = await req.clone().json();
      if (!body.nonce) {
        return NextResponse.json(
          { error: 'Nonce obrigatório para esta operação.' },
          { status: 400, headers: generateSecurityHeaders() },
        );
      }
      await NonceManager.consume(body.nonce, scope as NonceScope);
      return handler(req);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Falha na validação do nonce.' },
        { status: 400, headers: generateSecurityHeaders() },
      );
    }
  };
}

// ===========================================================================
// Middleware: withRateLimit
// ===========================================================================

export function withRateLimit(handler: (req: NextRequest) => Promise<NextResponse>, action: string, max?: number) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ip = getClientIp(req);
    try {
      await RateLimiter.check(`ip:${ip}`, action);
      return handler(req);
    } catch (e) {
      if (e instanceof RateLimitError) {
        return NextResponse.json(
          { error: e.message, retryAfter: e.retryAfterSeconds },
          { status: 429, headers: { ...generateSecurityHeaders(), 'Retry-After': String(e.retryAfterSeconds) } },
        );
      }
      throw e;
    }
  };
}

// ===========================================================================
// Middleware: withSecurityHeaders
// ===========================================================================

export function withSecurityHeaders(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const response = await handler(req);
    const headers = { ...Object.fromEntries(response.headers.entries()), ...generateSecurityHeaders() };
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

// ===========================================================================
// Helper Functions
// ===========================================================================

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0'
  );
}

export function getClientCert(req: NextRequest): CertInfo | null {
  const certHeader =
    req.headers.get('x-client-cert') ??
    req.headers.get('ssl-client-cert') ??
    req.headers.get('x-arr-clientcert');

  if (!certHeader) return null;

  try {
    const pem = certHeader.includes('-----BEGIN CERTIFICATE-----')
      ? certHeader
      : `-----BEGIN CERTIFICATE-----\n${certHeader}\n-----END CERTIFICATE-----`;

    const info = CertValidator.extractCertInfo(pem);
    return info;
  } catch {
    return null;
  }
}

export function validateSignature(payload: string, signature: string, certPem: string): boolean {
  try {
    const { createVerify } = require('crypto') as typeof import('crypto');
    const verifier = createVerify('RSA-SHA256');
    verifier.update(payload, 'utf8');
    const cert = new (require('crypto') as typeof import('crypto')).X509Certificate(certPem);
    const key = cert.publicKey;
    return verifier.verify(key, Buffer.from(signature, 'base64'));
  } catch {
    return false;
  }
}

export function generateSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=()',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };
}


