'use client';

import { useEffect, useState, useMemo } from 'react';
import { gsApi } from '@/lib/gs/auth';
import {
  DollarSign,
  Activity,
  ChevronDown,
  ChevronRight,
  Filter,
  FileText,
  Search,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {
  formatBRL,
  COMISSAO_STATUS_MAP,
  getMonthNameBR,
  type GS_Comissao,
  type ComissaoStatus,
} from '@/types/gs/agenda';

type FilterComissaoStatus = 'TODOS' | ComissaoStatus;

const CURRENT_MONTH = new Date().getMonth() + 1;
const CURRENT_YEAR = new Date().getFullYear();

const MOCK_COMISSOES: GS_Comissao[] = [
  { id: '1', agendamento_id: 'a1', usuario_id: 'u1', valor_total: 299.90, percentual: 10, valor_comissao: 29.99, status: 'PENDENTE', created_at: '', agente_nome: 'Carlos Silva', cliente_nome: 'Maria Silva', data: '05/07/2026', servico: 'Certificado' },
  { id: '2', agendamento_id: 'a2', usuario_id: 'u1', valor_total: 189.50, percentual: 10, valor_comissao: 18.95, status: 'PENDENTE', created_at: '', agente_nome: 'Carlos Silva', cliente_nome: 'João Santos', data: '04/07/2026', servico: 'Renovação' },
  { id: '3', agendamento_id: 'a3', usuario_id: 'u2', valor_total: 450.00, percentual: 15, valor_comissao: 67.50, status: 'PAGO', pago_em: '06/07/2026', created_at: '', agente_nome: 'Ana Oliveira', cliente_nome: 'Tech Solutions', data: '03/07/2026', servico: 'Certificado' },
  { id: '4', agendamento_id: 'a4', usuario_id: 'u2', valor_total: 199.90, percentual: 15, valor_comissao: 29.99, status: 'PAGO', pago_em: '05/07/2026', created_at: '', agente_nome: 'Ana Oliveira', cliente_nome: 'Ana Oliveira', data: '03/07/2026', servico: 'Certificado' },
  { id: '5', agendamento_id: 'a5', usuario_id: 'u3', valor_total: 149.90, percentual: 10, valor_comissao: 14.99, status: 'PAGO', pago_em: '04/07/2026', created_at: '', agente_nome: 'Pedro Santos', cliente_nome: 'Carlos Pereira', data: '02/07/2026', servico: 'Certificado' },
  { id: '6', agendamento_id: 'a6', usuario_id: 'u3', valor_total: 589.00, percentual: 10, valor_comissao: 58.90, status: 'PENDENTE', created_at: '', agente_nome: 'Pedro Santos', cliente_nome: 'Beta Construções', data: '01/07/2026', servico: 'Certificado' },
  { id: '7', agendamento_id: 'a7', usuario_id: 'u4', valor_total: 299.90, percentual: 10, valor_comissao: 29.99, status: 'CANCELADO', created_at: '', agente_nome: 'Marina Costa', cliente_nome: 'Fernanda Lima', data: '30/06/2026', servico: 'Renovação' },
  { id: '8', agendamento_id: 'a8', usuario_id: 'u4', valor_total: 189.50, percentual: 12, valor_comissao: 22.74, status: 'PENDENTE', created_at: '', agente_nome: 'Marina Costa', cliente_nome: 'Delta Tech', data: '29/06/2026', servico: 'Certificado' },
];

const AGENTES_FILTER = ['Todos', 'Carlos Silva', 'Ana Oliveira', 'Pedro Santos', 'Marina Costa'];

interface AgentSummary {
  nome: string;
  total: number;
  pago: number;
  pendente: number;
  comissoes: GS_Comissao[];
}

export default function ComissoesPage() {
  const [comissoes, setComissoes] = useState<GS_Comissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(CURRENT_MONTH);
  const [ano, setAno] = useState(CURRENT_YEAR);
  const [filterAgente, setFilterAgente] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState<FilterComissaoStatus>('TODOS');
  const [search, setSearch] = useState('');
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  useEffect(() => {
    gsApi.get<GS_Comissao[]>('/comissoes')
      .then(setComissoes)
      .catch(() => setComissoes(MOCK_COMISSOES))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return comissoes.filter((c) => {
      if (filterStatus !== 'TODOS' && c.status !== filterStatus) return false;
      if (filterAgente !== 'Todos' && c.agente_nome !== filterAgente) return false;
      if (search && !c.cliente_nome?.toLowerCase().includes(search.toLowerCase()) && !c.agente_nome?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [comissoes, filterStatus, filterAgente, search]);

  const agentSummary = useMemo(() => {
    const map = new Map<string, AgentSummary>();
    filtered.forEach((c) => {
      const name = c.agente_nome || 'Sem agente';
      if (!map.has(name)) {
        map.set(name, { nome: name, total: 0, pago: 0, pendente: 0, comissoes: [] });
      }
      const s = map.get(name)!;
      s.total += c.valor_comissao;
      if (c.status === 'PAGO') s.pago += c.valor_comissao;
      else if (c.status === 'PENDENTE') s.pendente += c.valor_comissao;
      s.comissoes.push(c);
    });
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [filtered]);

  const totals = useMemo(() => {
    return {
      total: agentSummary.reduce((s, a) => s + a.total, 0),
      pago: agentSummary.reduce((s, a) => s + a.pago, 0),
      pendente: agentSummary.reduce((s, a) => s + a.pendente, 0),
      atendimentos: filtered.length,
    };
  }, [agentSummary, filtered]);

  function changeMonth(delta: number) {
    let m = mes + delta;
    let y = ano;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMes(m);
    setAno(y);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Activity size={28} className="text-slate-300 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Comissões</h1>
          <p className="text-sm text-slate-400 mt-1">Relatório de comissões por agente</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => changeMonth(-1)}
            className="px-2 py-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
          >
            <ChevronRight size={16} className="rotate-180" />
          </button>
          <span className="px-3 text-sm font-bold text-slate-700 min-w-[140px] text-center">
            {getMonthNameBR(mes)} / {ano}
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="px-2 py-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <DollarSign size={14} className="text-slate-300" />
            Total Comissões
          </div>
          <p className="text-2xl font-black text-slate-800">{formatBRL(totals.total)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">
            <DollarSign size={14} />
            Total Pago
          </div>
          <p className="text-2xl font-black text-emerald-700">{formatBRL(totals.pago)}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">
            <DollarSign size={14} />
            Total Pendente
          </div>
          <p className="text-2xl font-black text-amber-700">{formatBRL(totals.pendente)}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">
            <FileText size={14} />
            Atendimentos
          </div>
          <p className="text-2xl font-black text-indigo-700">{totals.atendimentos}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Filter size={14} />
          Filtros
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterAgente}
            onChange={(e) => setFilterAgente(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {AGENTES_FILTER.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            {(['TODOS', 'PENDENTE', 'PAGO'] as FilterComissaoStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === s
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {s === 'TODOS' ? 'Todos' : s === 'PENDENTE' ? 'Pendentes' : 'Pagos'}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente ou agente..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Agent Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Agente</th>
                <th className="text-center px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Atendimentos</th>
                <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Total</th>
                <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Pago</th>
                <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Pendente</th>
                <th className="text-center px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {agentSummary.map((agent) => (
                <>
                  <tr
                    key={agent.nome}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedAgent(expandedAgent === agent.nome ? null : agent.nome)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {expandedAgent === agent.nome ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-300" />}
                        <span className="font-semibold text-slate-700">{agent.nome}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center font-semibold text-slate-600">{agent.comissoes.length}</td>
                    <td className="px-5 py-4 text-right font-bold text-slate-800">{formatBRL(agent.total)}</td>
                    <td className="px-5 py-4 text-right font-semibold text-emerald-600">{formatBRL(agent.pago)}</td>
                    <td className="px-5 py-4 text-right font-semibold text-amber-600">{formatBRL(agent.pendente)}</td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedAgent(expandedAgent === agent.nome ? null : agent.nome); }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        {expandedAgent === agent.nome ? 'Recolher' : 'Detalhes'}
                      </button>
                    </td>
                  </tr>
                  {expandedAgent === agent.nome && (
                    <tr key={`${agent.nome}-detail`}>
                      <td colSpan={6} className="px-5 py-0">
                        <div className="border-t border-slate-50">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-50">
                                <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</th>
                                <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                                <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Serviço</th>
                                <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor</th>
                                <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">%</th>
                                <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comissão</th>
                                <th className="text-center px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {agent.comissoes.map((c) => {
                                const st = COMISSAO_STATUS_MAP[c.status];
                                return (
                                  <tr key={c.id} className="hover:bg-slate-50/30">
                                    <td className="px-4 py-2.5 text-xs text-slate-500">{c.data || '—'}</td>
                                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-700">{c.cliente_nome || '—'}</td>
                                    <td className="px-4 py-2.5 text-xs text-slate-500">{c.servico || '—'}</td>
                                    <td className="px-4 py-2.5 text-xs text-right text-slate-600">{formatBRL(c.valor_total)}</td>
                                    <td className="px-4 py-2.5 text-xs text-right text-slate-500">{c.percentual}%</td>
                                    <td className="px-4 py-2.5 text-xs text-right font-bold text-slate-700">{formatBRL(c.valor_comissao)}</td>
                                    <td className="px-4 py-2.5 text-center">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold ${st.bg} ${st.text}`}>
                                        {st.label}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {agentSummary.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <DollarSign size={32} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Nenhuma comissão encontrada.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
