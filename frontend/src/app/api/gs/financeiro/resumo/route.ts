import { NextRequest, NextResponse } from 'next/server';
import type { GS_Fatura, GS_Transacao } from '@/types/gs/billing';

const mockFaturas: GS_Fatura[] = [
  {
    id: 'fat-001', ar_id: 'ar-001', unidade_id: null, usuario_id: 'usr-001',
    cliente_id: 'cli-001', cliente_nome: 'Maria Silva', cliente_documento: '123.456.789-00',
    cliente_email: 'maria@email.com', cliente_telefone: null,
    pedido_id: 'ped-001',
    valor_original: 180, valor_desconto: 0, valor_total: 180, taxa_gateway: 3.60,
    descricao: 'Certificado PF A1 - Maria Silva', tipo_cobranca: 'UNICA', parcelas: 1,
    data_emissao: '2026-07-01T10:00:00Z', data_vencimento: '2026-07-15', data_pagamento: null,
    status: 'PENDENTE', meio_pagamento: 'PIX',
    asaas_payment_id: null, asaas_invoice_url: null, asaas_pix_code: null,
    asaas_bank_slip_url: null, asaas_card_url: null,
    split_gs: 18, split_ar: 162, split_ac: 0, conciliado: false,
  },
  {
    id: 'fat-002', ar_id: 'ar-001', unidade_id: null, usuario_id: 'usr-001',
    cliente_id: 'cli-002', cliente_nome: 'TechSolutions Ltda', cliente_documento: '00.000.000/0001-00',
    cliente_email: 'financeiro@techsolutions.com.br', cliente_telefone: null,
    pedido_id: 'ped-003',
    valor_original: 450, valor_desconto: 45, valor_total: 405, taxa_gateway: 8.10,
    descricao: 'Certificado PJ A1 - TechSolutions Ltda', tipo_cobranca: 'UNICA', parcelas: 1,
    data_emissao: '2026-06-28T14:30:00Z', data_vencimento: '2026-07-28', data_pagamento: null,
    status: 'PENDENTE', meio_pagamento: 'BOLETO',
    asaas_payment_id: 'pay_abc123', asaas_invoice_url: 'https://www.asaas.com/cobranca/abc123',
    asaas_pix_code: null, asaas_bank_slip_url: 'https://www.asaas.com/boleto/abc123',
    asaas_card_url: null, split_gs: 40.50, split_ar: 364.50, split_ac: 0, conciliado: false,
  },
  {
    id: 'fat-003', ar_id: 'ar-001', unidade_id: null, usuario_id: 'usr-002',
    cliente_id: 'cli-003', cliente_nome: 'João Santos', cliente_documento: '987.654.321-00',
    cliente_email: 'joao@email.com', cliente_telefone: null,
    pedido_id: 'ped-002',
    valor_original: 250, valor_desconto: 0, valor_total: 250, taxa_gateway: 0,
    descricao: 'Certificado PF A3 - João Santos', tipo_cobranca: 'UNICA', parcelas: 1,
    data_emissao: '2026-06-15T09:00:00Z', data_vencimento: '2026-06-15',
    data_pagamento: '2026-06-15T09:05:00Z',
    status: 'PAGA', meio_pagamento: 'PIX',
    asaas_payment_id: 'pay_def456', asaas_invoice_url: 'https://www.asaas.com/cobranca/def456',
    asaas_pix_code: '00020126580014br.gov.bcb.pix0136...',
    asaas_bank_slip_url: null, asaas_card_url: null,
    split_gs: 25, split_ar: 225, split_ac: 0, conciliado: true,
  },
  {
    id: 'fat-004', ar_id: 'ar-001', unidade_id: null, usuario_id: 'usr-001',
    cliente_id: null, cliente_nome: 'Ana Oliveira', cliente_documento: '456.789.123-00',
    cliente_email: 'ana@email.com', cliente_telefone: null,
    pedido_id: 'ped-004',
    valor_original: 180, valor_desconto: 0, valor_total: 180, taxa_gateway: 3.60,
    descricao: 'Certificado PF A1 - Ana Oliveira', tipo_cobranca: 'UNICA', parcelas: 1,
    data_emissao: '2026-07-03T08:00:00Z', data_vencimento: '2026-07-18', data_pagamento: null,
    status: 'PENDENTE', meio_pagamento: 'CARTAO',
    asaas_payment_id: 'pay_ghi789', asaas_invoice_url: 'https://www.asaas.com/cobranca/ghi789',
    asaas_pix_code: null, asaas_bank_slip_url: null, asaas_card_url: 'https://www.asaas.com/card/ghi789',
    split_gs: 18, split_ar: 162, split_ac: 0, conciliado: false,
  },
];

