/**
 * Tipos do Módulo de Faturamento (GS Billing)
 *
 * Modelo Híbrido: Mensalidade + Taxa por certificado
 * Gateway: Asaas (Pix, Boleto, Cartão)
 */

// ─── Planos ───────────────────────────────────────────────────────────────────

export type PlanoPublicoAlvo = 'AC' | 'AR' | 'UNIDADE' | 'CONTADOR';
export type PlanoNivel = 'BASICO' | 'PROFISSIONAL' | 'ENTERPRISE';
export type PlanoSuporte = 'EMAIL' | 'CHAT' | 'PRIORITARIO' | 'CONCIERGE';

export interface GS_Plano {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  publico_alvo: PlanoPublicoAlvo;
  nivel: PlanoNivel;

  valor_mensal: number;
  taxa_por_cert: number;
  limite_certs: number;

  max_usuarios: number;
  max_unidades: number;
  max_clientes: number;
  integracoes: string[];
  suporte_tipo: PlanoSuporte;
  recursos: Record<string, boolean>;

  is_active: boolean;
  ordem: number;
}

// ─── Assinaturas ──────────────────────────────────────────────────────────────

export type AssinaturaStatus = 'ATIVA' | 'CANCELADA' | 'EXPIRADA' | 'TRIAL' | 'BLOQUEADA';
export type AssinaturaCiclo = 'MENSAL' | 'TRIMESTRAL' | 'ANUAL';

export interface GS_Assinatura {
  id: string;
  ar_id: string | null;
  contador_id: string | null;
  entidade_tipo: 'AR' | 'AC' | 'CONTADOR';

  plano_id: string;
  status: AssinaturaStatus;

  asaas_subscription_id: string | null;
  asaas_customer_id: string | null;

  data_inicio: string;
  data_proximo_ciclo: string | null;
  data_cancelamento: string | null;
  ciclo_tipo: AssinaturaCiclo;
  trial_ate: string | null;

  certs_no_ciclo: number;
  certs_faturados: number;
  excedente: number;

  valor_mensal_cobrado: number | null;
  split_percent_gs: number;
  split_percent_ar: number;

  dias_vencimento: number;

  // Populated
  plano?: GS_Plano;
  ar_nome?: string;
}

// ─── Cobranças (GS → AR/AC/Contador) ─────────────────────────────────────────

export type CobrancaStatus = 'PENDENTE' | 'VENCIDA' | 'PAGA' | 'CANCELADA' | 'REEMBOLSADA' | 'PARCIAL';

export interface GS_Cobranca {
  id: string;
  assinatura_id: string;
  numero: string;
  descricao: string | null;

  valor_mensalidade: number;
  valor_excedente: number;
  valor_total: number;
  taxa_gateway: number;

  periodo_ref: string;
  data_vencimento: string;
  data_pagamento: string | null;

  status: CobrancaStatus;

  asaas_payment_id: string | null;
  asaas_invoice_url: string | null;
  asaas_pix_code: string | null;
  asaas_bank_slip_url: string | null;

  repasse_gs: number;
  repasse_ar: number;

  pago_por: string | null;
  conciliado: boolean;

  // Populated
  assinatura?: GS_Assinatura;
}

// ─── Faturas (AR → Cliente Final) ────────────────────────────────────────────

export type FaturaStatus = 'PENDENTE' | 'VENCIDA' | 'PAGA' | 'CANCELADA' | 'REEMBOLSADA' | 'PARCIAL';
export type FaturaMeioPagamento = 'PIX' | 'BOLETO' | 'CARTAO' | 'TRANSFERENCIA';
export type FaturaTipoCobranca = 'UNICA' | 'RECORRENTE' | 'PARCELAMENTO';

export interface GS_Fatura {
  id: string;
  ar_id: string | null;
  unidade_id: string | null;
  usuario_id: string | null;

  cliente_id: string | null;
  cliente_nome: string;
  cliente_documento: string;
  cliente_email: string | null;
  cliente_telefone: string | null;

  pedido_id: string | null;

  valor_original: number;
  valor_desconto: number;
  valor_total: number;
  taxa_gateway: number;

  descricao: string | null;
  tipo_cobranca: FaturaTipoCobranca;
  parcelas: number;

  data_emissao: string;
  data_vencimento: string;
  data_pagamento: string | null;

  status: FaturaStatus;
  meio_pagamento: FaturaMeioPagamento | null;

  asaas_payment_id: string | null;
  asaas_invoice_url: string | null;
  asaas_pix_code: string | null;
  asaas_bank_slip_url: string | null;
  asaas_card_url: string | null;

  split_gs: number;
  split_ar: number;
  split_ac: number;

