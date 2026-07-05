/**
 * Tipos de Organização do GS
 *
 * Hierarquia: AC → AR → Unidades → Pontos de Atendimento → Usuários
 */

export interface GS_AR {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone?: string;
  contato_nome?: string;
  logo_url?: string;
  endereco?: Endereco;
  is_active: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GS_Unidade {
  id: string;
  ar_id: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone?: string;
  contato_nome?: string;
  tipo: 'MATRIZ' | 'FILIAL' | 'PARCEIRO' | 'FRANQUIA';
  endereco?: Endereco;
  is_active: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GS_PontoAtendimento {
  id: string;
  unidade_id: string;
  nome: string;
  codigo: string;
  email?: string;
  telefone?: string;
  endereco?: Endereco;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GS_Usuario {
  id: string;
  email: string;
  nome: string;
  cpf: string;
  telefone?: string;
  avatar_url?: string;
  nivel: import('./permissions').UserLevel;
  ar_id?: string;
  unidade_id?: string;
  ponto_id?: string;
  is_active: boolean;
  precisa_trocar_senha: boolean;
  ultimo_login?: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Endereco {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

export interface GS_Sessao {
  id: string;
  usuario_id: string;
  token: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  expires_at: string;
  last_activity: string;
  created_at: string;
}

/** Resumo para listagem (sem dados sensíveis) - LGPD */
export interface GS_AR_Resumo {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
  is_active: boolean;
  total_unidades: number;
  total_pedidos_mes: number;
  created_at: string;
}

export interface GS_Unidade_Resumo {
  id: string;
  nome: string;
  cnpj: string;
  tipo: string;
  is_active: boolean;
  total_pontos: number;
  total_pedidos_mes: number;
}

export interface GS_Usuario_Resumo {
  id: string;
  nome: string;
  email: string;
  nivel: import('./permissions').UserLevel;
  is_active: boolean;
  ultimo_login?: string;
  unidade_nome?: string;
}
