'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Save, Bell, Users, CreditCard, Settings as SettingsIcon, ExternalLink } from 'lucide-react';
import { USER_LEVEL_LABELS } from '@/types/gs/permissions';

type ConfigTab = 'geral' | 'planos' | 'gateway' | 'notificacoes' | 'equipe';

const TAB_LABELS: Record<ConfigTab, string> = {
  geral: 'Geral',
  planos: 'Planos',
  gateway: 'Gateway',
  notificacoes: 'Notificações',
  equipe: 'Equipe',
};

interface TeamMember {
  id: string;
  nome: string;
  email: string;
  nivel: string;
}

const MOCK_TEAM: TeamMember[] = [
  { id: '1', nome: 'Admin Master',   email: 'admin@angry.ac.br',      nivel: 'AC_ADMIN' },
  { id: '2', nome: 'Carlos Suporte', email: 'carlos@angry.ac.br',     nivel: 'AC_SUPORTE' },
  { id: '3', nome: 'Ana Adm AR',     email: 'ana@ar-exemplo.com.br',  nivel: 'AR_ADMIN' },
  { id: '4', nome: 'Maria AGR',      email: 'maria@unidade.com.br',   nivel: 'UNIDADE_AGR' },
];

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<ConfigTab>('geral');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    nome: 'AR Exemplo Ltda',
    cnpj: '11.222.333/0001-81',
    email: 'contato@ar-exemplo.com.br',
    telefone: '(11) 3000-0000',
    endereco: 'Av. Paulista, 1000',
  });
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Configurações</h1>
        <p className="text-sm text-slate-400 mt-1">Gerencie as configurações da sua AR</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {(Object.keys(TAB_LABELS) as ConfigTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
              tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Geral */}
      {tab === 'geral' && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5 max-w-xl">
          <h2 className="text-sm font-bold text-slate-700">Dados da AR</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nome da AR</label>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">CNPJ</label>
              <input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Telefone</label>
              <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Endereço</label>
              <input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
            </div>
          </div>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <Save size={16} />
            {saved ? 'Salvo!' : 'Salvar Configuração'}
          </button>
        </div>
      )}

      {/* Planos */}
      {tab === 'planos' && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm max-w-lg">
          <h2 className="text-sm font-bold text-slate-700 mb-2">Planos e Assinatura</h2>
          <p className="text-sm text-slate-500 mb-4">Visualize e gerencie seu plano atual, faça upgrade ou downgrade.</p>
          <Link
            href="/gs/configuracoes/planos"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <CreditCard size={16} />
            Gerenciar Planos e Assinatura
            <ExternalLink size={14} />
          </Link>
        </div>
      )}

      {/* Gateway */}
      {tab === 'gateway' && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm max-w-lg">
          <h2 className="text-sm font-bold text-slate-700 mb-2">Gateway de Pagamento</h2>
          <p className="text-sm text-slate-500 mb-4">Configure a integração com o Asaas para cobranças.</p>
          <Link
            href="/gs/configuracoes/gateway"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <SettingsIcon size={16} />
            Configurar Asaas
            <ExternalLink size={14} />
          </Link>
        </div>
      )}

      {/* Notificações */}
      {tab === 'notificacoes' && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm max-w-lg">
          <h2 className="text-sm font-bold text-slate-700 mb-2">Preferências de Notificação</h2>
          <p className="text-sm text-slate-500 mb-4">Configure quais notificações por e-mail sua AR receberá.</p>
          <Link
            href="/gs/configuracoes/notificacoes"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <Bell size={16} />
            Gerenciar Notificações
            <ExternalLink size={14} />
          </Link>
        </div>
      )}

      {/* Equipe */}
      {tab === 'equipe' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden max-w-xl">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">Membros da Equipe</h2>
            <span className="text-xs text-slate-400">{MOCK_TEAM.length} membros</span>
          </div>
          <div className="divide-y divide-slate-50">
            {MOCK_TEAM.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                    {m.nome.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{m.nome}</p>
                    <p className="text-xs text-slate-400">{m.email}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-500">{USER_LEVEL_LABELS[m.nivel as keyof typeof USER_LEVEL_LABELS] || m.nivel}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
