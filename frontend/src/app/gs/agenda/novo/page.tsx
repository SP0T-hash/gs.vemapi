'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { gsApi } from '@/lib/gs/auth';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Save,
  Search,
  Building2,
  MapPin,
  User,
  FileText,
} from 'lucide-react';

const UNIDADES = [
  { value: '', label: 'Selecione uma unidade' },
  { value: 'matriz-sp', label: 'Matriz São Paulo' },
  { value: 'filial-campinas', label: 'Filial Campinas' },
  { value: 'filial-rj', label: 'Filial Rio de Janeiro' },
  { value: 'filial-bh', label: 'Filial Belo Horizonte' },
];

const PONTOS = [
  { value: '', label: 'Nenhum (opcional)' },
  { value: 'guiche-1', label: 'Guichê 1' },
  { value: 'guiche-2', label: 'Guichê 2' },
  { value: 'sala-vip', label: 'Sala VIP' },
  { value: 'sala-reuniao', label: 'Sala de Reunião' },
];

const SERVICOS = [
  { value: 'CERTIFICADO', label: 'Certificado' },
  { value: 'RENOVACAO', label: 'Renovação' },
  { value: 'ORCAMENTO', label: 'Orçamento' },
  { value: 'SUPORTE', label: 'Suporte' },
  { value: 'ENTREGA', label: 'Entrega' },
  { value: 'OUTROS', label: 'Outros' },
];

const AGENTES = [
  { value: '', label: 'Selecione um agente' },
  { value: 'Carlos Silva', label: 'Carlos Silva' },
  { value: 'Ana Oliveira', label: 'Ana Oliveira' },
  { value: 'Pedro Santos', label: 'Pedro Santos' },
  { value: 'Marina Costa', label: 'Marina Costa' },
];

export default function NovoAgendamentoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClienteId = searchParams.get('cliente_id') || '';

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    cliente: '',
    cliente_id: initialClienteId,
    telefone: '',
    email: '',
    data: today,
    horario: '09:00',
    unidade: '',
    ponto: '',
    tipo_servico: 'CERTIFICADO',
    indicacao: '',
    agente: '',
    observacoes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteResults, setShowClienteResults] = useState(false);

  const MOCK_CLIENTES_SEARCH = [
    { id: '1', nome: 'Maria Silva', documento: '123.456.789-01' },
    { id: '2', nome: 'João Santos', documento: '987.654.321-00' },
    { id: '3', nome: 'Tech Solutions Ltda', documento: '11.222.333/0001-81' },
    { id: '4', nome: 'Ana Oliveira', documento: '22.333.444/0001-91' },
  ];

  const filteredClientes = MOCK_CLIENTES_SEARCH.filter((c) =>
    c.nome.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    c.documento.includes(clienteSearch)
  );

  function selectCliente(cliente: typeof MOCK_CLIENTES_SEARCH[0]) {
    setForm((prev) => ({
      ...prev,
      cliente: cliente.nome,
      cliente_id: cliente.id,
    }));
    setClienteSearch(cliente.nome);
    setShowClienteResults(false);
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    setSuccess(false);

    if (!form.cliente || !form.data || !form.horario || !form.unidade || !form.agente) {
      setError('Preencha todos os campos obrigatórios.');
      setSaving(false);
      return;
    }

    try {
      await gsApi.post('/agenda', form);
      setSuccess(true);
      setTimeout(() => router.push('/gs/agenda'), 1500);
    } catch {
      setError('Erro ao criar agendamento. Tente novamente.');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Novo Agendamento</h1>
          <p className="text-sm text-slate-400 mt-1">Registre um novo atendimento na agenda</p>
        </div>
        <Link
          href="/gs/agenda"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft size={14} />
          Voltar
        </Link>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-sm font-semibold text-emerald-700 flex items-center gap-2">
          <Save size={18} />
          Agendamento criado com sucesso! Redirecionando...
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
        {/* Cliente */}
        <div className="relative">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Cliente <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={clienteSearch}
              onChange={(e) => {
                setClienteSearch(e.target.value);
                setShowClienteResults(true);
                if (!e.target.value) {
                  updateField('cliente', '');
                  updateField('cliente_id', '');
                }
              }}
              onFocus={() => setShowClienteResults(true)}
              placeholder="Digite o nome ou CPF/CNPJ do cliente..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          {showClienteResults && clienteSearch.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-modal p-1 max-h-48 overflow-y-auto">
              {filteredClientes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCliente(c)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <p className="text-sm font-semibold text-slate-700">{c.nome}</p>
                  <p className="text-[10px] text-slate-400">{c.documento}</p>
                </button>
              ))}
              {filteredClientes.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-400">Nenhum cliente encontrado.</p>
              )}
            </div>
          )}
          {form.cliente && !showClienteResults && (
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <User size={12} /> {form.cliente}
            </p>
          )}
        </div>

        {/* Telefone + Email */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Telefone</label>
            <input
              type="text"
              value={form.telefone}
              onChange={(e) => updateField('telefone', e.target.value)}
              placeholder="(11) 99999-0000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="cliente@email.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Data + Horário */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Data <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={form.data}
                onChange={(e) => updateField('data', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Horário <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="time"
                value={form.horario}
                onChange={(e) => updateField('horario', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Unidade + Ponto */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Unidade <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={form.unidade}
                onChange={(e) => updateField('unidade', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all appearance-none"
              >
                {UNIDADES.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Ponto de Atendimento</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={form.ponto}
                onChange={(e) => updateField('ponto', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all appearance-none"
              >
                {PONTOS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tipo Serviço + Agente */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Tipo de Serviço <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <FileText size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={form.tipo_servico}
                onChange={(e) => updateField('tipo_servico', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all appearance-none"
              >
                {SERVICOS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Agente <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={form.agente}
                onChange={(e) => updateField('agente', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all appearance-none"
              >
                {AGENTES.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Indicação */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Indicação</label>
          <input
            type="text"
            value={form.indicacao}
            onChange={(e) => updateField('indicacao', e.target.value)}
            placeholder="Quem indicou o cliente?"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Observações</label>
          <textarea
            value={form.observacoes}
            onChange={(e) => updateField('observacoes', e.target.value)}
            placeholder="Observações sobre o agendamento..."
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Criar Agendamento'}
          </button>
          <Link
            href="/gs/agenda"
            className="px-6 py-2.5 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
