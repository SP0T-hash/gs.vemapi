'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { gsApi } from '@/lib/gs/auth';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Edit,
  Plus,
  ShoppingBag,
  Calendar,
  FileText,
  Save,
  X,
  Activity,
  Hash,
  User as UserIcon,
  Building2,
  BookUser,
  Clock,
  FileSpreadsheet,
  MessageSquareText,
} from 'lucide-react';
import {
  AGENDA_STATUS_UI,
  SERVICO_LABELS,
  formatDateBR,
  formatBRL,
} from '@/types/gs/agenda';

type TabType = 'pedidos' | 'agenda' | 'documentos' | 'observacoes';

interface ClienteDetalhado {
  id: string;
  nome: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
  tipo_pessoa: 'FISICA' | 'JURIDICA';
  endereco: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  } | null;
  numero_cliente?: string;
  indicacao?: string;
  unidade_nome?: string;
  contador_nome?: string;
  observacoes?: string;
  created_at: string;
}

interface PedidoCliente {
  id: string;
  protocolo: string;
  produto: string;
  status: string;
  data: string;
  valor: number;
}

interface AgendaCliente {
  id: string;
  data: string;
  hora: string;
  status: string;
  agente_nome: string;
  tipo_servico: string;
}

interface DocumentoCliente {
  id: string;
  nome: string;
  tipo: string;
  data: string;
  url: string;
}

const MOCK_CLIENTE: ClienteDetalhado = {
  id: '1',
  nome: 'Maria Silva',
  cpf_cnpj: '123.456.789-01',
  email: 'maria@email.com',
  telefone: '(11) 99999-0001',
  tipo_pessoa: 'FISICA',
  endereco: {
    logradouro: 'Rua das Flores',
    numero: '123',
    complemento: 'Apto 45',
    bairro: 'Centro',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '01001-000',
  },
  numero_cliente: '0001/26',
  indicacao: 'João Santos',
  unidade_nome: 'Matriz São Paulo',
  contador_nome: 'Contabilidade ABC',
  observacoes: 'Cliente prefere contato por WhatsApp.\nHorário comercial das 9h às 18h.',
  created_at: '2026-01-15',
};

const MOCK_PEDIDOS: PedidoCliente[] = [
  { id: 'p1', protocolo: 'PED-2026-0001', produto: 'PF A3 - 3 anos', status: 'EMITIDO', data: '04/07/2026', valor: 299.90 },
  { id: 'p2', protocolo: 'PED-2026-0002', produto: 'PF A1 - 1 ano',  status: 'PAGO',    data: '15/06/2026', valor: 149.90 },
  { id: 'p3', protocolo: 'PED-2026-0005', produto: 'Renovação PF A3', status: 'CONCLUIDO', data: '10/03/2026', valor: 199.90 },
];

const MOCK_AGENDA: AgendaCliente[] = [
  { id: 'a1', data: '05/07/2026', hora: '08:30', status: 'CONFIRMADO', agente_nome: 'Carlos Silva', tipo_servico: 'CERTIFICADO' },
  { id: 'a2', data: '22/06/2026', hora: '14:00', status: 'ATENDIDO',   agente_nome: 'Ana Oliveira', tipo_servico: 'RENOVACAO' },
  { id: 'a3', data: '10/05/2026', hora: '10:30', status: 'CANCELADO',  agente_nome: 'Pedro Santos', tipo_servico: 'ORCAMENTO' },
];

const MOCK_DOCUMENTOS: DocumentoCliente[] = [
  { id: 'd1', nome: 'RG - Frente', tipo: 'image', data: '02/07/2026', url: '#' },
  { id: 'd2', nome: 'RG - Verso', tipo: 'image', data: '02/07/2026', url: '#' },
  { id: 'd3', nome: 'Comprovante de Residência', tipo: 'pdf', data: '02/07/2026', url: '#' },
  { id: 'd4', nome: 'CNH', tipo: 'image', data: '15/06/2026', url: '#' },
];

const STATUS_PEDIDO_MAP: Record<string, { label: string; bg: string; text: string }> = {
  PENDENTE:   { label: 'Pendente',   bg: 'bg-amber-50', text: 'text-amber-700' },
  PAGO:       { label: 'Pago',       bg: 'bg-emerald-50', text: 'text-emerald-700' },
  EMITIDO:    { label: 'Emitido',    bg: 'bg-emerald-50', text: 'text-emerald-700' },
  CONCLUIDO:  { label: 'Concluído',  bg: 'bg-slate-100', text: 'text-slate-600' },
  CANCELADO:  { label: 'Cancelado',  bg: 'bg-red-50', text: 'text-red-700' },
};

function maskCPF(cpf: string): string {
  const d = cpf.replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return cpf;
}

