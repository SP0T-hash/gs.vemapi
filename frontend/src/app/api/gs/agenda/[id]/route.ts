import { NextRequest, NextResponse } from 'next/server';
import type { GS_Agenda, GS_Comissao, AgendaStatus, ComissaoTipo } from '@/types/gs/agenda';

const mockAgenda: GS_Agenda[] = [
  {
    id: 'age-001', ar_id: 'ar-001', unidade_id: 'unid-001', ponto_id: null,
    cliente_id: 'cli-001', cliente_nome: 'Maria Silva', cliente_telefone: '(11) 99999-0001',
    cliente_email: 'maria@email.com', numero_cliente: 'CLI-0001',
    data: '2026-07-05', hora_inicio: '09:00', hora_fim: '09:30',
    status: 'AGENDADO', agente_id: 'usr-001', agente_nome: 'Carlos Agente',
    observacoes: 'Primeira via de certificado A1', indicacao: null,
    tipo_servico: 'CERTIFICADO', pedido_id: 'ped-001',
    agendado_por: 'usr-admin', data_confirmacao: null, data_atendimento: null, motivo_cancelamento: null,
    unidade_nome: 'Matriz VEMAPI', agente_email: 'carlos@vemapi.com.br',
  },
  {
    id: 'age-002', ar_id: 'ar-001', unidade_id: null, ponto_id: 'pto-001',
    cliente_id: 'cli-003', cliente_nome: 'João Santos', cliente_telefone: '(11) 98888-0002',
    cliente_email: 'joao@email.com', numero_cliente: 'CLI-0003',
    data: '2026-07-05', hora_inicio: '10:00', hora_fim: '10:20',
    status: 'CONFIRMADO', agente_id: 'usr-001', agente_nome: 'Carlos Agente',
    observacoes: 'Renovação de certificado A3', indicacao: 'Indicação do Pedro',
    tipo_servico: 'RENOVACAO', pedido_id: null,
    agendado_por: 'usr-001', data_confirmacao: '2026-07-04T14:30:00Z', data_atendimento: null, motivo_cancelamento: null,
    ponto_nome: 'Posto Centro', agente_email: 'carlos@vemapi.com.br',
  },
  {
    id: 'age-003', ar_id: 'ar-001', unidade_id: 'unid-002', ponto_id: null,
    cliente_id: null, cliente_nome: 'Ana Oliveira', cliente_telefone: null,
    cliente_email: null, numero_cliente: null,
    data: '2026-07-05', hora_inicio: '14:00', hora_fim: null,
    status: 'AGENDADO', agente_id: null, agente_nome: null,
    observacoes: 'Orçamento para certificado PJ', indicacao: null,
    tipo_servico: 'ORCAMENTO', pedido_id: null,
    agendado_por: 'usr-admin', data_confirmacao: null, data_atendimento: null, motivo_cancelamento: null,
    unidade_nome: 'Filial Zona Sul',
  },
  {
    id: 'age-004', ar_id: 'ar-001', unidade_id: 'unid-001', ponto_id: null,
    cliente_id: 'cli-002', cliente_nome: 'TechSolutions Ltda', cliente_telefone: '(11) 3000-0000',
    cliente_email: 'financeiro@techsolutions.com.br', numero_cliente: 'CLI-0002',
    data: '2026-07-04', hora_inicio: '11:00', hora_fim: '11:45',
    status: 'ATENDIDO', agente_id: 'usr-001', agente_nome: 'Carlos Agente',
    observacoes: 'Entrega de certificados A1 do CNPJ', indicacao: null,
    tipo_servico: 'ENTREGA', pedido_id: 'ped-003',
    agendado_por: 'usr-001', data_confirmacao: '2026-07-03T09:00:00Z', data_atendimento: '2026-07-04T11:05:00Z', motivo_cancelamento: null,
    unidade_nome: 'Matriz VEMAPI', agente_email: 'carlos@vemapi.com.br',
  },
  {
    id: 'age-005', ar_id: 'ar-001', unidade_id: null, ponto_id: null,
    cliente_id: null, cliente_nome: 'Fernando Costa', cliente_telefone: '(11) 97777-0003',
    cliente_email: 'fernando@email.com', numero_cliente: null,
    data: '2026-07-04', hora_inicio: '15:00', hora_fim: null,
    status: 'NAO_COMPARECEU', agente_id: 'usr-002', agente_nome: 'Juliana Atendente',
    observacoes: 'Cliente não compareceu. Tentou contato 2x.', indicacao: null,
    tipo_servico: 'SUPORTE', pedido_id: null,
    agendado_por: 'usr-002', data_confirmacao: null, data_atendimento: null, motivo_cancelamento: null,
    agente_email: 'juliana@vemapi.com.br',
  },
  {
    id: 'age-006', ar_id: 'ar-001', unidade_id: 'unid-001', ponto_id: null,
    cliente_id: 'cli-001', cliente_nome: 'Maria Silva', cliente_telefone: '(11) 99999-0001',
    cliente_email: 'maria@email.com', numero_cliente: 'CLI-0001',
    data: '2026-07-06', hora_inicio: '08:30', hora_fim: '09:00',
    status: 'AGENDADO', agente_id: null, agente_nome: null,
    observacoes: null, indicacao: null,
    tipo_servico: 'CERTIFICADO', pedido_id: 'ped-004',
    agendado_por: 'usr-admin', data_confirmacao: null, data_atendimento: null, motivo_cancelamento: null,
    unidade_nome: 'Matriz VEMAPI',
  },
  {
    id: 'age-007', ar_id: 'ar-001', unidade_id: 'unid-001', ponto_id: null,
    cliente_id: null, cliente_nome: 'Roberto Lima', cliente_telefone: '(11) 96666-0004',
    cliente_email: 'roberto@email.com', numero_cliente: null,
    data: '2026-07-07', hora_inicio: '13:00', hora_fim: '13:30',
    status: 'CANCELADO', agente_id: null, agente_nome: null,
    observacoes: 'Cliente cancelou pois já emitiu por outra AR', indicacao: null,
    tipo_servico: 'OUTROS', pedido_id: null,
    agendado_por: 'usr-001', data_confirmacao: null, data_atendimento: null, motivo_cancelamento: 'Cliente desistiu',
    unidade_nome: 'Matriz VEMAPI',
  },
];

