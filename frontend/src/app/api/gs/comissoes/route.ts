import { NextRequest, NextResponse } from 'next/server';
import type { GS_Comissao, ComissaoStatus } from '@/types/gs/agenda';

const mockComissoes: GS_Comissao[] = [
  {
    id: 'com-001', agente_id: 'usr-001', ar_id: 'ar-001',
    agenda_id: 'age-004', pedido_id: 'ped-003',
    tipo: 'COMISSAO_CERT', valor_bruto: 45000, percentual: 10, valor_comissao: 4500,
    status: 'PAGA', mes_referencia: '2026-07', data_pagamento: '2026-07-05T10:00:00Z',
    agente_nome: 'Carlos Agente', cliente_nome: 'TechSolutions Ltda', atendimento_data: '2026-07-04',
  },
  {
    id: 'com-002', agente_id: 'usr-001', ar_id: 'ar-001',
    agenda_id: 'age-001', pedido_id: 'ped-001',
    tipo: 'COMISSAO_CERT', valor_bruto: 18000, percentual: 10, valor_comissao: 1800,
    status: 'PENDENTE', mes_referencia: '2026-07', data_pagamento: null,
    agente_nome: 'Carlos Agente', cliente_nome: 'Maria Silva', atendimento_data: '2026-07-05',
  },
  {
    id: 'com-003', agente_id: 'usr-002', ar_id: 'ar-001',
    agenda_id: 'age-005', pedido_id: null,
    tipo: 'ATENDIMENTO', valor_bruto: 5000, percentual: 5, valor_comissao: 250,
    status: 'PENDENTE', mes_referencia: '2026-07', data_pagamento: null,
    agente_nome: 'Juliana Atendente', cliente_nome: 'Fernando Costa', atendimento_data: '2026-07-04',
  },
  {
    id: 'com-004', agente_id: 'usr-001', ar_id: 'ar-001',
    agenda_id: null, pedido_id: 'ped-002',
    tipo: 'VENDA', valor_bruto: 25000, percentual: 8, valor_comissao: 2000,
    status: 'PAGA', mes_referencia: '2026-06', data_pagamento: '2026-06-20T00:00:00Z',
    agente_nome: 'Carlos Agente', cliente_nome: 'João Santos', atendimento_data: '2026-06-15',
  },
  {
    id: 'com-005', agente_id: 'usr-003', ar_id: 'ar-001',
    agenda_id: 'age-003', pedido_id: null,
    tipo: 'ATENDIMENTO', valor_bruto: 5000, percentual: 5, valor_comissao: 250,
    status: 'CANCELADA', mes_referencia: '2026-07', data_pagamento: null,
    agente_nome: 'Pedro Vendedor', cliente_nome: 'Ana Oliveira', atendimento_data: '2026-07-05',
  },
];

let comissoesDb = [...mockComissoes];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const resumo = searchParams.get('resumo');

  if (resumo === 'true') {
    const mes = searchParams.get('mes_referencia')
      ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const filtradas = comissoesDb.filter(c => c.mes_referencia === mes);

    const totalComissoes = filtradas.reduce((acc, c) => acc + c.valor_comissao, 0);
    const totalPago = filtradas.filter(c => c.status === 'PAGA').reduce((acc, c) => acc + c.valor_comissao, 0);
    const totalPendente = filtradas.filter(c => c.status === 'PENDENTE').reduce((acc, c) => acc + c.valor_comissao, 0);

    const agenteMap = new Map<string, { agente_id: string; agente_nome: string; total: number; valor: number; pago: number; pendente: number }>();
    for (const c of filtradas) {
      const key = c.agente_id;
      if (!agenteMap.has(key)) {
        agenteMap.set(key, { agente_id: key, agente_nome: c.agente_nome ?? 'Desconhecido', total: 0, valor: 0, pago: 0, pendente: 0 });
      }
      const entry = agenteMap.get(key)!;
      entry.total += 1;
      entry.valor += c.valor_comissao;
      if (c.status === 'PAGA') entry.pago += c.valor_comissao;
      if (c.status === 'PENDENTE') entry.pendente += c.valor_comissao;
    }

    return NextResponse.json({
      mes,
      totalComissoes,
      totalPago,
      totalPendente,
      porAgente: Array.from(agenteMap.values()),
    });
  }

  const mes_referencia = searchParams.get('mes_referencia');
  const agente_id = searchParams.get('agente_id');
  const ar_id = searchParams.get('ar_id');
  const status = searchParams.get('status');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));

  let filtered = [...comissoesDb];

  if (mes_referencia) filtered = filtered.filter(c => c.mes_referencia === mes_referencia);
  if (agente_id) filtered = filtered.filter(c => c.agente_id === agente_id);
  if (ar_id) filtered = filtered.filter(c => c.ar_id === ar_id);
  if (status) filtered = filtered.filter(c => c.status === status);

  filtered.sort((a, b) => b.mes_referencia.localeCompare(a.mes_referencia));

  const total = filtered.length;
  const totalPagoAll = filtered.filter(c => c.status === 'PAGA').reduce((acc, c) => acc + c.valor_comissao, 0);
  const totalPendenteAll = filtered.filter(c => c.status === 'PENDENTE').reduce((acc, c) => acc + c.valor_comissao, 0);

  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return NextResponse.json({
    data: paginated,
    total,
    totalPago: totalPagoAll,
    totalPendente: totalPendenteAll,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
