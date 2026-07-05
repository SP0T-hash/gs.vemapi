/**
 * Tipos de Pedidos e Clientes do GS
 */

export interface GS_Cliente {
  id: string;
  ar_id: string;
  unidade_id?: string;
  nome: string;
  cpf_cnpj: string;
  email: string;
  telefone?: string;
  tipo_pessoa: 'FISICA' | 'JURIDICA';
  endereco?: import('./organization').Endereco;
  contador_id?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export type PedidoStatus =
  | 'RASCUNHO'
  | 'AGUARDANDO_PAGAMENTO'
  | 'PAGO'
  | 'DOCUMENTOS_PENDENTES'
  | 'DOCUMENTOS_VALIDADOS'
  | 'DOCUMENTOS_REJEITADOS'
  | 'AGUARDANDO_VIDEO'
  | 'VIDEO_REALIZADO'
  | 'EMITINDO_AC'
  | 'EMITIDO'
  | 'ERRO_AC'
  | 'CANCELADO'
  | 'EXPIRADO';

export interface GS_Pedido {
  id: string;
  ar_id: string;
  unidade_id?: string;
  ponto_id?: string;
  cliente_id?: string;
  usuario_id?: string;
  contador_id?: string;

  protocolo?: string;
  tipo_certificado: 'A1' | 'A3' | 'NUVEM';
  produto: string;
  validade_meses: number;
  ac_provider: 'ANGRY' | 'SAFEWEB' | 'VALID' | 'SYNGULAR' | 'CERTISIGN' | string;

  status: PedidoStatus;
  status_ac?: Record<string, unknown>;

  valor_total: number;
  valor_comissao?: number;
  forma_pagamento?: string;
  pago_em?: string;

  emitido_em?: string;
  expira_em?: string;
  created_at: string;
  updated_at: string;

  // Populated relationships
  cliente?: GS_Cliente;
  unidade?: import('./organization').GS_Unidade_Resumo;
}

/** Mapa de status para UI (design system v2.0) */
export const PEDIDO_STATUS_MAP: Record<PedidoStatus, {
  label: string; bg: string; text: string; border: string;
}> = {
  RASCUNHO:               { label: 'Rascunho',           bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  AGUARDANDO_PAGAMENTO:   { label: 'Aguard. Pagamento', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  PAGO:                   { label: 'Pago',               bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  DOCUMENTOS_PENDENTES:   { label: 'Docs Pendentes',    bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  DOCUMENTOS_VALIDADOS:   { label: 'Docs OK',            bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200' },
  DOCUMENTOS_REJEITADOS:  { label: 'Docs Rejeitados',    bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  AGUARDANDO_VIDEO:       { label: 'Aguard. Vídeo',      bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  VIDEO_REALIZADO:        { label: 'Vídeo OK',           bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  EMITINDO_AC:            { label: 'Emitindo na AC',     bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  EMITIDO:                { label: 'Emitido ✓',           bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200' },
  ERRO_AC:                { label: 'Erro na AC',         bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  CANCELADO:              { label: 'Cancelado',          bg: 'bg-slate-100', text: 'text-slate-500',  border: 'border-slate-200' },
  EXPIRADO:               { label: 'Expirado',           bg: 'bg-slate-100', text: 'text-slate-500',  border: 'border-slate-200' },
};

export const AC_PROVIDER_LABELS: Record<string, string> = {
  ANGRY: 'AC ANGRY',
  SAFEWEB: 'Safeweb',
  VALID: 'Valid',
  SYNGULAR: 'Syngular',
  CERTISIGN: 'Certisign',
};
