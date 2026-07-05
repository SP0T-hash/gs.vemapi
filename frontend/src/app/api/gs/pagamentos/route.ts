import { NextRequest, NextResponse } from 'next/server';
import { getAsaasClient } from '@/lib/gs/asaas';
import type { GS_Fatura, GS_Transacao, TransacaoTipo } from '@/types/gs/billing';

let faturasDb: GS_Fatura[] = [];
let transacoesDb: GS_Transacao[] = [];

export function setFaturas(faturas: GS_Fatura[]) {
  faturasDb = faturas;
}

export function setTransacoes(transacoes: GS_Transacao[]) {
  transacoesDb = transacoes;
}

export function getFaturas() {
  return faturasDb;
}

export function getTransacoes() {
  return transacoesDb;
}

// ─── POST /api/gs/pagamentos — Create Asaas payment ───────────────────────
export async function POST(req: NextRequest) {
  let body: { faturaId: string; billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  if (!body.faturaId || !body.billingType) {
    return NextResponse.json({ error: 'Campos obrigatórios: faturaId, billingType' }, { status: 400 });
  }

  if (!['PIX', 'BOLETO', 'CREDIT_CARD'].includes(body.billingType)) {
    return NextResponse.json({ error: 'billingType deve ser PIX, BOLETO ou CREDIT_CARD' }, { status: 400 });
  }

  const fatura = faturasDb.find(f => f.id === body.faturaId);
  if (!fatura) {
    return NextResponse.json({ error: 'Fatura não encontrada.' }, { status: 404 });
  }

  if (fatura.status === 'PAGA') {
    return NextResponse.json({ error: 'Fatura já está paga.', fatura }, { status: 409 });
  }

  if (fatura.asaas_payment_id) {
    return NextResponse.json({
      error: 'Já existe um pagamento para esta fatura.',
      fatura,
      payment_id: fatura.asaas_payment_id,
      invoice_url: fatura.asaas_invoice_url,
    }, { status: 409 });
  }

  try {
    const client = getAsaasClient();

    // 1. Find or create customer in Asaas
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
          phone: fatura.cliente_telefone ?? undefined,
        });
        customerId = created.id;
      }
    } catch {
      return NextResponse.json({ error: 'Erro ao criar/buscar cliente no Asaas.' }, { status: 502 });
    }

    // 2. Build split config
    const walletId = process.env.ASAAS_WALLET_ID;
    const split = walletId
      ? {
          walletId,
          percentualValue: 100,
        }
      : undefined;

    // 3. Create payment in Asaas
    const payment = await client.createPayment({
      customer: customerId,
      billingType: body.billingType,
      value: fatura.valor_total,
      dueDate: fatura.data_vencimento,
      description: fatura.descricao ?? undefined,
      externalReference: fatura.id,
      split: split ? [split] : undefined,
    });

    // 4. Fetch Pix QR Code if Pix
    let pixCode: string | null = null;
    let pixQrCode: string | null = null;
    if (body.billingType === 'PIX' && payment.id) {
      try {
        const pixData = await client.getPixQrCode(payment.id);
        pixCode = pixData.payload;
        pixQrCode = pixData.encodedImage;
      } catch {
        // Pix QR code may not be available immediately
      }
    }

    // 5. Update fatura with Asaas data
    fatura.asaas_payment_id = payment.id;
    fatura.asaas_invoice_url = payment.invoiceUrl ?? null;
    fatura.asaas_bank_slip_url = payment.bankSlipUrl ?? null;
    fatura.asaas_pix_code = pixCode;
    fatura.asaas_card_url = body.billingType === 'CREDIT_CARD' ? payment.invoiceUrl : null;
    fatura.meio_pagamento = mapBillingToMeioPagamento(body.billingType);

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        billingType: payment.billingType,
        value: payment.value,
        status: payment.status,
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
        pixCopiaECola: pixCode,
        pixQrCode,
        dueDate: payment.dueDate,
      },
      fatura_id: fatura.id,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: `Falha ao criar pagamento: ${msg}` }, { status: 502 });
  }
}

