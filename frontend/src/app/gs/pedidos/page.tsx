'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gsApi } from '@/lib/gs/auth';
import { Activity, Plus, Search, ArrowUpRight } from 'lucide-react';

type ListStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'AGUARDANDO_PAGAMENTO' | 'PAGO' | 'EMITIDO' | 'CONCLUIDO' | 'CANCELADO';

interface ListPedido {
  id: string;
  cliente: string;
  produto: string;
  status: ListStatus;
  data: string;
  valor: number;
}

const STATUS_UI: Record<ListStatus, { label: string; dot: string; text: string; bg: string }> = {
  PENDENTE:             { label: 'Pendente',           dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50' },
  EM_ANDAMENTO:         { label: 'Em Andamento',       dot: 'bg-blue-400',  text: 'text-blue-700',  bg: 'bg-blue-50' },
  AGUARDANDO_PAGAMENTO: { label: 'Aguard. Pagamento',  dot: 'bg-purple-400',text: 'text-purple-700',bg: 'bg-purple-50' },
  PAGO:                 { label: 'Pago',               dot: 'bg-emerald-400',text: 'text-emerald-700',bg: 'bg-emerald-50' },
  EMITIDO:              { label: 'Emitido',            dot: 'bg-emerald-400',text: 'text-emerald-700',bg: 'bg-emerald-50' },
  CONCLUIDO:            { label: 'Concluído',          dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100' },
  CANCELADO:            { label: 'Cancelado',          dot: 'bg-red-400',   text: 'text-red-700',   bg: 'bg-red-50' },
};

const MOCK_PEDIDOS: ListPedido[] = [
  { id: '1', cliente: 'Maria Silva',        produto: 'PF A3 - 3 anos',    status: 'PENDENTE',             data: '04/07/2026', valor: 299.90 },
  { id: '2', cliente: 'João Santos',        produto: 'PJ A1 - 1 ano',    status: 'EM_ANDAMENTO',         data: '04/07/2026', valor: 189.50 },
  { id: '3', cliente: 'Tech Solutions Ltda',produto: 'NF-e - 1 ano',     status: 'AGUARDANDO_PAGAMENTO', data: '03/07/2026', valor: 450.00 },
  { id: '4', cliente: 'Ana Oliveira',       produto: 'PF A3 - 1 ano',    status: 'PAGO',                 data: '03/07/2026', valor: 199.90 },
  { id: '5', cliente: 'Carlos Pereira',     produto: 'PF A1 - 1 ano',    status: 'EMITIDO',              data: '02/07/2026', valor: 149.90 },
  { id: '6', cliente: 'Beta Construções',   produto: 'PJ A3 - 2 anos',   status: 'CONCLUIDO',            data: '01/07/2026', valor: 589.00 },
  { id: '7', cliente: 'Fernanda Lima',      produto: 'PF A3 - 3 anos',   status: 'CANCELADO',            data: '30/06/2026', valor: 299.90 },
  { id: '8', cliente: 'Delta Tech',         produto: 'PJ A1 - 1 ano',    status: 'PENDENTE',             data: '29/06/2026', valor: 189.50 },
];

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<ListPedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    gsApi.get<ListPedido[]>('/pedidos')
      .then(setPedidos)
      .catch(() => setPedidos(MOCK_PEDIDOS))
      .finally(() => setLoading(false));
  }, []);

  const filtered = pedidos.filter((p) =>
    p.cliente.toLowerCase().includes(search.toLowerCase()) ||
    p.produto.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Activity size={28} className="text-slate-300 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Pedidos</h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie todos os pedidos de certificados</p>
        </div>
        <Link
          href="/gs/pedidos/novo"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
        >
          <Plus size={16} />
          Novo Pedido
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por cliente ou produto..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
        />
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Produto</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                <th className="text-center px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((pedido) => {
                const st = STATUS_UI[pedido.status];
                return (
                  <tr key={pedido.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-700">{pedido.cliente}</td>
                    <td className="px-5 py-4 text-slate-500">{pedido.produto}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${st.bg} ${st.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{pedido.data}</td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-700">{formatBRL(pedido.valor)}</td>
                    <td className="px-5 py-4 text-center">
                      <Link
                        href={`/gs/pedidos/${pedido.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        Detalhes <ArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-slate-400">Nenhum pedido encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
