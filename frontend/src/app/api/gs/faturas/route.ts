import { NextRequest, NextResponse } from 'next/server';
import { getAsaasClient } from '@/lib/gs/asaas';
import type { GS_Fatura } from '@/types/gs/billing';

const mockFaturas: GS_Fatura[] = [
  {
    id: 'fat-001',
    ar_id: 'ar-001',
    unidade_id: null,
    usuario_id: 'usr-001',
    cliente_id: 'cli-001',
    cliente_nome: 'Maria Silva',
    cliente_documento: '123.456.789-00',
    cliente_email: 'maria@email.com',
    cliente_telefone: '(11) 99999-0001',
    pedido_id: 'ped-001',
    valor_original: 180.00,
    valor_desconto: 0,
    valor_total: 180.00,
    taxa_gateway: 3.60,
    descricao: 'Certificado PF A1 - Maria Silva - 12 meses',
    tipo_cobranca: 'UNICA',
    parcelas: 1,
    data_emissao: '2026-07-01T10:00:00Z',
    data_vencimento: '2026-07-15',
    data_pagamento: null,
    status: 'PENDENTE',
    meio_pagamento: 'PIX',
    asaas_payment_id: null,
    asaas_invoice_url: null,
    asaas_pix_code: null,
    asaas_bank_slip_url: null,
    asaas_card_url: null,
    split_gs: 18.00,
    split_ar: 162.00,
    split_ac: 0,
    conciliado: false,
  },
  {
    id: 'fat-002',
    ar_id: 'ar-001',
    unidade_id: null,
    usuario_id: 'usr-001',
    cliente_id: 'cli-002',
    cliente_nome: 'TechSolutions Ltda',
    cliente_documento: '00.000.000/0001-00',
    cliente_email: 'financeiro@techsolutions.com.br',
    cliente_telefone: '(11) 3000-0000',
    pedido_id: 'ped-003',
    valor_original: 450.00,
    valor_desconto: 45.00,
    valor_total: 405.00,
    taxa_gateway: 8.10,
    descricao: 'Certificado PJ A1 - TechSolutions Ltda - 12 meses',
    tipo_cobranca: 'UNICA',
    parcelas: 1,
    data_emissao: '2026-06-28T14:30:00Z',
    data_vencimento: '2026-07-28',
    data_pagamento: null,
    status: 'PENDENTE',
    meio_pagamento: 'BOLETO',
    asaas_payment_id: 'pay_abc123',
    asaas_invoice_url: 'https://www.asaas.com/cobranca/abc123',
    asaas_pix_code: null,
    asaas_bank_slip_url: 'https://www.asaas.com/boleto/abc123',
    asaas_card_url: null,
    split_gs: 40.50,
    split_ar: 364.50,
    split_ac: 0,
    conciliado: false,
  },
  {
    id: 'fat-003',
    ar_id: 'ar-001',
    unidade_id: null,
    usuario_id: 'usr-002',
    cliente_id: 'cli-003',
    cliente_nome: 'João Santos',
    cliente_documento: '987.654.321-00',
    cliente_email: 'joao@email.com',
    cliente_telefone: null,
    pedido_id: 'ped-002',
    valor_original: 250.00,
    valor_desconto: 0,
    valor_total: 250.00,
    taxa_gateway: 0,
    descricao: 'Certificado PF A3 - João Santos - 36 meses',
    tipo_cobranca: 'UNICA',
    parcelas: 1,
    data_emissao: '2026-06-15T09:00:00Z',
    data_vencimento: '2026-06-15',
    data_pagamento: '2026-06-15T09:05:00Z',
    status: 'PAGA',
    meio_pagamento: 'PIX',
    asaas_payment_id: 'pay_def456',
    asaas_invoice_url: 'https://www.asaas.com/cobranca/def456',
    asaas_pix_code: '00020126580014br.gov.bcb.pix0136...',
    asaas_bank_slip_url: null,
    asaas_card_url: null,
    split_gs: 25.00,
    split_ar: 225.00,
    split_ac: 0,
    conciliado: true,
  },
];

let faturasDb = [...mockFaturas];

