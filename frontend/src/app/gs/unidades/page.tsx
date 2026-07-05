'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gsApi, getCurrentUser } from '@/lib/gs/auth';
import { Activity, Plus, Search, ArrowUpRight, Building2 } from 'lucide-react';

type UnidadeTipo = 'MATRIZ' | 'FILIAL' | 'PONTO_ATENDIMENTO';

interface ListUnidade {
  id: string;
  nome: string;
  tipo: UnidadeTipo;
  responsavel: string;
  cidade: string;
  uf: string;
  status: 'ATIVO' | 'INATIVO';
}

const TIPO_UI: Record<UnidadeTipo, { label: string; bg: string; text: string; border: string }> = {
  MATRIZ:             { label: 'Matriz',            bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  FILIAL:             { label: 'Filial',            bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200' },
  PONTO_ATENDIMENTO:  { label: 'Ponto Atendimento', bg: 'bg-amber-50',  text: 'text-amber-700', border: 'border-amber-200' },
};

const MOCK_UNIDADES: ListUnidade[] = [
  { id: '1', nome: 'Matriz São Paulo',     tipo: 'MATRIZ',            responsavel: 'Carlos Eduardo', cidade: 'São Paulo',  uf: 'SP', status: 'ATIVO' },
  { id: '2', nome: 'Filial Centro',        tipo: 'FILIAL',            responsavel: 'Ana Oliveira',    cidade: 'São Paulo',  uf: 'SP', status: 'ATIVO' },
  { id: '3', nome: 'Filial Norte',         tipo: 'FILIAL',            responsavel: 'João Santos',     cidade: 'Guarulhos',  uf: 'SP', status: 'ATIVO' },
  { id: '4', nome: 'Ponto Shopping Center',tipo: 'PONTO_ATENDIMENTO', responsavel: 'Maria Silva',     cidade: 'Campinas',   uf: 'SP', status: 'INATIVO' },
];

export default function UnidadesPage() {
  const [unidades, setUnidades] = useState<ListUnidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('TODOS');

  const user = getCurrentUser();
  const isAdmin = user && ['AC_ADMIN', 'AR_ADMIN', 'UNIDADE_ADMIN'].includes(user.nivel);

  useEffect(() => {
    gsApi.get<ListUnidade[]>('/unidades')
      .then(setUnidades)
      .catch(() => setUnidades(MOCK_UNIDADES))
      .finally(() => setLoading(false));
  }, []);

  const filtered = unidades.filter((u) => {
    const matchSearch = u.nome.toLowerCase().includes(search.toLowerCase()) || u.responsavel.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === 'TODOS' || u.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Building2 size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Acesso restrito a administradores.</p>
        </div>
      </div>
    );
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Unidades</h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie as unidades de atendimento</p>
        </div>
        <Link
          href="/gs/unidades/novo"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
        >
          <Plus size={16} />
          Nova Unidade
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou responsável..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
        >
          <option value="TODOS">Todos os tipos</option>
          <option value="MATRIZ">Matriz</option>
          <option value="FILIAL">Filial</option>
          <option value="PONTO_ATENDIMENTO">Ponto Atendimento</option>
        </select>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Responsável</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Cidade/UF</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-center px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 font-semibold text-slate-700">{u.nome}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide border ${TIPO_UI[u.tipo].bg} ${TIPO_UI[u.tipo].text} ${TIPO_UI[u.tipo].border}`}>
                      {TIPO_UI[u.tipo].label}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{u.responsavel}</td>
                  <td className="px-5 py-4 text-slate-500">{u.cidade}/{u.uf}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${u.status === 'ATIVO' ? 'text-emerald-700' : 'text-slate-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'ATIVO' ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                      {u.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <Link
                      href={`/gs/unidades/${u.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      Detalhes <ArrowUpRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-slate-400">Nenhuma unidade encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