const mockTransacoes: GS_Transacao[] = [
  {
    id: 'trans-001', tipo: 'RECEITA_CLIENTE',
    descricao: 'Pagamento - Certificado PF A3 - João Santos',
    valor_bruto: 250, valor_liquido: 247.50, valor_taxa: 2.50,
    cobranca_id: null, fatura_id: 'fat-003', assinatura_id: null, pedido_id: 'ped-002', ar_id: 'ar-001',
    asaas_transaction_id: 'pay_def456', asaas_fee: 2.50,
    conciliado: true, created_at: '2026-06-15T09:05:00Z',
  },
  {
    id: 'trans-002', tipo: 'RECEITA_MENSALIDADE',
    descricao: 'Mensalidade Julho/2026 - Plano Profissional',
    valor_bruto: 197, valor_liquido: 177.30, valor_taxa: 19.70,
    cobranca_id: 'cob-001', fatura_id: null, assinatura_id: 'assin-001', pedido_id: null, ar_id: 'ar-001',
    asaas_transaction_id: 'pay_mensal_001', asaas_fee: 19.70,
    conciliado: true, created_at: '2026-07-01T00:00:00Z',
  },
  {
    id: 'trans-003', tipo: 'DESPESA_GATEWAY',
    descricao: 'Taxa Asaas - Junho/2026',
    valor_bruto: 0, valor_liquido: 0, valor_taxa: 12.30,
    cobranca_id: null, fatura_id: null, assinatura_id: null, pedido_id: null, ar_id: 'ar-001',
    asaas_transaction_id: null, asaas_fee: null,
    conciliado: true, created_at: '2026-06-30T23:59:00Z',
  },
  {
    id: 'trans-004', tipo: 'DESPESA_REPASSE',
    descricao: 'Repasse AR - Junho/2026',
    valor_bruto: 0, valor_liquido: 0, valor_taxa: 0,
    cobranca_id: null, fatura_id: null, assinatura_id: null, pedido_id: null, ar_id: 'ar-001',
    asaas_transaction_id: null, asaas_fee: null,
    conciliado: true, created_at: '2026-06-30T23:59:00Z',
  },
];

export async function GET(_req: NextRequest) {
  const totalFaturas = mockFaturas.length;
  const totalPagas = mockFaturas.filter(f => f.status === 'PAGA').length;
  const totalPendentes = mockFaturas.filter(f => f.status === 'PENDENTE' || f.status === 'VENCIDA').length;

  const receitaMes = mockTransacoes
    .filter(t => t.tipo.startsWith('RECEITA') && t.created_at.startsWith('2026-07'))
    .reduce((sum, t) => sum + t.valor_liquido, 0);

  const aReceber = mockFaturas
    .filter(f => f.status === 'PENDENTE' || f.status === 'VENCIDA')
    .reduce((sum, f) => sum + f.valor_total, 0);

  const repassesAR = mockTransacoes
    .filter(t => t.tipo === 'DESPESA_REPASSE')
    .reduce((sum, t) => sum + t.valor_taxa, 0);

  const taxasGateway = mockTransacoes
    .filter(t => t.tipo === 'DESPESA_GATEWAY')
    .reduce((sum, t) => sum + t.valor_taxa, 0);

  const totalReceita = mockTransacoes
    .filter(t => t.tipo.startsWith('RECEITA'))
    .reduce((sum, t) => sum + t.valor_liquido, 0);

  const totalDespesas = mockTransacoes
    .filter(t => t.tipo.startsWith('DESPESA'))
    .reduce((sum, t) => sum + t.valor_taxa, 0);

  const totalRepasses = repassesAR;
  const saldoLiquido = totalReceita - totalDespesas - totalRepasses;

  return NextResponse.json({
    receitaMes,
    aReceber,
    repassesAR,
    taxasGateway,
    faturasRecentes: mockFaturas.sort((a, b) => new Date(b.data_emissao).getTime() - new Date(a.data_emissao).getTime()),
    resumo: {
      totalReceita,
      totalDespesas,
      totalRepasses,
      saldoLiquido,
    },
    transacoes: mockTransacoes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    totalFaturas,
    totalPagas,
    totalPendentes,
  });
}