function generateFaturaNumber(): string {
  const year = new Date().getFullYear();
  const lastNum = faturasDb
    .filter(f => f.id.startsWith('fat-'))
    .reduce((max, f) => {
      const num = parseInt(f.id.replace('fat-', ''), 10);
      return num > max ? num : max;
    }, 0);
  const next = lastNum + 1;
  return `FAT-${year}-${String(next).padStart(4, '0')}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));

  let filtered = [...faturasDb];
  if (status) {
    filtered = filtered.filter(f => f.status === status);
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  return NextResponse.json({ data, total, page, totalPages });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const requiredFields = ['cliente_nome', 'cliente_documento', 'descricao', 'valor_original', 'data_vencimento'];
  for (const field of requiredFields) {
    if (!body[field]) {
      return NextResponse.json({ error: `Campo obrigatório: ${field}` }, { status: 400 });
    }
  }

  const faturaId = `fat-${String(faturasDb.length + 1).padStart(3, '0')}`;
  const invoiceNumber = generateFaturaNumber();
  const billingType = body.billingType as 'PIX' | 'BOLETO' | 'CREDIT_CARD' | undefined;

  const fatura: GS_Fatura = {
    id: faturaId,
    ar_id: 'ar-001',
    unidade_id: null,
    usuario_id: 'usr-001',
    cliente_id: (body.cliente_id as string) ?? null,
    cliente_nome: body.cliente_nome as string,
    cliente_documento: body.cliente_documento as string,
    cliente_email: (body.cliente_email as string) ?? null,
    cliente_telefone: null,
    pedido_id: (body.pedido_id as string) ?? null,
    valor_original: Number(body.valor_original),
    valor_desconto: Number(body.valor_desconto ?? 0),
    valor_total: Number(body.valor_original) - Number(body.valor_desconto ?? 0),
    taxa_gateway: Math.round(Number(body.valor_original) * 0.02 * 100) / 100,
    descricao: body.descricao as string,
    tipo_cobranca: (body.parcelas && Number(body.parcelas) > 1) ? 'PARCELAMENTO' : 'UNICA',
    parcelas: Number(body.parcelas ?? 1),
    data_emissao: new Date().toISOString(),
    data_vencimento: body.data_vencimento as string,
    data_pagamento: null,
    status: 'PENDENTE',
    meio_pagamento: (body.meio_pagamento as GS_Fatura['meio_pagamento']) ?? null,
    asaas_payment_id: null,
    asaas_invoice_url: null,
    asaas_pix_code: null,
    asaas_bank_slip_url: null,
    asaas_card_url: null,
    split_gs: Math.round((Number(body.valor_original) - Number(body.valor_desconto ?? 0)) * 0.1 * 100) / 100,
    split_ar: Math.round((Number(body.valor_original) - Number(body.valor_desconto ?? 0)) * 0.9 * 100) / 100,
    split_ac: 0,
    conciliado: false,
  };

  let paymentUrl: string | undefined;

  if (billingType) {
    try {
      const client = getAsaasClient();

      let customerId: string;
      try {
        const existing = await client.findCustomer(fatura.cliente_documento);
        if (existing) {
          customerId = existing.id;
        } else {
          const created = await client.createCustomer({
            name: fatura.cliente_nome,
            email: fatura.cliente_email ?? '',
            cpfCnpj: fatura.cliente_documento,
          });
          customerId = created.id;
        }
      } catch {
        return NextResponse.json({
          success: true,
          fatura: { ...fatura, numero: invoiceNumber },
          warning: 'Fatura criada, mas falha ao conectar no Asaas. Configure a integração.',
        }, { status: 201 });
      }

      const walletId = process.env.ASAAS_WALLET_ID;
      const split = walletId ? { walletId, percentualValue: 100 } : undefined;

      const payment = await client.createPayment({
        customer: customerId,
        billingType,
        value: fatura.valor_total,
        dueDate: fatura.data_vencimento,
        description: fatura.descricao ?? undefined,
        externalReference: fatura.id,
        split: split ? [split] : undefined,
      });

      let pixCode: string | null = null;
      if (billingType === 'PIX' && payment.id) {
        try {
          const pixData = await client.getPixQrCode(payment.id);
          pixCode = pixData.payload;
        } catch {
          // Pix QR not available yet
        }
      }

      fatura.asaas_payment_id = payment.id;
      fatura.asaas_invoice_url = payment.invoiceUrl ?? null;
      fatura.asaas_bank_slip_url = payment.bankSlipUrl ?? null;
      fatura.asaas_pix_code = pixCode;
      fatura.asaas_card_url = billingType === 'CREDIT_CARD' ? payment.invoiceUrl : null;
      fatura.meio_pagamento = mapBillingToMeioPagamento(billingType);

      paymentUrl = payment.invoiceUrl ?? payment.bankSlipUrl ?? undefined;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro';
      return NextResponse.json({
        success: true,
        fatura: { ...fatura, numero: invoiceNumber },
        warning: `Fatura criada, mas pagamento Asaas falhou: ${msg}`,
      }, { status: 201 });
    }
  }

  faturasDb.push(fatura);

  return NextResponse.json({
    success: true,
    fatura: { ...fatura, numero: invoiceNumber },
    payment_url: paymentUrl,
  }, { status: 201 });
}

function mapBillingToMeioPagamento(billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD'): 'PIX' | 'BOLETO' | 'CARTAO' {
  switch (billingType) {
    case 'PIX': return 'PIX';
    case 'BOLETO': return 'BOLETO';
    case 'CREDIT_CARD': return 'CARTAO';
  }
}