  conciliado: boolean;

  // Populated
  cliente_nome_display?: string;
  pedido_numero?: string;
}

// ─── Transações (Livro-Razão) ────────────────────────────────────────────────

export type TransacaoTipo =
  | 'RECEITA_MENSALIDADE'
  | 'RECEITA_TAXA_CERT'
  | 'RECEITA_REPASSE'
  | 'RECEITA_CLIENTE'
  | 'DESPESA_GATEWAY'
  | 'DESPESA_REPASSE'
  | 'ESTORNO'
  | 'REEMBOLSO'
  | 'TAXA_ADMINISTRATIVA';

export interface GS_Transacao {
  id: string;
  tipo: TransacaoTipo;
  descricao: string;
  valor_bruto: number;
  valor_liquido: number;
  valor_taxa: number;

  cobranca_id: string | null;
  fatura_id: string | null;
  assinatura_id: string | null;
  pedido_id: string | null;
  ar_id: string | null;

  asaas_transaction_id: string | null;
  asaas_fee: number | null;

  conciliado: boolean;
  created_at: string;
}

// ─── Taxas Configuráveis ──────────────────────────────────────────────────────

export interface GS_Taxa {
  id: string;
  ar_id: string;
  produto_tipo: string;
  valor_repasse: number;    // Quanto o AR cobra do cliente
  valor_custo: number;      // Custo da AC para o AR
  taxa_gs: number;          // Taxa do GS
  is_active: boolean;
}

// ─── Helpers / Constantes ─────────────────────────────────────────────────────

export const PLANO_NIVEL_LABELS: Record<PlanoNivel, string> = {
  BASICO: 'Básico',
  PROFISSIONAL: 'Profissional',
  ENTERPRISE: 'Enterprise',
};

export const PLANO_NIVEL_COLORS: Record<PlanoNivel, { bg: string; text: string; border: string }> = {
  BASICO:      { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  PROFISSIONAL:{ bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  ENTERPRISE:  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

export const FATURA_STATUS_MAP: Record<FaturaStatus, { label: string; bg: string; text: string; dot: string }> = {
  PENDENTE:    { label: 'Pendente',    bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  VENCIDA:     { label: 'Vencida',     bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-400' },
  PAGA:        { label: 'Paga',        bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  CANCELADA:   { label: 'Cancelada',   bg: 'bg-slate-50',   text: 'text-slate-500',   dot: 'bg-slate-300' },
  REEMBOLSADA: { label: 'Reembolsada', bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-400' },
  PARCIAL:     { label: 'Parcial',     bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-400' },
};

export const ASSINATURA_STATUS_MAP: Record<AssinaturaStatus, { label: string; bg: string; text: string }> = {
  ATIVA:      { label: 'Ativa',      bg: 'bg-emerald-50', text: 'text-emerald-700' },
  CANCELADA:  { label: 'Cancelada',  bg: 'bg-slate-50',   text: 'text-slate-500' },
  EXPIRADA:   { label: 'Expirada',   bg: 'bg-red-50',     text: 'text-red-700' },
  TRIAL:      { label: 'Trial',      bg: 'bg-blue-50',    text: 'text-blue-700' },
  BLOQUEADA:  { label: 'Bloqueada',  bg: 'bg-red-50',     text: 'text-red-700' },
};

export const TRANSACAO_TIPO_MAP: Record<TransacaoTipo, { label: string; icon: string; type: 'receita' | 'despesa' | 'estorno' }> = {
  RECEITA_MENSALIDADE:  { label: 'Mensalidade',     icon: '📋', type: 'receita' },
  RECEITA_TAXA_CERT:    { label: 'Taxa Certificado',icon: '🔐', type: 'receita' },
  RECEITA_REPASSE:      { label: 'Repasse',         icon: '🔄', type: 'receita' },
  RECEITA_CLIENTE:      { label: 'Cliente Final',   icon: '👤', type: 'receita' },
  DESPESA_GATEWAY:      { label: 'Taxa Gateway',    icon: '💳', type: 'despesa' },
  DESPESA_REPASSE:      { label: 'Repasse AR',      icon: '🏦', type: 'despesa' },
  ESTORNO:              { label: 'Estorno',          icon: '↩️', type: 'estorno' },
  REEMBOLSO:            { label: 'Reembolso',        icon: '💰', type: 'estorno' },
  TAXA_ADMINISTRATIVA:  { label: 'Taxa Adm',         icon: '📊', type: 'despesa' },
};

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function gerarDescricaoFatura(
  produto: string,
  nome: string,
  prazo: string
): string {
  return `${produto} - ${nome} - ${prazo}`;
}
