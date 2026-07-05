import { NextRequest, NextResponse } from 'next/server';
import { AsaasClient } from '@/lib/gs/asaas';

export async function GET(_req: NextRequest) {
  const testApiKey = process.env.ASAAS_API_KEY;
  if (!testApiKey) {
    return NextResponse.json({
      success: false,
      error: 'ASAAS_API_KEY não configurada no servidor.',
      configured: false,
    }, { status: 200 });
  }

  try {
    const environment = process.env.ASAAS_ENVIRONMENT ?? 'sandbox';
    const walletId = process.env.ASAAS_WALLET_ID ?? '';

    const client = new AsaasClient(testApiKey, environment, walletId);
    const balance = await client.getWalletBalance();

    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? `http://${_req.headers.get('host') ?? 'localhost:3000'}`;
    const webhookUrl = `${baseUrl.replace(/\/api\/gs$/, '')}/api/gs/webhooks/asaas`;

    return NextResponse.json({
      success: true,
      balance: balance.balance,
      webhookUrl,
      environment,
      walletId: walletId || null,
      configured: true,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({
      success: false,
      error: `Falha ao conectar com Asaas: ${msg}`,
      configured: true,
    }, { status: 200 });
  }
}
