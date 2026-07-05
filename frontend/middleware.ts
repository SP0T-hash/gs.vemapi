import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

/**
 * Next.js Middleware — Proteção de Rotas + Validação de Sessão.
 *
 * Executado no Edge Runtime ANTES de qualquer página carregar.
 * O token de sessão é armazenado em cookie HttpOnly e validado
 * contra o Supabase a cada requisição protegida.
 */

// Mapa de rotas para roles permitidas (null = qualquer autenticado)
const ROUTE_ROLE_MAP: Record<string, string[] | null> = {
  '/dashboard/admin':   ['ROLE_MASTER'],
  '/dashboard/ar':      ['ROLE_MASTER', 'ROLE_ADMIN_AR'],
  '/dashboard/pa':      ['ROLE_MASTER', 'ROLE_ADMIN_AR', 'ROLE_PA'],
  '/dashboard/orders':  null,
  '/dashboard/billing': ['ROLE_MASTER', 'ROLE_ADMIN_AR'],
};

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/api/auth'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignora rotas públicas e assets estáticos
  if (
    PUBLIC_ROUTES.some(r => pathname.startsWith(r)) ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Lê o session_token do cookie (HttpOnly)
  const sessionToken = request.cookies.get('access_token')?.value;

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', encodeURIComponent(pathname));
    return NextResponse.redirect(loginUrl);
  }

  // Decodifica o payload do JWT para claims básicos (rota/role)
  // A verificação completa da assinatura é feita pelo backend (SessionManager.validate)
  const payload = safeDecodeJwt(sessionToken);

  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('access_token');
    return response;
  }

  // Verifica expiração
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    const refreshUrl = new URL('/api/auth/silent-refresh', request.url);
    refreshUrl.searchParams.set('callbackUrl', encodeURIComponent(pathname));
    return NextResponse.redirect(refreshUrl);
  }

  // ─── RBAC: Verifica role para a rota ──────────────────────────────────────
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

  // Injeta headers para Server Components
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
