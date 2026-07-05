import { NextRequest, NextResponse } from 'next/server';
import { UserLevel, Modulo, Acao, Escopo, hasPermission } from '@/types/gs/permissions';

const DEFAULT_PERMISSION_MAP = {
  AC_ADMIN: {
    pedidos: { ver: ['GLOBAL'], criar: ['GLOBAL'], editar: ['GLOBAL'], excluir: ['GLOBAL'], aprovar: ['GLOBAL'] },
    clientes: { ver: ['GLOBAL'], criar: ['GLOBAL'], editar: ['GLOBAL'], excluir: ['GLOBAL'] },
    financeiro: { ver: ['GLOBAL'], criar: ['GLOBAL'], editar: ['GLOBAL'], excluir: ['GLOBAL'] },
    suporte: { ver: ['GLOBAL'], criar: ['GLOBAL'], editar: ['GLOBAL'] },
    relatorios: { ver: ['GLOBAL'] },
    config: { ver: ['GLOBAL'], criar: ['GLOBAL'], editar: ['GLOBAL'], excluir: ['GLOBAL'] },
    contador: { ver: ['GLOBAL'] },
  },
  AC_SUPORTE: {
    pedidos: { ver: ['GLOBAL'], criar: ['GLOBAL'], editar: ['GLOBAL'] },
    clientes: { ver: ['GLOBAL'], editar: ['GLOBAL'] },
    suporte: { ver: ['GLOBAL'], criar: ['GLOBAL'], editar: ['GLOBAL'] },
    relatorios: { ver: ['GLOBAL'] },
  },
  AR_ADMIN: {
    pedidos: { ver: ['AR'], criar: ['AR'], editar: ['AR'], excluir: ['AR'] },
    clientes: { ver: ['AR'], criar: ['AR'], editar: ['AR'] },
    financeiro: { ver: ['AR'] },
    suporte: { ver: ['AR'], criar: ['AR'], editar: ['AR'] },
    relatorios: { ver: ['AR'] },
    config: { ver: ['AR'], editar: ['AR'] },
    contador: { ver: ['AR'] },
  },
  AR_FINANCEIRO: {
    financeiro: { ver: ['AR'], criar: ['AR'], editar: ['AR'] },
    relatorios: { ver: ['AR'] },
    pedidos: { ver: ['AR'] },
  },
  AR_SUPORTE: {
    suporte: { ver: ['AR'], criar: ['AR'], editar: ['AR'] },
    pedidos: { ver: ['AR'] },
  },
  UNIDADE_ADMIN: {
    pedidos: { ver: ['UNIDADE'], criar: ['UNIDADE'], editar: ['UNIDADE'] },
    clientes: { ver: ['UNIDADE'], criar: ['UNIDADE'], editar: ['UNIDADE'] },
    financeiro: { ver: ['UNIDADE'] },
    suporte: { ver: ['UNIDADE'] },
  },
  UNIDADE_AGR: {
    pedidos: { ver: ['UNIDADE'], criar: ['UNIDADE'], editar: ['UNIDADE'] },
    clientes: { ver: ['UNIDADE'], criar: ['UNIDADE'] },
  },
  UNIDADE_VENDAS: {
    pedidos: { ver: ['UNIDADE'], criar: ['UNIDADE'] },
    clientes: { ver: ['UNIDADE'], criar: ['UNIDADE'] },
  },
  CONTADOR: {
    contador: { ver: ['AR'] },
    pedidos: { ver: ['AR'] },
    relatorios: { ver: ['AR'] },
  },
};

export interface PermissionCheck {
  modulo: Modulo;
  acao: Acao;
  escopo?: Escopo;
  message?: string;
}

const USER_LEVEL_HIERARCHY: UserLevel[] = [
  'AC_ADMIN',
  'AC_SUPORTE',
  'AR_ADMIN',
  'AR_FINANCEIRO',
  'AR_SUPORTE',
  'UNIDADE_ADMIN',
  'UNIDADE_AGR',
  'UNIDADE_VENDAS',
  'CONTADOR',
];

function getLevelIndex(level: UserLevel): number {
  return USER_LEVEL_HIERARCHY.indexOf(level);
}

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export function requirePermission(checks: PermissionCheck | PermissionCheck[]) {
  const checksArray = Array.isArray(checks) ? checks : [checks];

  return (handler: (req: NextRequest, context: any) => Promise<NextResponse>) => {
    return async (req: NextRequest): Promise<NextResponse> => {
      const session = getSessionFromRequest(req);
      if (!session) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      for (const check of checksArray) {
        const hasAccess = hasPermission(
          session.userLevel,
          check.modulo,
          check.acao,
          DEFAULT_PERMISSION_MAP as any
        );

        if (!hasAccess) {
          const message = check.message ||
            `Insufficient permissions: ${check.acao} on ${check.modulo}`;
          return NextResponse.json(
            { error: message },
            { status: 403 }
          );
        }
      }

      return handler(req, { session });
    };
  };
}

export function requireUserLevel(minLevel: UserLevel) {
  return (handler: (req: NextRequest, context: any) => Promise<NextResponse>) => {
    return async (req: NextRequest): Promise<NextResponse> => {
      const session = getSessionFromRequest(req);
      if (!session) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const minIndex = getLevelIndex(minLevel);
      const userIndex = getLevelIndex(session.userLevel);

      if (minIndex === -1 || userIndex === -1 || userIndex > minIndex) {
        return NextResponse.json(
          { error: `Minimum user level required: ${minLevel}` },
          { status: 403 }
        );
      }

      return handler(req, { session });
    };
  };
}

export function getSessionFromRequest(req: NextRequest): {
  userId: string;
  userLevel: UserLevel;
  arId: string | null;
  unidadeId: string | null;
} | null {
  const authHeader = req.headers.get('authorization');
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else {
    token = req.headers.get('x-session-token') || null;
  }

  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) return null;

  const userLevel: UserLevel =
    payload.nivel ||
    payload.userLevel ||
    payload.role ||
    'UNIDADE_AGR';

  if (!USER_LEVEL_HIERARCHY.includes(userLevel)) return null;

  return {
    userId: payload.sub || payload.userId || '',
    userLevel,
    arId: payload.arId || payload.tenant_id || null,
    unidadeId: payload.unidadeId || null,
  };
}

export function getUserScopeFilter(
  userLevel: UserLevel,
  arId: string | null,
  unidadeId: string | null
): Record<string, any> {
  switch (userLevel) {
    case 'AC_ADMIN':
    case 'AC_SUPORTE':
      return {};

    case 'AR_ADMIN':
    case 'AR_FINANCEIRO':
    case 'AR_SUPORTE':
    case 'CONTADOR':
      if (!arId) return { '1': '0' };
      return { ar_id: arId };

    case 'UNIDADE_ADMIN':
    case 'UNIDADE_AGR':
    case 'UNIDADE_VENDAS':
      if (!unidadeId) return { '1': '0' };
      return { unidade_id: unidadeId };

    default:
      return { '1': '0' };
  }
}
