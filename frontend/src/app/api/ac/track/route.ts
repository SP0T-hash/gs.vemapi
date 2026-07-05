/**
 * Rota pública de Acompanhamento de Protocolo
 *
 * Cliente informa protocolo + CPF (últimos 4 dígitos) e recebe
 * dados não-sensíveis do andamento do seu certificado digital.
 *
 * LGPD Art. 6º — Princípio da Necessidade: apenas dados mínimos
 * para cumprir a finalidade de acompanhamento são expostos.
 * ICP-Brasil DOC-ICP-05: identificação do requerente.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Valida ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('[TRACK] Variáveis de ambiente ausentes: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = supabaseUrl && serviceKey
  ? createClient(supabaseUrl, serviceKey)
  : null;

// Cache de respostas para evitar abusos (rate-limit simples em memória)
const requestCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30_000; // 30 segundos
const RATE_LIMIT_WINDOW = 60_000; // 1 minuto
const MAX_REQUESTS_PER_IP = 20;

const ipCounters = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounters.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    ipCounters.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= MAX_REQUESTS_PER_IP) {
    return false;
  }

  entry.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    // ── 1. Rate Limit por IP ──────────────────────────────────────────
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { erro: 'Muitas requisições. Tente novamente em alguns minutos.' },
        { status: 429 }
      );
    }

    // ── 2. Validar parâmetros ─────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const protocolo = searchParams.get('protocolo')?.trim().toUpperCase();
    const cpfDigitos = searchParams.get('cpf')?.replace(/\D/g, '');

    if (!protocolo || !cpfDigitos) {
      return NextResponse.json(
        { erro: 'Informe o número do protocolo e os últimos 4 dígitos do CPF.' },
        { status: 400 }
      );
    }

    if (cpfDigitos.length !== 4 && cpfDigitos.length !== 11) {
      return NextResponse.json(
        { erro: 'Informe o CPF completo ou os últimos 4 dígitos.' },
        { status: 400 }
      );
    }

    // ── 3. Verificar cache ────────────────────────────────────────────
    const cacheKey = `${protocolo}:${cpfDigitos}`;
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // ── 4. Buscar protocolo no banco ──────────────────────────────────
    if (!supabase) {
      return NextResponse.json(
        { erro: 'Serviço temporariamente indisponível.' },
        { status: 503 }
      );
    }

    const { data: protocol, error } = await supabase
      .from('protocols')
      .select(`
        protocol_number,
        status,
        cert_type,
        holder_nome,
        holder_cpf,
        holder_email,
        created_at,
        updated_at,
        biometry_status,
        cert_issued_at,
        agr_id,
        agr:agr_users!protocols_agr_id_fkey ( nome, email )
      `)
      .eq('protocol_number', protocolo)
      .single();

    if (error || !protocol) {
      return NextResponse.json(
        { erro: 'Protocolo não encontrado.' },
        { status: 404 }
      );
    }

    // ── 5. Validar CPF (parcial ou completo) ───────────────────────────
    const cpfTitular = protocol.holder_cpf?.replace(/\D/g, '') ?? '';
    if (cpfDigitos.length === 4) {
      if (!cpfTitular.endsWith(cpfDigitos)) {
        return NextResponse.json(
          { erro: 'Protocolo e CPF não conferem.' },
          { status: 403 }
        );
      }
    } else if (cpfDigitos !== cpfTitular) {
      return NextResponse.json(
        { erro: 'Protocolo e CPF não conferem.' },
        { status: 403 }
      );
    }

    // ── 6. Montar a timeline (a partir dos dados disponíveis) ──────────
    const timeline = buildTimeline(protocol);

    // ── 7. Montar resposta (LGPD: apenas dados necessários) ─────────────
    const maskedCpf = maskCpf(cpfTitular);
    const trackingData = {
      protocolo: protocol.protocol_number,
      status: mapStatus(protocol.status),
      statusLabel: getStatusLabel(mapStatus(protocol.status)),
      produto: protocol.cert_type,
      tipoCertificado: protocol.cert_type?.includes('A1') ? 'A1'
        : protocol.cert_type?.includes('A3') ? 'A3' : 'NUVEM',
      titular: {
        nome: protocol.holder_nome,
        documento: maskedCpf,
      },
      agente: protocol.agr && Array.isArray(protocol.agr) && protocol.agr.length > 0 ? {
        nome: (protocol.agr as Array<{ nome: string; email: string }>)[0].nome,
        email: (protocol.agr as Array<{ nome: string; email: string }>)[0].email,
      } : undefined,
      prazos: {
        pedidoEm: protocol.created_at,
        previsaoConclusao: protocol.cert_issued_at ?? undefined,
        atualizadoEm: protocol.updated_at,
      },
      timeline,
      mensagens: getStatusMessages(mapStatus(protocol.status)),
    };

    // ── 8. Salvar em cache e retornar ──────────────────────────────────
    requestCache.set(cacheKey, { data: trackingData, timestamp: Date.now() });

    return NextResponse.json(trackingData, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    console.error('[TRACK] Erro interno:', err);
    return NextResponse.json(
      { erro: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapStatus(dbStatus: string): import('@/types/tracking.types').ClientStatus {
  const statusMap: Record<string, import('@/types/tracking.types').ClientStatus> = {
    PENDING:             'DOCUMENTOS_EM_ANALISE',
    IN_PROGRESS:         'EM_ATENDIMENTO',
    BIOMETRY_OK:         'VIDEOCONFERENCIA_AGENDADA',
    BIOMETRY_FAIL:       'DOCUMENTOS_REJEITADOS',
    ISSUED:              'CERTIFICADO_EMITIDO',
    CANCELLED:           'CANCELADO',
    ERROR:               'ERRO',
  };
  return statusMap[dbStatus] ?? 'PEDIDO_RECEBIDO';
}

// Mapa de labels inline para evitar require() no Edge Runtime
const STATUS_LABELS: Record<string, string> = {
  PEDIDO_RECEBIDO: 'Pedido Recebido',
  DOCUMENTOS_EM_ANALISE: 'Documentos em Análise',
  DOCUMENTOS_APROVADOS: 'Documentos Aprovados',
  DOCUMENTOS_REJEITADOS: 'Documentos Rejeitados',
  AGUARDANDO_VIDEOCONFERENCIA: 'Aguardando Videoconferência',
  VIDEOCONFERENCIA_AGENDADA: 'Videoconferência Agendada',
  EM_ATENDIMENTO: 'Em Atendimento',
  EMISSAO_PROTOCOLO_AC: 'Emitindo na AC',
  CERTIFICADO_EMITIDO: 'Certificado Emitido!',
  CERTIFICADO_ENTREGUE: 'Certificado Entregue',
  CANCELADO: 'Cancelado',
  ERRO: 'Erro na Emissão',
};

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function buildTimeline(protocol: Record<string, unknown>) {
  const events: Array<{
    type: string;
    title: string;
    description: string;
    ocorridoEm: string;
    isError: boolean;
    isCurrent: boolean;
  }> = [];

  // Evento 1: Pedido recebido
  events.push({
    type: 'PEDIDO_RECEBIDO',
    title: 'Pedido Recebido',
    description: 'Seu pedido de certificado digital foi recebido com sucesso.',
    ocorridoEm: protocol.created_at as string,
    isError: false,
    isCurrent: false,
  });

  // Evento 2: Dependendo do status
  const status = protocol.status as string;
  if (['IN_PROGRESS', 'BIOMETRY_OK', 'BIOMETRY_FAIL', 'ISSUED', 'CANCELLED', 'ERROR'].includes(status)) {
    events.push({
      type: 'EM_ATENDIMENTO',
      title: 'Em Atendimento',
      description: protocol.agr && Array.isArray(protocol.agr) && protocol.agr.length > 0
        ? `Seu atendimento está sendo realizado por ${(protocol.agr as Array<{ nome: string }>)[0].nome}.`
        : 'Um de nossos agentes está analisando seus documentos.',
      ocorridoEm: protocol.updated_at as string,
      isError: false,
      isCurrent: status === 'IN_PROGRESS',
    });
  }

  // Evento 3: Biometria
  if (['BIOMETRY_OK', 'BIOMETRY_FAIL', 'ISSUED'].includes(status)) {
    events.push({
      type: 'VIDEOCONFERENCIA_REALIZADA',
      title: 'Validação Biométrica',
      description: status === 'BIOMETRY_OK'
        ? 'Validação biométrica realizada com sucesso.'
        : 'Validação biométrica concluída.',
      ocorridoEm: protocol.updated_at as string,
      isError: status === 'BIOMETRY_FAIL',
      isCurrent: false,
    });
  }

  // Evento 4: Emitido
  if (status === 'ISSUED') {
    events.push({
      type: 'CERTIFICADO_EMITIDO',
      title: 'Certificado Emitido!',
      description: 'Seu certificado digital foi emitido com sucesso.',
      ocorridoEm: (protocol.cert_issued_at as string) ?? protocol.updated_at as string,
      isError: false,
      isCurrent: true,
    });
  }

  // Evento 5: Erro ou cancelamento
  if (status === 'ERROR') {
    events.push({
      type: 'ERRO',
      title: 'Erro na Emissão',
      description: 'Ocorreu um erro durante o processo. Entre em contato com nosso suporte.',
      ocorridoEm: protocol.updated_at as string,
      isError: true,
      isCurrent: true,
    });
  }

  if (status === 'CANCELLED') {
    events.push({
      type: 'CANCELADO',
      title: 'Cancelado',
      description: 'Este pedido foi cancelado.',
      ocorridoEm: protocol.updated_at as string,
      isError: true,
      isCurrent: true,
    });
  }

  // Marcar o último evento como atual se nenhum foi marcado
  if (events.length > 0 && !events.some(e => e.isCurrent)) {
    events[events.length - 1].isCurrent = true;
  }

  return events;
}

function getStatusMessages(status: import('@/types/tracking.types').ClientStatus): string[] {
  const messages: Record<string, string[]> = {
    PEDIDO_RECEBIDO: [
      'Seu pedido foi recebido e está na fila de análise.',
      'Em breve um de nossos agentes iniciará o atendimento.',
    ],
    DOCUMENTOS_EM_ANALISE: [
      'Seus documentos estão sendo verificados.',
      'Certifique-se de que seu e-mail está acessível para contato.',
    ],
    DOCUMENTOS_APROVADOS: [
      'Documentos aprovados! Aguarde o agendamento da videoconferência.',
    ],
    DOCUMENTOS_REJEITADOS: [
      'Houve um problema com seus documentos.',
      'Entre em contato conosco para regularizar a situação.',
    ],
    AGUARDANDO_VIDEOCONFERENCIA: [
      'Você será chamado para videoconferência em breve.',
      'Mantenha seus documentos originais em mãos.',
    ],
    VIDEOCONFERENCIA_AGENDADA: [
      'Sua videoconferência foi agendada.',
      'Prepare seus documentos originais para apresentação.',
    ],
    EM_ATENDIMENTO: [
      'Um agente está cuidando do seu atendimento agora.',
      'Acompanhe em tempo real o andamento.',
    ],
    EMISSAO_PROTOCOLO_AC: [
      'Estamos emitindo seu certificado junto à Autoridade Certificadora.',
      'Este processo pode levar alguns minutos.',
    ],
    CERTIFICADO_EMITIDO: [
      'Seu certificado digital foi emitido com sucesso!',
      'Você receberá as instruções de instalação por e-mail.',
    ],
    CERTIFICADO_ENTREGUE: [
      'Seu certificado digital já está disponível para uso.',
    ],
    CANCELADO: [
      'Este pedido foi cancelado.',
      'Se tiver dúvidas, entre em contato com nosso suporte.',
    ],
    ERRO: [
      'Ocorreu um erro inesperado.',
      'Nossa equipe foi notificada e está trabalhando na solução.',
      'Entre em contato pelo e-mail suporte@acangry.ac.br.',
    ],
  };

  return messages[status] ?? ['Acompanhe o andamento do seu pedido.'];
}

function maskCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return `***.${digits.slice(-4)}-**`;
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}
