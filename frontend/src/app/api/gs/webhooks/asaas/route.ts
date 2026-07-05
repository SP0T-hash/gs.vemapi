import { NextRequest, NextResponse } from 'next/server';
import { getAsaasClient } from '@/lib/gs/asaas';
import { logAudit } from '@/lib/gs/audit';
import type { FaturaStatus, AssinaturaStatus, GS_Fatura, GS_Transacao, TransacaoTipo } from '@/types/gs/billing';

interface WebhookLog {
  id: string;
  event: string;
  payment_id: string | null;
  subscription_id: string | null;
  status: 'RECEIVED' | 'PROCESSED' | 'ERROR';
  error_message: string | null;
  received_at: string;
  raw_payload: unknown;
}

let faturasDb: GS_Fatura[] = [];
let assinaturasDb: Array<{ id: string; status: AssinaturaStatus; asaas_subscription_id: string | null }> = [];
let transacoesDb: GS_Transacao[] = [];
let webhookLogsDb: WebhookLog[] = [];

let logCounter = 0;

export function setFaturas(faturas: GS_Fatura[]) {
  faturasDb = faturas;
}

export function setAssinaturas(assinaturas: Array<{ id: string; status: AssinaturaStatus; asaas_subscription_id: string | null }>) {
  assinaturasDb = assinaturas;
}

export function setTransacoes(transacoes: GS_Transacao[]) {
  transacoesDb = transacoes;
}

export function getLogs() {
  return webhookLogsDb;
}

function addLog(event: string, paymentId: string | null, subscriptionId: string | null, status: WebhookLog['status'], errorMessage: string | null, rawPayload: unknown) {
  logCounter++;
  webhookLogsDb.push({
    id: `whl-${String(logCounter).padStart(4, '0')}`,
    event,
    payment_id: paymentId,
    subscription_id: subscriptionId,
    status,
    error_message: errorMessage,
    received_at: new Date().toISOString(),
    raw_payload: rawPayload,
  });
  if (webhookLogsDb.length > 500) {
    webhookLogsDb = webhookLogsDb.slice(-250);
  }
}

function updateFaturaByPayment(paymentId: string, updater: (fatura: GS_Fatura) => void) {
  const fatura = faturasDb.find(f => f.asaas_payment_id === paymentId);
  if (fatura) {
    updater(fatura);
    return fatura;
  }
  return null;
}

