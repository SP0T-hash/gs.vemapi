/**
 * Tipos do Sistema de Suporte (Chamados)
 */

export type TicketPrioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
export type TicketStatus = 'ABERTO' | 'EM_ANALISE' | 'AGUARDANDO_CLIENTE' | 'RESOLVIDO' | 'FECHADO';
export type TicketCategoria = 'INSTALACAO' | 'EMISSAO' | 'VIDEOCONFERENCIA' | 'RENOVACAO' | 'REEMBOLSO' | 'FINANCEIRO' | 'OUTROS';

export interface GS_Ticket {
  id: string;
  ar_id: string;
  unidade_id?: string;
  cliente_id?: string;
  pedido_id?: string;
  usuario_id: string;
  responsavel_id?: string;

  titulo: string;
  descricao: string;
  categoria: TicketCategoria;
  prioridade: TicketPrioridade;
  status: TicketStatus;

  contato_cliente_nome?: string;
  contato_cliente_email?: string;
  contato_cliente_telefone?: string;
  resolucao?: string;

  created_at: string;
  updated_at: string;

  // Populated
  respostas?: GS_TicketResposta[];
  usuario_nome?: string;
  responsavel_nome?: string;
  cliente_nome?: string;
}

export interface GS_TicketResposta {
  id: string;
  ticket_id: string;
  usuario_id: string;
  mensagem: string;
  anexos?: Array<{ nome: string; url: string }>;
  is_interno: boolean;
  created_at: string;
  usuario_nome?: string;
}

export const TICKET_STATUS_MAP: Record<TicketStatus, { label: string; bg: string; text: string; border: string }> = {
  ABERTO:             { label: 'Aberto',             bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
  EM_ANALISE:         { label: 'Em Análise',         bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  AGUARDANDO_CLIENTE: { label: 'Aguard. Cliente',    bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  RESOLVIDO:          { label: 'Resolvido',          bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  FECHADO:            { label: 'Fechado',            bg: 'bg-slate-100',  text: 'text-slate-500',   border: 'border-slate-200' },
};

export const TICKET_PRIORIDADE_MAP: Record<TicketPrioridade, { label: string; color: string }> = {
  BAIXA:  { label: 'Baixa',  color: 'text-slate-500' },
  MEDIA:  { label: 'Média',  color: 'text-amber-600' },
  ALTA:   { label: 'Alta',   color: 'text-orange-600' },
  URGENTE: { label: 'Urgente', color: 'text-red-600' },
};

export const TICKET_CATEGORIA_LABELS: Record<TicketCategoria, string> = {
  INSTALACAO: 'Instalação',
  EMISSAO: 'Emissão',
  VIDEOCONFERENCIA: 'Videoconferência',
  RENOVACAO: 'Renovação',
  REEMBOLSO: 'Reembolso',
  FINANCEIRO: 'Financeiro',
  OUTROS: 'Outros',
};