let agendaDb = [...mockAgenda];
let comissaoDb: GS_Comissao[] = [];
let comissaoSeq = 0;

const COMISSAO_PERCENT_MAP: Record<string, number> = {
  CERTIFICADO: 10,
  RENOVACAO: 8,
  ORCAMENTO: 0,
  SUPORTE: 5,
  ENTREGA: 5,
  OUTROS: 0,
};

function generateComissaoId(): string {
  comissaoSeq += 1;
  return `com-${String(comissaoSeq).padStart(3, '0')}`;
}

function autoCriarComissao(agenda: GS_Agenda): GS_Comissao | null {
  const percentual = COMISSAO_PERCENT_MAP[agenda.tipo_servico ?? 'OUTROS'];
  if (percentual <= 0) return null;

  const mesRef = agenda.data.substring(0, 7);
  const valorBase = agenda.tipo_servico === 'CERTIFICADO' || agenda.tipo_servico === 'RENOVACAO' ? 15000 : 5000;

  const comissao: GS_Comissao = {
    id: generateComissaoId(),
    agente_id: agenda.agente_id ?? 'usr-001',
    ar_id: agenda.ar_id,
    agenda_id: agenda.id,
    pedido_id: agenda.pedido_id,
    tipo: agenda.tipo_servico === 'CERTIFICADO' || agenda.tipo_servico === 'RENOVACAO' ? 'COMISSAO_CERT' : 'ATENDIMENTO',
    valor_bruto: valorBase,
    percentual,
    valor_comissao: Math.round(valorBase * (percentual / 100)),
    status: 'PENDENTE',
    mes_referencia: mesRef,
    data_pagamento: null,
    agente_nome: agenda.agente_nome ?? undefined,
    cliente_nome: agenda.cliente_nome,
    atendimento_data: agenda.data,
  };

  comissaoDb.push(comissao);
  return comissao;
}

function findAgenda(id: string): GS_Agenda | undefined {
  return agendaDb.find(a => a.id === id);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agenda = findAgenda(id);
  if (!agenda) {
    return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 });
  }

  const comissoes = comissaoDb.filter(c => c.agenda_id === id);
  return NextResponse.json({ agenda, comissoes });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agenda = findAgenda(id);
  if (!agenda) {
    return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const oldStatus = agenda.status;

  if (body.status) agenda.status = body.status as AgendaStatus;
  if (body.agente_id !== undefined) {
    agenda.agente_id = body.agente_id as string | null;
    agenda.agente_nome = body.agente_nome as string | null ?? agenda.agente_nome;
  }
  if (body.observacoes !== undefined) agenda.observacoes = body.observacoes as string | null;
  if (body.indicacao !== undefined) agenda.indicacao = body.indicacao as string | null;
  if (body.hora_inicio !== undefined) agenda.hora_inicio = body.hora_inicio as string;
  if (body.hora_fim !== undefined) agenda.hora_fim = body.hora_fim as string | null;
  if (body.tipo_servico !== undefined) agenda.tipo_servico = body.tipo_servico as AgendaStatus | null;
  if (body.motivo_cancelamento !== undefined) agenda.motivo_cancelamento = body.motivo_cancelamento as string | null;

  const now = new Date().toISOString();

  if (agenda.status === 'CONFIRMADO' && oldStatus !== 'CONFIRMADO') {
    agenda.data_confirmacao = now;
  }

  if (agenda.status === 'ATENDIDO' && oldStatus !== 'ATENDIDO') {
    agenda.data_atendimento = now;
  }

  const index = agendaDb.findIndex(a => a.id === id);
  if (index !== -1) agendaDb[index] = agenda;

  let comissaoCriada: GS_Comissao | undefined;

  if (agenda.status === 'ATENDIDO' && oldStatus !== 'ATENDIDO') {
    const nova = autoCriarComissao(agenda);
    if (nova) comissaoCriada = nova;
  }

  return NextResponse.json({
    success: true,
    agenda,
    ...(comissaoCriada ? { comissao: comissaoCriada } : {}),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agenda = findAgenda(id);
  if (!agenda) {
    return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 });
  }

  if (agenda.status === 'ATENDIDO') {
    return NextResponse.json(
      { error: 'Não é possível excluir um atendimento já realizado.' },
      { status: 400 }
    );
  }

  agenda.status = 'CANCELADO';
  agenda.motivo_cancelamento = 'Cancelado pelo operador';
  agenda.data_confirmacao = null;

  const index = agendaDb.findIndex(a => a.id === id);
  if (index !== -1) agendaDb[index] = agenda;

  return NextResponse.json({ success: true, agenda });
}
