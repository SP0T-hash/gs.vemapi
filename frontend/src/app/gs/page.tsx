'use client';

import { useEffect, useState } from 'react';
import {
  FileText,
  Users,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/gs/auth';
import { gsApi } from '@/lib/gs/auth';

/**
 * Dashboard GS — visão geral do sistema
 *
 * Exibe KPIs, resumo de pedidos, alertas e atividade recente.
 * Dados vêm da API /api/gs/dashboard que agrega dados do tenant.
 */
export default function GSDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gsApi.get<DashboardData>('/dashboard')
      .then(setData)
      .catch(() => {
        // Dados mockados para demonstração
        setData(mockDashboard);
      })
      .finally(() => setLoading(false));
  }, []);

  const user = getCurrentUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Activity size={28} className="text-slate-300 animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Erro ao carregar dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Bem-vindo, {user?.nome?.split(' ')[0] ?? 'usuário'} • {data.periodo}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<FileText size={20} />}
          label="Pedidos no Mês"
          value={data.pedidosNoMes}
          secondary={`${data.pedidosPendentes} pendentes`}
          color="emerald"
          href="/gs/pedidos"
        />
        <KpiCard
          icon={<Users size={20} />}
          label="Clientes Ativos"
          value={data.clientesAtivos}
          secondary={`+${data.novosClientes} este mês`}
          color="indigo"
          href="/gs/clientes"
        />
        <KpiCard
          icon={<AlertTriangle size={20} />}
          label="Certificados a Expirar"
          value={data.certificadosAExpirar}
          secondary="nos próximos 30 dias"
          color={data.certificadosAExpirar > 10 ? 'red' : 'amber'}
          href="/gs/contador"
        />
        <KpiCard
          icon={<TrendingUp size={20} />}
          label="Receita no Mês"
          value={formatBRL(data.receitaNoMes)}
          secondary={`vs. mês anterior ${data.variacaoReceita > 0 ? '+' : ''}${data.variacaoReceita}%`}
          color="emerald"
          href="/gs/pedidos"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pedidos Recentes */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              Pedidos Recentes
            </h2>
            <Link
              href="/gs/pedidos"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Ver todos <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {data.pedidosRecentes.map((pedido) => (
              <Link
                key={pedido.id}
                href={`/gs/pedidos/${pedido.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${STATUS_DOT[pedido.status]}`} />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      {pedido.cliente}
                    </p>
                    <p className="text-xs text-slate-400">{pedido.produto}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{pedido.data}</p>
                  <p className={`text-xs font-semibold ${STATUS_TEXT[pedido.status]}`}>
                    {pedido.statusLabel}
                  </p>
                </div>
              </Link>
            ))}

            {data.pedidosRecentes.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">
                Nenhum pedido recente.
              </p>
            )}
          </div>
        </div>

        {/* Alertas & Atividade */}
        <div className="space-y-4">
          {/* Alertas */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">
              Alertas
            </h2>
            <div className="space-y-3">
              {data.alertas.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  Nenhum alerta pendente ✨
                </p>
              ) : (
                data.alertas.map((alerta, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 p-2.5 rounded-xl text-sm ${
                      alerta.tipo === 'CRITICAL'
                        ? 'bg-red-50 text-red-700'
                        : alerta.tipo === 'WARNING'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>{alerta.mensagem}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Últimos Tickets */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                Tickets
              </h2>
              <Link
                href="/gs/suporte"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Ver
              </Link>
            </div>
            <div className="space-y-2">
              {data.ultimosTickets.map((ticket, i) => (
                <Link
                  key={i}
                  href={`/gs/suporte/${ticket.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <p className="text-sm text-slate-700 truncate max-w-[180px]">
                    {ticket.titulo}
                  </p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    ticket.prioridade === 'ALTA' || ticket.prioridade === 'URGENTE'
                      ? 'bg-red-50 text-red-600'
                      : ticket.prioridade === 'MEDIA'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}>
                    {ticket.prioridade}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Atividade Recente */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">
              Atividade
            </h2>
            <div className="space-y-2">
              {data.atividadeRecente.map((act, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-500">
                  <Clock size={14} className="mt-0.5 shrink-0 text-slate-300" />
                  <div>
                    <span className="text-slate-700 font-medium">{act.usuario}</span>
                    {' '}{act.acao}
                    <p className="text-[10px] text-slate-400">{act.quando}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  periodo: string;
  pedidosNoMes: number;
  pedidosPendentes: number;
  clientesAtivos: number;
  novosClientes: number;
  certificadosAExpirar: number;
  receitaNoMes: number;
  variacaoReceita: number;
  pedidosRecentes: Array<{
    id: string;
    cliente: string;
    produto: string;
    status: string;
    statusLabel: string;
    data: string;
  }>;
  alertas: Array<{
    tipo: 'CRITICAL' | 'WARNING' | 'INFO';
    mensagem: string;
  }>;
  ultimosTickets: Array<{
    id: string;
    titulo: string;
    prioridade: string;
  }>;
  atividadeRecente: Array<{
    usuario: string;
    acao: string;
    quando: string;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  PENDENTE: 'bg-amber-400',
  EM_ANDAMENTO: 'bg-blue-400',
  CONCLUIDO: 'bg-emerald-400',
  CANCELADO: 'bg-slate-300',
};

const STATUS_TEXT: Record<string, string> = {
  PENDENTE: 'text-amber-600',
  EM_ANDAMENTO: 'text-blue-600',
  CONCLUIDO: 'text-emerald-600',
  CANCELADO: 'text-slate-400',
};

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function KpiCard({
  icon,
  label,
  value,
  secondary,
  color,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  secondary: string;
  color: 'emerald' | 'indigo' | 'amber' | 'red';
  href: string;
}) {
  const colorMap = {
    emerald: {
      iconBg: 'bg-emerald-100 text-emerald-600',
      dot: 'bg-emerald-400',
    },
    indigo: {
      iconBg: 'bg-indigo-100 text-indigo-600',
      dot: 'bg-indigo-400',
    },
    amber: {
      iconBg: 'bg-amber-100 text-amber-600',
      dot: 'bg-amber-400',
    },
    red: {
      iconBg: 'bg-red-100 text-red-600',
      dot: 'bg-red-400',
    },
  };

  return (
    <Link
      href={href}
      className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm
                 hover:shadow-md hover:border-slate-200 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color].iconBg}`}>
          {icon}
        </div>
        <ArrowUpRight
          size={16}
          className="text-slate-300 group-hover:text-slate-500 transition-colors"
        />
      </div>
      <p className="text-2xl font-black text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      <p className={`text-[10px] font-semibold mt-1 inline-flex items-center gap-1`}>
        <span className={`w-1.5 h-1.5 rounded-full ${colorMap[color].dot}`} />
        {secondary}
      </p>
    </Link>
  );
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockDashboard: DashboardData = {
  periodo: 'Julho 2026',
  pedidosNoMes: 142,
  pedidosPendentes: 23,
  clientesAtivos: 1_847,
  novosClientes: 89,
  certificadosAExpirar: 34,
  receitaNoMes: 48750.0,
  variacaoReceita: 12.5,
  pedidosRecentes: [
    { id: '1', cliente: 'Maria Silva', produto: 'PF A3 - 3 anos', status: 'PENDENTE', statusLabel: 'Pendente', data: '04/07' },
    { id: '2', cliente: 'João Santos', produto: 'PJ A1 - 1 ano', status: 'EM_ANDAMENTO', statusLabel: 'Em Andamento', data: '04/07' },
    { id: '3', cliente: 'Tech Solutions Ltda', produto: 'NF-e - 1 ano', status: 'CONCLUIDO', statusLabel: 'Concluído', data: '03/07' },
    { id: '4', cliente: 'Ana Oliveira', produto: 'PF A3 - 1 ano', status: 'CONCLUIDO', statusLabel: 'Concluído', data: '03/07' },
    { id: '5', cliente: 'Carlos Pereira', produto: 'PF A1 - 1 ano', status: 'PENDENTE', statusLabel: 'Pendente', data: '02/07' },
  ],
  alertas: [
    { tipo: 'CRITICAL', mensagem: '5 certificados expiram hoje' },
    { tipo: 'WARNING', mensagem: 'Integração Safeweb com falha (tentativa 3/5)' },
    { tipo: 'INFO', mensagem: '2 tickets aguardando resposta há 48h+' },
  ],
  ultimosTickets: [
    { id: '1', titulo: 'Certificado não instalou no Windows', prioridade: 'ALTA' },
    { id: '2', titulo: 'Dúvida sobre renovação PF', prioridade: 'MEDIA' },
    { id: '3', titulo: 'Nota fiscal não foi emitida', prioridade: 'BAIXA' },
  ],
  atividadeRecente: [
    { usuario: 'Admin', acao: 'aprovou pedido #1423', quando: 'há 12min' },
    { usuario: 'Carlos', acao: 'gerou relatório de carteira', quando: 'há 45min' },
    { usuario: 'Admin', acao: 'integrou pedido #1420 com Angry', quando: 'há 2h' },
    { usuario: 'Maria', acao: 'abriu ticket #58', quando: 'há 3h' },
  ],
};