// ─── GET /api/gs/pagamentos — Get payment status ─────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const faturaId = searchParams.get('faturaId');
  const paymentId = searchParams.get('paymentId');

  try {
    const client = getAsaasClient();

    if (paymentId) {
      const payment = await client.getPayment(paymentId);
      return NextResponse.json({
        payment: {
          id: payment.id,
          status: payment.status,
          value: payment.value,
          netValue: payment.netValue,
          billingType: payment.billingType,
          invoiceUrl: payment.invoiceUrl,
          bankSlipUrl: payment.bankSlipUrl,
          pixCopiaECola: payment.pixCopiaECola,
          dueDate: payment.dueDate,
          paymentDate: payment.paymentDate,
        },
        fatura: faturaId ? faturasDb.find(f => f.id === faturaId) ?? null : null,
      });
    }

    if (faturaId) {
      const fatura = faturasDb.find(f => f.id === faturaId);
      if (!fatura) {
        return NextResponse.json({ error: 'Fatura não encontrada.' }, { status: 404 });
      }
      if (!fatura.asaas_payment_id) {
        return NextResponse.json({ error: 'Nenhum pagamento associado a esta fatura.', fatura });
      }
      const payment = await client.getPayment(fatura.asaas_payment_id);
      return NextResponse.json({
        payment: {
          id: payment.id,
          status: payment.status,
          value: payment.value,
          netValue: payment.netValue,
          billingType: payment.billingType,
          invoiceUrl: payment.invoiceUrl,
          bankSlipUrl: payment.bankSlipUrl,
          pixCopiaECola: payment.pixCopiaECola,
          dueDate: payment.dueDate,
          paymentDate: payment.paymentDate,
        },
        fatura,
      });
    }

    // List all recent payments from Asaas
    const result = await client.listPayments({ limit: 20 });
    return NextResponse.json({
      data: result.data.map(p => ({
        id: p.id,
        status: p.status,
        value: p.value,
        billingType: p.billingType,
        invoiceUrl: p.invoiceUrl,
        customer: p.customer,
        dueDate: p.dueDate,
      })),
      total: result.total,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: `Falha ao consultar pagamento: ${msg}` }, { status: 502 });
  }
}

// ─── POST /api/gs/pagamentos/estornar — Refund a payment ────────────────
export async function PUT(req: NextRequest) {
  let body: { faturaId: string; paymentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  if (!body.faturaId) {
    return NextResponse.json({ error: 'Campo obrigatório: faturaId' }, { status: 400 });
  }

  const fatura = faturasDb.find(f => f.id === body.faturaId);
  if (!fatura) {
    return NextResponse.json({ error: 'Fatura não encontrada.' }, { status: 404 });
  }

  const paymentId = body.paymentId ?? fatura.asaas_payment_id;
  if (!paymentId) {
    return NextResponse.json({ error: 'Nenhum pagamento para estornar.' }, { status: 400 });
  }

  try {
    const client = getAsaasClient();
    const refunded = await client.refundPayment(paymentId);

    fatura.status = 'REEMBOLSADA';
    fatura.conciliado = false;

    const transacao: GS_Transacao = {
      id: `trans-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tipo: 'REEMBOLSO',
      descricao: `Estorno via Asaas - ${paymentId}`,
      valor_bruto: -refunded.value,
      valor_liquido: -(refunded.netValue),
      valor_taxa: 0,
      cobranca_id: null,
      fatura_id: fatura.id,
      assinatura_id: null,
      pedido_id: null,
      ar_id: 'ar-001',
      asaas_transaction_id: paymentId,
      asaas_fee: null,
      conciliado: true,
      created_at: new Date().toISOString(),
    };
    transacoesDb.push(transacao);

    return NextResponse.json({
      success: true,
      refund: {
        id: refunded.id,
        status: refunded.status,
        value: refunded.value,
      },
      fatura,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: `Falha ao estornar pagamento: ${msg}` }, { status: 502 });
  }
}

function mapBillingToMeioPagamento(billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD'): 'PIX' | 'BOLETO' | 'CARTAO' {
  switch (billingType) {
    case 'PIX': return 'PIX';
    case 'BOLETO': return 'BOLETO';
    case 'CREDIT_CARD': return 'CARTAO';
  }
}
