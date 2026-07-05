/**
 * Sistema de Permissões Granulares do GS
 *
 * Define níveis hierárquicos, permissões e utilitários de verificação.
 * Segue o schema SUPABASE_SCHEMA_GS.sql.
 */

export type UserLevel =
  | 'AC_ADMIN'
  | 'AC_SUPORTE'
  | 'AR_ADMIN'
  | 'AR_FINANCEIRO'
  | 'AR_SUPORTE'
  | 'UNIDADE_ADMIN'
  | 'UNIDADE_AGR'
  | 'UNIDADE_VENDAS'
  | 'CONTADOR';

export type Modulo =
  | 'pedidos'
  | 'clientes'
  | 'financeiro'
  | 'suporte'
  | 'relatorios'
  | 'config'
  | 'contador';

export type Acao = 'ver' | 'criar' | 'editar' | 'excluir' | 'aprovar';

export type Escopo = 'GLOBAL' | 'AR' | 'UNIDADE' | 'PROPRIO';

export interface Permissao {
  nivel: UserLevel;
  modulo: Modulo;
  acao: Acao;
  escopo: Escopo;
}

export interface SessaoUsuario {
  usuarioId: string;
  email: string;
  nome: string;
  nivel: UserLevel;
  arId: string | null;
  unidadeId: string | null;
  pontoId: string | null;
}

/**
 * Mapa de permissões para verificação rápida no frontend.
 * Estrutura: nivel -> modulo -> acao[] -> escopo
 */
export type PermissionMap = Record<string, Record<string, Record<string, Escopo[]>>>;

/**
 * Verifica se um usuário tem permissão para uma ação específica.
 * Ordem de verificação: GLOBAL > AR > UNIDADE > PROPRIO
 */
export function hasPermission(
  userLevel: UserLevel,
  modulo: Modulo,
  acao: Acao,
  permissionMap: PermissionMap,
): boolean {
  const levelPerms = permissionMap[userLevel];
  if (!levelPerms) return false;

  const modulePerms = levelPerms[modulo];
  if (!modulePerms) return false;

  const actionPerms = modulePerms[acao];
  if (!actionPerms) return false;

  return actionPerms.length > 0;
}

/**
 * Retorna o escopo máximo de um usuário para um módulo/ação.
 */
export function getMaxScope(
  userLevel: UserLevel,
  modulo: Modulo,
  acao: Acao,
  permissionMap: PermissionMap,
): Escopo | null {
  const levelPerms = permissionMap[userLevel];
  if (!levelPerms) return null;

  const modulePerms = levelPerms[modulo];
  if (!modulePerms) return null;

  const actionPerms = modulePerms[acao];
  if (!actionPerms || actionPerms.length === 0) return null;

  // Retorna o maior escopo (GLOBAL > AR > UNIDADE > PROPRIO)
  const hierarchy: Escopo[] = ['GLOBAL', 'AR', 'UNIDADE', 'PROPRIO'];
  for (const scope of hierarchy) {
    if (actionPerms.includes(scope)) return scope;
  }
  return actionPerms[0];
}

/**
 * Labels amigáveis para níveis de usuário
 */
export const USER_LEVEL_LABELS: Record<UserLevel, string> = {
  AC_ADMIN: 'Administrador AC',
  AC_SUPORTE: 'Suporte AC',
  AR_ADMIN: 'Administrador AR',
  AR_FINANCEIRO: 'Financeiro AR',
  AR_SUPORTE: 'Suporte AR',
  UNIDADE_ADMIN: 'Administrador Unidade',
  UNIDADE_AGR: 'Agente de Registro',
  UNIDADE_VENDAS: 'Vendas',
  CONTADOR: 'Contador',
};

/**
 * Cores por nível (design system v2.0)
 */
export const USER_LEVEL_COLORS: Record<UserLevel, { bg: string; text: string; border: string }> = {
  AC_ADMIN:       { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  AC_SUPORTE:     { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  AR_ADMIN:       { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  AR_FINANCEIRO:  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  AR_SUPORTE:     { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  UNIDADE_ADMIN:  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  UNIDADE_AGR:    { bg: 'bg-slate-100',  text: 'text-slate-700',  border: 'border-slate-200' },
  UNIDADE_VENDAS: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  CONTADOR:       { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
};