function createTransacao(data: {
  tipo: TransacaoTipo;
  descricao: string;
  valor_bruto: number;
  valor_liquido: number;
  valor_taxa: number;
  fatura_id: string | null;
  assinatura_id: string | null;
  asaas_transaction_id: string;
  asaas_fee: number | null;
}): GS_Transacao {
  const transacao: GS_Transacao = {
    id: `trans-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tipo: data.tipo,
    descricao: data.descricao,
    valor_bruto: data.valor_bruto,
    valor_liquido: data.valor_liquido,
    valor_taxa: data.valor_taxa,
    cobranca_id: null,
    fatura_id: data.fatura_id,
    assinatura_id: data.assinatura_id,
    pedido_id: null,
    ar_id: 'ar-001',
    asaas_transaction_id: data.asaas_transaction_id,
    asaas_fee: data.asaas_fee,
    conciliado: true,
    created_at: new Date().toISOString(),
  };
  transacoesDb.push(transacao);
  return transacao;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const signature = req.headers.get('x-asaas-signature');
  if (!signature) {
    addLog('VALIDATION_FAILED', null, null, 'ERROR', 'Missing x-asaas-signature header', null);
    return NextResponse.json({ received: false, error: 'Missing signature' }, { status: 401 });
  }

  const client = getAsaasClient();
  const isValid = client.verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    addLog('INVALID_SIGNATURE', null, null, 'ERROR', 'Invalid webhook signature', null);
    return NextResponse.json({ received: false, error: 'Invalid signature' }, { status: 401 });
  }

  let event: ReturnType<typeof client.parseWebhookEvent>;
  try {
    event = client.parseWebhookEvent(rawBody);
  } catch {
    addLog('INVALID_JSON', null, null, 'ERROR', 'Failed to parse webhook body', null);
    return NextResponse.json({ received: false, error: 'Invalid JSON' }, { status: 400 });
  }

  addLog(event.event, event.payment?.id ?? null, event.subscription?.id ?? null, 'RECEIVED', null, event);

  try {
    switch (event.event) {
      case 'PAYMENT_CREATED': {
        addLog(event.event, event.payment?.id ?? null, null, 'PROCESSED', null, null);
        break;
      }

      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED': {
        const p = event.payment;
        if (!p) break;

        const fatura = updateFaturaByPayment(p.id, (f) => {
          f.status = 'PAGA' as FaturaStatus;
          f.data_pagamento = p.paymentDate ?? new Date().toISOString();
          f.conciliado = true;
          if (p.invoiceUrl) f.asaas_invoice_url = p.invoiceUrl;
          if (p.pixQrCode) f.asaas_pix_code = p.pixQrCode;
          if (p.bankSlipUrl) f.asaas_bank_slip_url = p.bankSlipUrl;
        });

        createTransacao({
          tipo: 'RECEITA_CLIENTE',
          descricao: `Pagamento recebido via Asaas - ${p.id}`,
          valor_bruto: p.value,
          valor_liquido: p.netValue,
          valor_taxa: p.value - p.netValue,
          fatura_id: fatura?.id ?? null,
          assinatura_id: p.subscription ?? null,
          asaas_transaction_id: p.id,
          asaas_fee: p.value - p.netValue,
        });

        await logAudit({
          event: 'PAYMENT_RECEIVED',
          severity: 'MEDIUM',
          description: `Pagamento recebido: R$ ${p.value.toFixed(2)} - Asaas ID: ${p.id}`,
          targetId: fatura?.id ?? p.id,
          targetType: 'fatura',
        });

        addLog(event.event, p.id, null, 'PROCESSED', null, null);
        break;
      }

      case 'PAYMENT_OVERDUE': {
        const p = event.payment;
        if (!p) break;

        updateFaturaByPayment(p.id, (f) => {
          if (f.status !== 'PAGA') {
            f.status = 'VENCIDA' as FaturaStatus;
          }
        });

        addLog(event.event, p.id, null, 'PROCESSED', null, null);
        break;
      }

      case 'PAYMENT_REFUNDED': {
        const p = event.payment;
        if (!p) break;

        updateFaturaByPayment(p.id, (f) => {
          f.status = 'REEMBOLSADA' as FaturaStatus;
          f.conciliado = false;
        });

        createTransacao({
          tipo: 'REEMBOLSO',
          descricao: `Reembolso Asaas - ${p.id}`,
          valor_bruto: -p.value,
          valor_liquido: -(p.netValue),
          valor_taxa: 0,
          fatura_id: null,
          assinatura_id: null,
          asaas_transaction_id: p.id,
          asaas_fee: null,
        });

        await logAudit({
          event: 'PAYMENT_REFUNDED',
          severity: 'HIGH',
          description: `Reembolso processado: R$ ${p.value.toFixed(2)} - Asaas ID: ${p.id}`,
          targetId: p.id,
          targetType: 'payment',
        });

        addLog(event.event, p.id, null, 'PROCESSED', null, null);
        break;
      }

      case 'PAYMENT_DELETED': {
        const p = event.payment;
        if (!p) break;

        updateFaturaByPayment(p.id, (f) => {
          f.status = 'CANCELADA' as FaturaStatus;
          f.conciliado = false;
        });

        addLog(event.event, p.id, null, 'PROCESSED', null, null);
        break;
      }

      case 'SUBSCRIPTION_CREATED': {
        const sub = event.subscription;
        if (!sub) break;

        const assinatura = assinaturasDb.find(a => a.asaas_subscription_id === sub.id);
        if (assinatura) {
          assinatura.status = 'ATIVA';
        }

        addLog(event.event, null, sub.id, 'PROCESSED', null, null);
        break;
      }

      case 'SUBSCRIPTION_CANCELLED': {
        const sub = event.subscription;
        if (!sub) break;

        const assinatura = assinaturasDb.find(a => a.asaas_subscription_id === sub.id);
        if (assinatura) {
          assinatura.status = 'CANCELADA';
        }

        addLog(event.event, null, sub.id, 'PROCESSED', null, null);
        break;
      }

      case 'SUBSCRIPTION_EXPIRED': {
        const sub = event.subscription;
        if (!sub) break;

        const assinatura = assinaturasDb.find(a => a.asaas_subscription_id === sub.id);
        if (assinatura) {
          assinatura.status = 'EXPIRADA';
        }

        addLog(event.event, null, sub.id, 'PROCESSED', null, null);
        break;
      }

      default: {
        addLog(event.event, event.payment?.id ?? null, event.subscription?.id ?? null, 'PROCESSED', `Unhandled event type: ${event.event}`, null);
        break;
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    addLog(event.event, event.payment?.id ?? null, event.subscription?.id ?? null, 'ERROR', errorMsg, null);
  }

  return NextResponse.json({ received: true });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10));
  const event = searchParams.get('event');

  let logs = [...webhookLogsDb].reverse();
  if (event) {
    logs = logs.filter(l => l.event === event);
  }

  return NextResponse.json({
    data: logs.slice(0, limit),
    total: logs.length,
  });
}
