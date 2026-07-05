import { NextRequest, NextResponse } from 'next/server';
import type { GS_Agenda } from '@/types/gs/agenda';

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

const agendaDb = [...mockAgenda];

export async function GET(_req: NextRequest) {
  const today = new Date().toISOString().split('T')[0];
  const hoje = agendaDb.filter(a => a.data === today);
  const ordenados = [...hoje].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  const total = ordenados.length;
  const agendados = ordenados.filter(a => a.status === 'AGENDADO').length;
  const confirmados = ordenados.filter(a => a.status === 'CONFIRMADO').length;
  const atendidos = ordenados.filter(a => a.status === 'ATENDIDO').length;
  const naoCompareceram = ordenados.filter(a => a.status === 'NAO_COMPARECEU').length;
  const cancelados = ordenados.filter(a => a.status === 'CANCELADO').length;

  const proximos = ordenados
    .filter(a => a.status === 'AGENDADO' || a.status === 'CONFIRMADO')
    .slice(0, 5);

  const agenteMap = new Map<string, { agente_id: string; agente_nome: string; total: number; atendidos: number }>();
  for (const a of ordenados) {
    const key = a.agente_id ?? 'sem-agente';
    if (!agenteMap.has(key)) {
      agenteMap.set(key, { agente_id: key, agente_nome: a.agente_nome ?? 'Não atribuído', total: 0, atendidos: 0 });
    }
    const entry = agenteMap.get(key)!;
    entry.total += 1;
    if (a.status === 'ATENDIDO') entry.atendidos += 1;
  }

  return NextResponse.json({
    data: today,
    total,
    agendados,
    confirmados,
    atendidos,
    naoCompareceram,
    cancelados,
    proximos,
    porAgente: Array.from(agenteMap.values()),
  });
}
