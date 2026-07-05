'use client';

import { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  RefreshCw,
  ArrowUpRight,
  CreditCard,
  QrCode,
  Ban as Barcode,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { gsApi, getCurrentUser } from '@/lib/gs/auth';
import { formatBRL, FATURA_STATUS_MAP, type GS_Fatura } from '@/types/gs/billing';

export default function FinanceiroPage() {
  const [data, setData] = useState<FinanceiroData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gsApi.get<FinanceiroData>('/financeiro')
      .then(setData)
      .catch(() => setData(mockFinanceiro))
      .finally(() => setLoading(false));
  }, []);

  const monthYear = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={28} className="text-slate-300 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Erro ao carregar financeiro.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          Financeiro
        </h1>
        <p className="text-sm text-slate-400 mt-1 capitalize">
          {monthYear}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<DollarSign size={20} />}
          label="Receita no Mês"
          value={formatBRL(data.receitaMes)}
          secondary="faturamento bruto"
          color="emerald"
        />
        <KpiCard
          icon={<Clock size={20} />}
          label="A Receber"
          value={formatBRL(data.aReceber)}
          secondary="faturas pendentes"
          color="amber"
        />
        <KpiCard
          icon={<TrendingDown size={20} />}
          label="Repasses AR"
          value={formatBRL(data.repassesAR)}
          secondary="total do período"
          color="indigo"
        />
        <KpiCard
          icon={<CreditCard size={20} />}
          label="Taxas Gateway"
          value={formatBRL(data.taxasGateway)}
          secondary="Asaas + operadoras"
          color="slate"
        />
      </div>

      {/* Grid 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Faturas Recentes */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              Faturas Recentes
            </h2>
            <Link
              href="/gs/faturas"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Ver todas <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide pb-3">Cliente</th>
                  <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wide pb-3">Valor</th>
                  <th className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wide pb-3">Status</th>
                  <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wide pb-3">Vencimento</th>
                </tr>
              </thead>
              <tbody>
                {data.faturasRecentes.map((fat) => {
                  const statusStyle = FATURA_STATUS_MAP[fat.status];
                  return (
                    <tr key={fat.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-slate-700">{fat.cliente_nome}</p>
                      </td>
                      <td className="py-3 text-right font-semibold text-slate-800">
                        {formatBRL(fat.valor_total)}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${statusStyle.bg} ${statusStyle.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="py-3 text-right text-slate-500">
                        {new Date(fat.data_vencimento).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}

                {data.faturasRecentes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-sm text-slate-400">
                      Nenhuma fatura recente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumo do Período */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">
            Resumo do Período
          </h2>

          <div className="space-y-4">
            <ResumoLinha
              label="Total Receita"
              value={formatBRL(data.resumo.totalReceita)}
              color="text-emerald-600"
            />
            <ResumoLinha
              label="Despesas Gateway"
              value={formatBRL(data.resumo.totalDespesasGateway)}
              color="text-red-500"
            />
            <ResumoLinha
              label="Repasses"
              value={formatBRL(data.resumo.totalRepasses)}
              color="text-indigo-600"
            />

            <hr className="border-slate-100" />

            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Saldo Líquido</span>
              <span className={`text-lg font-black ${
                data.resumo.saldoLiquido >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {formatBRL(data.resumo.saldoLiquido)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  secondary,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  secondary: string;
  color: 'emerald' | 'amber' | 'indigo' | 'slate';
}) {
  const colorMap = {
    emerald: { iconBg: 'bg-emerald-100 text-emerald-600', dot: 'bg-emerald-400' },
    amber:   { iconBg: 'bg-amber-100 text-amber-600',     dot: 'bg-amber-400' },
    indigo:  { iconBg: 'bg-indigo-100 text-indigo-600',   dot: 'bg-indigo-400' },
    slate:   { iconBg: 'bg-slate-100 text-slate-600',     dot: 'bg-slate-400' },
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color].iconBg}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-black text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      <p className="text-[10px] font-semibold mt-1 inline-flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full ${colorMap[color].dot}`} />
        {secondary}
      </p>
    </div>
  );
}

function ResumoLinha({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface FinanceiroData {
  receitaMes: number;
  aReceber: number;
  repassesAR: number;
  taxasGateway: number;
  faturasRecentes: Array<{
    id: string;
    cliente_nome: string;
    valor_total: number;
    status: import('@/types/gs/billing').FaturaStatus;
    data_vencimento: string;
  }>;
  resumo: {
    totalReceita: number;
    totalDespesasGateway: number;
    totalRepasses: number;
    saldoLiquido: number;
  };
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockFinanceiro: FinanceiroData = {
  receitaMes: 48750.0,
  aReceber: 12380.5,
  repassesAR: 21800.0,
  taxasGateway: 2340.75,
  faturasRecentes: [
    {
      id: '1',
      cliente_nome: 'Maria Silva',
      valor_total: 350.0,
      status: 'PAGA',
      data_vencimento: '2026-07-10',
    },
    {
      id: '2',
      cliente_nome: 'Tech Solutions Ltda',
      valor_total: 1890.0,
      status: 'PENDENTE',
      data_vencimento: '2026-07-15',
    },
    {
      id: '3',
      cliente_nome: 'João Santos',
      valor_total: 270.0,
      status: 'VENCIDA',
      data_vencimento: '2026-06-28',
    },
    {
      id: '4',
      cliente_nome: 'Ana Oliveira',
      valor_total: 550.0,
      status: 'PAGA',
      data_vencimento: '2026-07-05',
    },
    {
      id: '5',
      cliente_nome: 'Carlos Pereira',
      valor_total: 185.0,
      status: 'PENDENTE',
      data_vencimento: '2026-07-20',
    },
  ],
  resumo: {
    totalReceita: 48750.0,
    totalDespesasGateway: 2340.75,
    totalRepasses: 21800.0,
    saldoLiquido: 24609.25,
  },
};
