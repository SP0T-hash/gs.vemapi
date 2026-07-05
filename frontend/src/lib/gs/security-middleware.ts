import { NextRequest, NextResponse } from 'next/server';
import { decryptSync } from './encryption';
import { logAudit } from './audit';

type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityOptions {
  rateLimit?: boolean | { window: number; max: number };
  requireAuth?: boolean;
  permissions?: string[];
  audit?: boolean | { eventType: string; severity: AuditSeverity };
  validateBody?: boolean;
  encryptFields?: string[];
}

type HandlerFunction = (req: NextRequest, context: any) => Promise<NextResponse>;

const DEFAULT_RATE_LIMIT_WINDOW = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 30;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'X-XSS-Protection': '0',
};

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map(s => s.trim());
    const realIp = ips.find(ip => ip !== 'unknown' && ip !== '127.0.0.1' && !ip.startsWith('10.') && !ip.startsWith('172.16.') && !ip.startsWith('192.168.'));
    if (realIp) return realIp;
  }
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip') ??
    '0.0.0.0'
  );
}

export function validateCors(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;

  const allowedOrigins = (process.env.GS_CORS_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0) return true;

  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    return origin === allowed || origin.endsWith(allowed.replace('*.', '.'));
  });
}

export function addSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    return data
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }

  if (data !== null && typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return data;
}

export function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;

  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === parseInt(digits[10]);
}

export function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;

  if (/^(\d)\1{13}$/.test(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weights1[i];
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(digits[12])) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weights2[i];
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  return digit2 === parseInt(digits[13]);
}

export function validateEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  return re.test(email);
}

export function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

function parseRateLimitOptions(opts?: SecurityOptions['rateLimit']): { window: number; max: number } | null {
  if (!opts) return null;
  if (typeof opts === 'boolean') {
    return {
      window: parseInt(process.env.GS_RATE_LIMIT_WINDOW || String(DEFAULT_RATE_LIMIT_WINDOW), 10),
      max: parseInt(process.env.GS_RATE_LIMIT_MAX || String(DEFAULT_RATE_LIMIT_MAX), 10),
    };
  }
  return opts;
}

function checkRateLimit(ip: string, options: { window: number; max: number }): boolean {
  const now = Date.now();
  const key = `${ip}`;
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + options.window });
    return true;
  }

  if (entry.count >= options.max) {
    return false;
  }

  entry.count++;
  return true;
}

function extractAuth(req: NextRequest): { userId: string; userLevel: string } | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      return {
        userId: payload.sub || payload.userId || '',
        userLevel: payload.nivel || payload.role || payload.userLevel || '',
      };
    } catch {
      return null;
    }
  }

  const userId = req.headers.get('x-user-id');
  const userLevel = req.headers.get('x-user-level');
  if (userId && userLevel) {
    return { userId, userLevel };
  }

  return null;
}

export function withSecurity(handler: HandlerFunction, options?: SecurityOptions) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ip = getClientIp(req);

    if (!validateCors(req)) {
      return NextResponse.json(
        { error: 'Origin not allowed' },
        { status: 403 }
      );
    }

    if (options?.rateLimit) {
      const rlOptions = parseRateLimitOptions(options.rateLimit)!;
      if (!checkRateLimit(ip, rlOptions)) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil(rlOptions.window / 1000)),
            },
          }
        );
      }
    }

    let session: { userId: string; userLevel: string } | null = null;

    if (options?.requireAuth) {
      session = extractAuth(req);
      if (!session || !session.userId) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    if (options?.permissions && session && options.permissions.length > 0) {
      const hasPermission = options.permissions.some(perm => {
        const [modulo, acao] = perm.split(':');
        const userLevel = session!.userLevel;
        const permissionMap = {
          [userLevel]: {
            [modulo]: {
              [acao]: ['GLOBAL'],
            },
          },
        };
        return permissionMap[userLevel]?.[modulo]?.[acao]?.length > 0;
      });

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    let body: any = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        const cloned = req.clone();
        const text = await cloned.text();
        if (text) {
          body = JSON.parse(text);

          if (options?.validateBody) {
            if (!body || Object.keys(body).length === 0) {
              return NextResponse.json(
                { error: 'Request body is required' },
                { status: 400 }
              );
            }
          }

          body = sanitizeInput(body);

          if (options?.encryptFields && options.encryptFields.length > 0) {
            for (const field of options.encryptFields) {
              if (body[field] && typeof body[field] === 'string') {
                try {
                  body[field] = decryptSync(body[field]);
                } catch {
                  return NextResponse.json(
                    { error: `Failed to decrypt field: ${field}` },
                    { status: 400 }
                  );
                }
              }
            }
          }
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 }
        );
      }
    }

    try {
      const augmentedReq = body
        ? new NextRequest(req.url, {
            ...req,
            body: JSON.stringify(body),
            headers: req.headers,
          } as any)
        : req;

      const response = await handler(augmentedReq, {
        session,
        ip,
        body,
      });

      const securedResponse = addSecurityHeaders(response);

      if (options?.audit) {
        const auditConfig = typeof options.audit === 'object' ? options.audit : { eventType: 'API_CALL', severity: 'INFO' as AuditSeverity };
        const auditBody = body ? Object.keys(body).filter(k => !['password', 'senha', 'token', 'secret'].includes(k)).reduce((acc, k) => ({ ...acc, [k]: true }), {}) : undefined;
        logAudit({
          event: auditConfig.eventType as any,
          severity: auditConfig.severity,
          userId: session?.userId,
          userLevel: session?.userLevel,
          ipAddress: ip,
          description: `${req.method} ${req.nextUrl.pathname}`,
          metadata: { path: req.nextUrl.pathname, method: req.method, hasBody: !!auditBody },
        }).catch(() => {});
      }

      return securedResponse;
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Internal server error',
        },
        { status: 500 }
      );
    }
  };
}
