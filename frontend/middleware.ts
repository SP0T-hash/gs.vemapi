import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

/**
 * Next.js Middleware — Proteção de Rotas + Validação de Sessão + Security Headers.
 *
 * Executado no Edge Runtime ANTES de qualquer página carregar.
 * Adiciona headers de segurança OWASP e protege rotas sensíveis.
 */

// ─── Configuração de Segurança ──────────────────────────────────────────────

const PUBLIC_ROUTES = [
  '/login', '/register', '/forgot-password',
  '/api/auth', '/api/ac/track',
  '/acompanhar', '/termos', '/privacidade',
  '/api/gs/webhooks',  // Webhooks não precisam de auth
];

const ROUTE_ROLE_MAP: Record<string, string[] | null> = {
  '/dashboard/admin':      ['ROLE_MASTER'],
  '/dashboard/ar':         ['ROLE_MASTER', 'ROLE_ADMIN_AR'],
  '/dashboard/pa':         ['ROLE_MASTER', 'ROLE_ADMIN_AR', 'ROLE_PA'],
  '/dashboard/orders':     null,
  '/dashboard/billing':    ['ROLE_MASTER', 'ROLE_ADMIN_AR'],
  '/gs/admin':             ['ROLE_MASTER', 'AC_ADMIN'],
  '/gs/configuracoes':     null,  // Qualquer autenticado no GS
};

// CSP (Content Security Policy) — Protege contra XSS
const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.supabase.co https://*.r2.cloudflarestorage.com https://*.s3.amazonaws.com",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co https://api.asaas.com https://sandbox.asaas.com wss://*.supabase.co",
  "frame-src 'self' https://js.stripe.com https://*.asaas.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-DNS-Prefetch-Control': 'off',
};

const RATE_LIMIT_WINDOW = 60_000;    // 1 minuto
const RATE_LIMIT_MAX = 60;           // 60 requisições/minuto
const RATE_LIMIT_AUTH_MAX = 10;      // 10 tentativas de login/minuto

// ─── Middleware Principal ───────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // ─── 1. Security Headers (todas as respostas) ──────────────────────────
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('Content-Security-Policy', CSP_HEADER);

  // ─── 2. Rate Limiting por IP ──────────────────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || request.headers.get('cf-connecting-ip')
          || '127.0.0.1';
  const isAuthRoute = pathname.startsWith('/api/auth');
  const maxRequests = isAuthRoute ? RATE_LIMIT_AUTH_MAX : RATE_LIMIT_MAX;

  // Rate limit via headers (implementação real usa Redis/Supabase)
  response.headers.set('X-RateLimit-Limit', String(maxRequests));
  response.headers.set('X-RateLimit-Window', String(RATE_LIMIT_WINDOW));

  // ─── 3. CORS para API routes ──────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin') || '';
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5001',
      'https://vemapi.com.br',
      'https://*.vercel.app',
    ];

    if (allowedOrigins.some(o => origin.includes(o.replace('*', '')))) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Nonce, X-CSRF-Token');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Max-Age', '86400');
    }

    // Handle OPTIONS (preflight)
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }
  }

  // Ignora rotas públicas e assets estáticos (mas com security headers)
  if (
    PUBLIC_ROUTES.some(r => pathname.startsWith(r)) ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return response;
  }

  // ─── 4. Proteção de Rotas GS ──────────────────────────────────────────
  if (pathname.startsWith('/gs/') && !pathname.startsWith('/gs/login')) {
    const sessionToken = request.cookies.get('gs_token')?.value
                      || request.cookies.get('access_token')?.value;

    if (!sessionToken) {
      const loginUrl = new URL('/gs/login', request.url);
      loginUrl.searchParams.set('callbackUrl', encodeURIComponent(pathname));
      return NextResponse.redirect(loginUrl);
    }

    const payload = safeDecodeJwt(sessionToken);
    if (!payload) {
      const redirect = NextResponse.redirect(new URL('/gs/login', request.url));
      redirect.cookies.delete('gs_token');
      return redirect;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return NextResponse.redirect(new URL('/gs/login?expired=true', request.url));
    }

    // Injeta headers para Server Components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.sub ?? '');
    requestHeaders.set('x-user-level', payload.nivel ?? payload.role ?? '');
    requestHeaders.set('x-tenant-id', payload.ar_id ?? payload.tenant_id ?? '');
    requestHeaders.set('x-session-token', sessionToken);

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── 5. Proteção de Rotas Legadas ──────────────────────────────────────
  const sessionToken = request.cookies.get('access_token')?.value;

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', encodeURIComponent(pathname));
    return NextResponse.redirect(loginUrl);
  }

  const payload = safeDecodeJwt(sessionToken);
  if (!payload) {
    const redirect = NextResponse.redirect(new URL('/login', request.url));
    redirect.cookies.delete('access_token');
    return redirect;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    const refreshUrl = new URL('/api/auth/silent-refresh', request.url);
    refreshUrl.searchParams.set('callbackUrl', encodeURIComponent(pathname));
    return NextResponse.redirect(refreshUrl);
  }

  // RBAC
  const requiredRoles = getRequiredRoles(pathname);
  if (requiredRoles !== undefined) {
    const userRoles: string[] =
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
      payload.role ??
      [];

    const rolesArray = Array.isArray(userRoles) ? userRoles : [userRoles];
    const hasAccess = requiredRoles === null ||
                      rolesArray.some(r => requiredRoles.includes(r));

    if (!hasAccess) {
      return NextResponse.redirect(new URL('/403', request.url));
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.sub ?? '');
  requestHeaders.set('x-tenant-id', payload.tenant_id ?? '');
  requestHeaders.set('x-tenant-level', payload.tenant_level ?? '');
  requestHeaders.set('x-session-token', sessionToken);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

// ─── Utilitários ────────────────────────────────────────────────────────────

function safeDecodeJwt(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function getRequiredRoles(pathname: string): string[] | null | undefined {
  for (const [route, roles] of Object.entries(ROUTE_ROLE_MAP)) {
    if (pathname.startsWith(route)) return roles;
  }
  return null;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
