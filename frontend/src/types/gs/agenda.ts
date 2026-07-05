export type AgendaStatus = 'AGENDADO' | 'CONFIRMADO' | 'ATENDIDO' | 'NAO_COMPARECEU' | 'REAGENDADO' | 'CANCELADO';

export type TipoServico = 'CERTIFICADO' | 'RENOVACAO' | 'ORCAMENTO' | 'SUPORTE' | 'ENTREGA' | 'OUTROS';

export type ComissaoStatus = 'PENDENTE' | 'PAGO' | 'CANCELADO';

export interface GS_Agendamento {
  id: string;
  ar_id: string;
  unidade_id?: string;
  ponto_id?: string;
  cliente_id?: string;
  usuario_id: string;
  contador_id?: string;
  cliente_nome: string;
  cliente_telefone?: string;
  cliente_email?: string;
  cliente_numero?: string;
  data: string;
  hora: string;
  hora_fim?: string;
  tipo_servico: TipoServico;
  status: AgendaStatus;
  indicacao?: string;
  observacoes?: string;
  agente_nome?: string;
  unidade_nome?: string;
  created_at: string;
  updated_at: string;
}

export interface GS_Comissao {
  id: string;
  agendamento_id: string;
  usuario_id: string;
  valor_total: number;
  percentual: number;
  valor_comissao: number;
  status: ComissaoStatus;
  pago_em?: string;
  created_at: string;
  agente_nome?: string;
  cliente_nome?: string;
  data?: string;
  servico?: string;
}

export interface GS_ClienteCompleto {
  id: string;
  ar_id: string;
  unidade_id: string | null;
  numero_cliente: string | null;
  indicacao: string | null;
  nome: string;
  cpf_cnpj: string;
  email: string;
  telefone: string | null;
  tipo_pessoa: 'FISICA' | 'JURIDICA';
  endereco: Record<string, unknown> | null;
  contador_id: string | null;
  observacoes: string | null;
  unidade_nome?: string;
  contador_nome?: string;
  total_pedidos?: number;
  ultimo_pedido?: string;
  ultimo_atendimento?: string;
}

export const AGENDA_STATUS_UI: Record<AgendaStatus, { label: string; dot: string; text: string; bg: string }> = {
  AGENDADO:      { label: 'Agendado',       dot: 'bg-blue-400',  text: 'text-blue-700',  bg: 'bg-blue-50' },
  CONFIRMADO:    { label: 'Confirmado',     dot: 'bg-indigo-400',text: 'text-indigo-700',bg: 'bg-indigo-50' },
  ATENDIDO:      { label: 'Atendido',       dot: 'bg-emerald-400',text: 'text-emerald-700',bg: 'bg-emerald-50' },
  NAO_COMPARECEU:{ label: 'Não Compareceu', dot: 'bg-red-400',   text: 'text-red-700',   bg: 'bg-red-50' },
  REAGENDADO:    { label: 'Reagendado',     dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50' },
  CANCELADO:     { label: 'Cancelado',      dot: 'bg-slate-300', text: 'text-slate-500', bg: 'bg-slate-100' },
};

export const SERVICO_LABELS: Record<TipoServico, string> = {
  CERTIFICADO: 'Certificado',
  RENOVACAO: 'Renovação',
  ORCAMENTO: 'Orçamento',
  SUPORTE: 'Suporte',
  ENTREGA: 'Entrega',
  OUTROS: 'Outros',
};

export const COMISSAO_STATUS_MAP: Record<ComissaoStatus, { label: string; bg: string; text: string }> = {
  PENDENTE:  { label: 'Pendente',  bg: 'bg-amber-50',  text: 'text-amber-700' },
  PAGO:      { label: 'Pago',      bg: 'bg-emerald-50', text: 'text-emerald-700' },
  CANCELADO: { label: 'Cancelado', bg: 'bg-slate-50',   text: 'text-slate-500' },
};

export function getMonthNameBR(month: number): string {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return months[month - 1] || '';
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDateBR(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');
}

export function getDiaSemana(date: Date): string {
  const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return dias[date.getDay()];
}
