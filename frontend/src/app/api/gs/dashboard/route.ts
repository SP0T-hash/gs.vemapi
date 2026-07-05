import { NextRequest, NextResponse } from 'next/server';

const now = new Date();
const periodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

export async function GET(_req: NextRequest) {
  return NextResponse.json({
    periodo,
    pedidosNoMes: 47,
    pedidosPendentes: 12,
    clientesAtivos: 184,
    novosClientes: 8,
    certificadosAExpirar: 23,
    receitaNoMes: 28450.00,
    variacaoReceita: 12.5,
    pedidosRecentes: [
      { id: 'ped-001', cliente: 'Maria Silva', produto: 'Certificado PF A1', status: 'PAGO', statusLabel: 'Pago', data: '2026-07-04' },
      { id: 'ped-002', cliente: 'João Santos', produto: 'Certificado PF A3', status: 'AGUARDANDO_PAGAMENTO', statusLabel: 'Aguard. Pagamento', data: '2026-07-04' },
      { id: 'ped-003', cliente: 'TechSolutions Ltda', produto: 'Certificado PJ A1', status: 'EMITIDO', statusLabel: 'Emitido', data: '2026-07-03' },
      { id: 'ped-004', cliente: 'Ana Oliveira', produto: 'Certificado PF A1', status: 'DOCUMENTOS_PENDENTES', statusLabel: 'Docs Pendentes', data: '2026-07-03' },
      { id: 'ped-005', cliente: 'Construtora Nova Era', produto: 'Certificado PJ A3', status: 'EMITINDO_AC', statusLabel: 'Emitindo na AC', data: '2026-07-02' },
    ],
    alertas: [
      { tipo: 'CRITICAL', mensagem: '5 certificados expiram hoje' },
      { tipo: 'WARNING', mensagem: 'Assinatura do AR Central VEMAPI vence em 15 dias' },
      { tipo: 'INFO', mensagem: '8 novos clientes cadastrados este mês' },
    ],
    ultimosTickets: [
      { id: 'tkt-001', titulo: 'Problema na videoconferência', prioridade: 'ALTA' },
      { id: 'tkt-002', titulo: 'Dúvida sobre renovação', prioridade: 'MEDIA' },
      { id: 'tkt-003', titulo: 'Erro ao emitir certificado A3', prioridade: 'URGENTE' },
    ],
    atividadeRecente: [
      { usuario: 'Admin GS', acao: 'Criou pedido ped-006', quando: 'há 5 min' },
      { usuario: 'Carlos AR', acao: 'Aprovou biometria do pedido ped-003', quando: 'há 15 min' },
      { usuario: 'Maria (Suporte)', acao: 'Respondeu ticket tkt-001', quando: 'há 1 h' },
      { usuario: 'Admin GS', acao: 'Gerou fatura FAT-2026-0042', quando: 'há 2 h' },
    ],
  });
}