export default function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [cliente, setCliente] = useState<ClienteDetalhado | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pedidos');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ClienteDetalhado>>({});
  const [saving, setSaving] = useState(false);
  const [observacoesText, setObservacoesText] = useState('');

  useEffect(() => {
    Promise.all([
      gsApi.get<ClienteDetalhado>(`/clientes/${id}`).catch(() => MOCK_CLIENTE),
    ]).then(([c]) => {
      setCliente(c);
      setEditForm(c);
      setObservacoesText(c.observacoes || '');
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      await gsApi.put(`/clientes/${id}`, { ...editForm, observacoes: observacoesText });
      setCliente((prev) => prev ? { ...prev, ...editForm, observacoes: observacoesText } : prev);
      setEditing(false);
    } catch {
      setCliente((prev) => prev ? { ...prev, ...editForm, observacoes: observacoesText } : prev);
      setEditing(false);
    }
    setSaving(false);
  }

  function startEdit() {
    setEditForm(cliente || {});
    setEditing(true);
  }

  function cancelEdit() {
    setEditForm(cliente || {});
    setObservacoesText(cliente?.observacoes || '');
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Activity size={28} className="text-slate-300 animate-pulse" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-slate-400">Cliente não encontrado.</p>
        <Link href="/gs/clientes" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">Voltar</Link>
      </div>
    );
  }

  const tabs: { key: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'pedidos', label: 'Pedidos', icon: <ShoppingBag size={16} />, count: MOCK_PEDIDOS.length },
    { key: 'agenda', label: 'Agenda', icon: <Calendar size={16} />, count: MOCK_AGENDA.length },
    { key: 'documentos', label: 'Documentos', icon: <FileText size={16} />, count: MOCK_DOCUMENTOS.length },
    { key: 'observacoes', label: 'Observações', icon: <MessageSquareText size={16} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Link
            href="/gs/clientes"
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">{cliente.nome}</h1>
              {cliente.numero_cliente && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 text-[10px] font-bold text-indigo-700">
                  <Hash size={12} />
                  #{cliente.numero_cliente}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Cadastrado em {formatDateBR(cliente.created_at.split('T')[0] || cliente.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={cancelEdit}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
              >
                <X size={16} />
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startEdit}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
              >
                <Edit size={16} />
                Editar Cliente
              </button>
              <Link
                href={`/gs/pedidos/novo?cliente_id=${id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
              >
                <Plus size={16} />
                Novo Pedido
              </Link>
              <Link
                href={`/gs/agenda/novo?cliente_id=${id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-indigo-200 text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-50 transition-all"
              >
                <Calendar size={16} />
                Novo Agendamento
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dados do Cliente */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <UserIcon size={14} />
            Dados do Cliente
          </h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400">Nome</span>
                {editing ? (
                  <input
                    type="text"
                    value={editForm.nome || ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, nome: e.target.value }))}
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                ) : (
                  <p className="text-sm font-bold text-slate-800">{cliente.nome}</p>
                )}
              </div>
              <div>
                <span className="text-[10px] text-slate-400">CPF/CNPJ</span>
                {editing ? (
                  <input
                    type="text"
                    value={editForm.cpf_cnpj || ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, cpf_cnpj: e.target.value }))}
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-700">{maskCPF(cliente.cpf_cnpj)}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Mail size={10} /> Email
                </span>
                {editing ? (
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                ) : (
                  <p className="text-sm text-slate-700">{cliente.email}</p>
                )}
              </div>
              <div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Phone size={10} /> Telefone
                </span>
                {editing ? (
                  <input
                    type="text"
                    value={editForm.telefone || ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, telefone: e.target.value }))}
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                ) : (
                  <p className="text-sm text-slate-700">{cliente.telefone || '—'}</p>
                )}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <MapPin size={10} /> Endereço
              </span>
              {editing ? (
                <div className="space-y-2 mt-1">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text" value={(editForm.endereco as any)?.logradouro || ''} onChange={(e) => setEditForm((p) => ({ ...p, endereco: { ...(p.endereco as any || {}), logradouro: e.target.value } }))}
                      placeholder="Logradouro" className="col-span-2 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="text" value={(editForm.endereco as any)?.numero || ''} onChange={(e) => setEditForm((p) => ({ ...p, endereco: { ...(p.endereco as any || {}), numero: e.target.value } }))}
                      placeholder="Nº" className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text" value={(editForm.endereco as any)?.bairro || ''} onChange={(e) => setEditForm((p) => ({ ...p, endereco: { ...(p.endereco as any || {}), bairro: e.target.value } }))}
                      placeholder="Bairro" className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="text" value={(editForm.endereco as any)?.cidade || ''} onChange={(e) => setEditForm((p) => ({ ...p, endereco: { ...(p.endereco as any || {}), cidade: e.target.value } }))}
                      placeholder="Cidade" className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-700">
                  {cliente.endereco
                    ? `${cliente.endereco.logradouro || ''}, ${cliente.endereco.numero || ''}${cliente.endereco.complemento ? ` - ${cliente.endereco.complemento}` : ''}${cliente.endereco.bairro ? `\n${cliente.endereco.bairro}` : ''}${cliente.endereco.cidade ? ` - ${cliente.endereco.cidade}/${cliente.endereco.uf || ''}` : ''}`
                    : '—'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Classificação */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <BookUser size={14} />
            Classificação
          </h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400">Nº Cliente</span>
                <p className="text-sm font-bold text-slate-800 flex items-center gap-1">
                  <Hash size={12} className="text-slate-300" />
                  {cliente.numero_cliente || '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Indicação</span>
                <p className="text-sm text-slate-700">{cliente.indicacao || '—'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400">Tipo Pessoa</span>
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                  <UserIcon size={12} className="text-slate-300" />
                  {cliente.tipo_pessoa === 'JURIDICA' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Unidade</span>
                <p className="text-sm text-slate-700 flex items-center gap-1">
                  <Building2 size={12} className="text-slate-300" />
                  {cliente.unidade_nome || '—'}
                </p>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Contador Responsável</span>
              <p className="text-sm text-slate-700">{cliente.contador_nome || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count != null && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    activeTab === tab.key ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {/* Pedidos Tab */}
          {activeTab === 'pedidos' && (
            <div className="space-y-3">
              {MOCK_PEDIDOS.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag size={28} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Nenhum pedido encontrado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-50">
                        <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Protocolo</th>
                        <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Produto</th>
                        <th className="text-center px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</th>
                        <th className="text-right px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor</th>
                        <th className="text-center px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {MOCK_PEDIDOS.map((p) => {
                        const st = STATUS_PEDIDO_MAP[p.status] || { label: p.status, bg: 'bg-slate-100', text: 'text-slate-600' };
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/30">
                            <td className="px-3 py-3 text-xs font-semibold text-slate-700">{p.protocolo}</td>
                            <td className="px-3 py-3 text-xs text-slate-500">{p.produto}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold ${st.bg} ${st.text}`}>{st.label}</span>
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-500">{p.data}</td>
                            <td className="px-3 py-3 text-xs text-right font-bold text-slate-700">{formatBRL(p.valor)}</td>
                            <td className="px-3 py-3 text-center">
                              <Link href={`/gs/pedidos/${p.id}`} className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700">Detalhes</Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Agenda Tab */}
          {activeTab === 'agenda' && (
            <div className="space-y-3">
              {MOCK_AGENDA.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar size={28} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Nenhum agendamento encontrado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-50">
                        <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</th>
                        <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hora</th>
                        <th className="text-center px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Agente</th>
                        <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Serviço</th>
                        <th className="text-center px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {MOCK_AGENDA.map((a) => {
                        const st = AGENDA_STATUS_UI[a.status as keyof typeof AGENDA_STATUS_UI] || { label: a.status, bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-300' };
                        return (
                          <tr key={a.id} className="hover:bg-slate-50/30">
                            <td className="px-3 py-3 text-xs text-slate-700">{a.data}</td>
                            <td className="px-3 py-3 text-xs text-slate-700">{a.hora}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${st.bg} ${st.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                {st.label}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-500">{a.agente_nome}</td>
                            <td className="px-3 py-3 text-xs text-slate-500">
                              {SERVICO_LABELS[a.tipo_servico as keyof typeof SERVICO_LABELS] || a.tipo_servico}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <Link href="/gs/agenda" className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700">Ver na Agenda</Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Documentos Tab */}
          {activeTab === 'documentos' && (
            <div className="space-y-2">
              {MOCK_DOCUMENTOS.length === 0 ? (
                <div className="text-center py-8">
                  <FileText size={28} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Nenhum documento encontrado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MOCK_DOCUMENTOS.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                        <FileSpreadsheet size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{d.nome}</p>
                        <p className="text-[10px] text-slate-400">{d.data}</p>
                      </div>
                      <a
                        href={d.url}
                        className="px-3 py-1.5 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        Visualizar
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Observações Tab */}
          {activeTab === 'observacoes' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Anotações sobre o cliente</p>
                {!editing && (
                  <button
                    onClick={startEdit}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Edit size={12} /> Editar
                  </button>
                )}
              </div>
              <textarea
                value={observacoesText}
                onChange={(e) => setObservacoesText(e.target.value)}
                disabled={!editing}
                placeholder="Adicione observações sobre o cliente..."
                rows={6}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
              {editing && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    <Save size={14} />
                    {saving ? 'Salvando...' : 'Salvar Observações'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
