'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gsApi, getCurrentUser } from '@/lib/gs/auth';
import { Activity, Plus, Search, ArrowUpRight, UserCog } from 'lucide-react';
import { USER_LEVEL_LABELS, USER_LEVEL_COLORS } from '@/types/gs/permissions';
import type { UserLevel } from '@/types/gs/permissions';

interface ListUsuario {
  id: string;
  nome: string;
  email: string;
  nivel: UserLevel;
  unidade: string;
  status: 'ATIVO' | 'INATIVO';
  ultimo_acesso: string;
}

const MOCK_USUARIOS: ListUsuario[] = [
  { id: '1', nome: 'Admin Master',     email: 'admin@angry.ac.br',       nivel: 'AC_ADMIN',       unidade: 'Matriz SP',           status: 'ATIVO',   ultimo_acesso: '05/07/2026 09:30' },
  { id: '2', nome: 'Carlos Suporte',   email: 'carlos@angry.ac.br',      nivel: 'AC_SUPORTE',     unidade: 'Matriz SP',           status: 'ATIVO',   ultimo_acesso: '04/07/2026 14:15' },
  { id: '3', nome: 'Ana Adm AR',       email: 'ana@ar-exemplo.com.br',   nivel: 'AR_ADMIN',       unidade: 'Filial Centro',       status: 'ATIVO',   ultimo_acesso: '04/07/2026 11:00' },
  { id: '4', nome: 'João Financeiro',  email: 'joao@ar-exemplo.com.br',  nivel: 'AR_FINANCEIRO',  unidade: 'Filial Centro',       status: 'ATIVO',   ultimo_acesso: '03/07/2026 16:45' },
  { id: '5', nome: 'Maria AGR',        email: 'maria@unidade-exemplo.com.br', nivel: 'UNIDADE_AGR', unidade: 'Filial Norte',     status: 'INATIVO', ultimo_acesso: '15/06/2026 08:20' },
];

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<ListUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const user = getCurrentUser();
  const isAdmin = user && ['AC_ADMIN', 'AR_ADMIN', 'UNIDADE_ADMIN'].includes(user.nivel);

  useEffect(() => {
    gsApi.get<ListUsuario[]>('/usuarios')
      .then(setUsuarios)
      .catch(() => setUsuarios(MOCK_USUARIOS))
      .finally(() => setLoading(false));
  }, []);

  const filtered = usuarios.filter((u) =>
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <UserCog size={40} className="text-slate-300 mx-auto mb-3" />
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
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Usuários</h1>
          <p className="text-sm text-slate-400 mt-1">{usuarios.length} usuários cadastrados</p>
        </div>
        <Link
          href="/gs/usuarios/novo"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
        >
          <Plus size={16} />
          Novo Usuário
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou email..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
        />
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Nível</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Unidade</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Último Acesso</th>
                <th className="text-center px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 font-semibold text-slate-700">{u.nome}</td>
                  <td className="px-5 py-4 text-slate-500">{u.email}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide border ${USER_LEVEL_COLORS[u.nivel].bg} ${USER_LEVEL_COLORS[u.nivel].text} ${USER_LEVEL_COLORS[u.nivel].border}`}>
                      {USER_LEVEL_LABELS[u.nivel]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{u.unidade}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${u.status === 'ATIVO' ? 'text-emerald-700' : 'text-slate-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'ATIVO' ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                      {u.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-400">{u.ultimo_acesso}</td>
                  <td className="px-5 py-4 text-center">
                    <Link
                      href={`/gs/usuarios/${u.id}`}
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
            <p className="text-sm text-slate-400">Nenhum usuário encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
