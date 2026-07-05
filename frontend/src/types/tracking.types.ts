/**
 * Tipos para o módulo de Acompanhamento do Cliente (Tracking Público)
 * 
 * Define a estrutura de dados que o cliente vê ao acompanhar seu protocolo.
 * Apenas dados não-sensíveis são expostos (LGPD Art. 6º - Princípio da Necessidade).
 */

export type ClientStatus =
  | 'PEDIDO_RECEBIDO'
  | 'DOCUMENTOS_EM_ANALISE'
  | 'DOCUMENTOS_APROVADOS'
  | 'DOCUMENTOS_REJEITADOS'
  | 'AGUARDANDO_VIDEOCONFERENCIA'
  | 'VIDEOCONFERENCIA_AGENDADA'
  | 'EM_ATENDIMENTO'
  | 'EMISSAO_PROTOCOLO_AC'
  | 'CERTIFICADO_EMITIDO'
  | 'CERTIFICADO_ENTREGUE'
  | 'CANCELADO'
  | 'ERRO';

export type ClientTimelineEvent = {
  type: string;
  title: string;
  description: string;
  ocorridoEm: string; // ISO 8601
  isError: boolean;
  isCurrent: boolean;
};

export type TrackingData = {
  protocolo: string;
  status: ClientStatus;
  statusLabel: string;
  produto: string;
  tipoCertificado: 'A1' | 'A3' | 'NUVEM';
  titular: {
    nome: string;
    documento: string; // CPF mascarado
  };
  agente?: {
    nome: string;
    email: string;
  };
  prazos: {
    pedidoEm: string;
    previsaoConclusao?: string;
    atualizadoEm: string;
  };
  timeline: ClientTimelineEvent[];
  mensagens: string[];
};

// Mapa de status para exibição (seguindo DESIGN_SYSTEM_v2.md)
export const TRACKING_STATUS_MAP: Record<ClientStatus, {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: string; // Nome do ícone Lucide
  step: number;
}> = {
  PEDIDO_RECEBIDO: {
    label: 'Pedido Recebido',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    icon: 'FileCheck',
    step: 1,
  },
  DOCUMENTOS_EM_ANALISE: {
    label: 'Documentos em Análise',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: 'Search',
    step: 2,
  },
  DOCUMENTOS_APROVADOS: {
    label: 'Documentos Aprovados',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: 'CheckCircle',
    step: 3,
  },
  DOCUMENTOS_REJEITADOS: {
    label: 'Documentos Rejeitados',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: 'XCircle',
    step: -1,
  },
  AGUARDANDO_VIDEOCONFERENCIA: {
    label: 'Aguardando Videoconferência',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: 'Video',
    step: 4,
  },
  VIDEOCONFERENCIA_AGENDADA: {
    label: 'Videoconferência Agendada',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: 'CalendarCheck',
    step: 4,
  },
  EM_ATENDIMENTO: {
    label: 'Em Atendimento',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: 'Headphones',
    step: 5,
  },
  EMISSAO_PROTOCOLO_AC: {
    label: 'Emitindo na AC',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: 'Server',
    step: 6,
  },
  CERTIFICADO_EMITIDO: {
    label: 'Certificado Emitido!',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: 'Award',
    step: 7,
  },
  CERTIFICADO_ENTREGUE: {
    label: 'Certificado Entregue',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: 'PackageCheck',
    step: 8,
  },
  CANCELADO: {
    label: 'Cancelado',
    bg: 'bg-slate-100',
    text: 'text-slate-500',
    border: 'border-slate-200',
    icon: 'XOctagon',
    step: -1,
  },
  ERRO: {
    label: 'Erro na Emissão',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: 'AlertTriangle',
    step: -1,
  },
};
