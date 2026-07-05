'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { gsApi } from '@/lib/gs/auth';
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  X,
  UserCheck,
  UserX,
  CheckCircle2,
  ExternalLink,
  ShoppingBag,
  Activity,
  RefreshCw,
  FileText,
  Phone,
  Mail,
  AlertTriangle,
  CalendarDays,
} from 'lucide-react';
import {
  type GS_Agendamento,
  type AgendaStatus,
  type TipoServico,
  AGENDA_STATUS_UI,
  SERVICO_LABELS,
  getDiaSemana,
} from '@/types/gs/agenda';

type FilterStatus = 'TODOS' | AgendaStatus;
type ViewMode = 'DAY' | 'WEEK';

const FILTER_STATUS: { key: FilterStatus; label: string }[] = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'AGENDADO', label: 'Agendado' },
  { key: 'CONFIRMADO', label: 'Confirmado' },
  { key: 'ATENDIDO', label: 'Atendido' },
  { key: 'NAO_COMPARECEU', label: 'Não Compareceu' },
];

const UNIDADES = ['Todas', 'Matriz São Paulo', 'Filial Campinas', 'Filial Rio de Janeiro', 'Filial Belo Horizonte'];
const AGENTES = ['Todos', 'Carlos Silva', 'Ana Oliveira', 'Pedro Santos', 'Marina Costa'];

const MOCK_AGENDAMENTOS: GS_Agendamento[] = [
  { id: '1', ar_id: 'ar1', cliente_nome: 'Maria Silva', cliente_telefone: '(11) 99999-0001', cliente_email: 'maria@email.com', cliente_numero: '1234/26', data: '2026-07-05', hora: '08:30', hora_fim: '09:00', tipo_servico: 'CERTIFICADO', status: 'CONFIRMADO', agente_nome: 'Carlos Silva', unidade_nome: 'Matriz São Paulo', unidade_id: 'u1', usuario_id: 'u1', created_at: '', updated_at: '', indicacao: 'João Santos' },
  { id: '2', ar_id: 'ar1', cliente_nome: 'João Santos', cliente_telefone: '(11) 99999-0002', cliente_email: 'joao@email.com', data: '2026-07-05', hora: '09:00', hora_fim: '09:30', tipo_servico: 'RENOVACAO', status: 'AGENDADO', agente_nome: 'Ana Oliveira', unidade_nome: 'Matriz São Paulo', unidade_id: 'u1', usuario_id: 'u2', created_at: '', updated_at: '' },
  { id: '3', ar_id: 'ar1', cliente_nome: 'Tech Solutions Ltda', cliente_telefone: '(11) 99999-0003', cliente_email: 'contato@techsol.com', cliente_numero: '5678/26', data: '2026-07-05', hora: '10:00', hora_fim: '10:45', tipo_servico: 'CERTIFICADO', status: 'CONFIRMADO', agente_nome: 'Pedro Santos', unidade_nome: 'Filial Campinas', unidade_id: 'u2', usuario_id: 'u3', created_at: '', updated_at: '', indicacao: 'Indicação própria' },
  { id: '4', ar_id: 'ar1', cliente_nome: 'Ana Oliveira', data: '2026-07-05', hora: '11:00', hora_fim: '11:30', tipo_servico: 'ORCAMENTO', status: 'ATENDIDO', agente_nome: 'Carlos Silva', unidade_nome: 'Matriz São Paulo', unidade_id: 'u1', usuario_id: 'u1', created_at: '', updated_at: '' },
  { id: '5', ar_id: 'ar1', cliente_nome: 'Carlos Pereira', data: '2026-07-05', hora: '13:00', hora_fim: '13:30', tipo_servico: 'SUPORTE', status: 'AGENDADO', agente_nome: 'Marina Costa', unidade_nome: 'Filial Rio de Janeiro', unidade_id: 'u3', usuario_id: 'u4', created_at: '', updated_at: '' },
  { id: '6', ar_id: 'ar1', cliente_nome: 'Beta Construções', cliente_telefone: '(11) 99999-0006', cliente_email: 'beta@construcoes.com', data: '2026-07-05', hora: '14:00', hora_fim: '14:30', tipo_servico: 'CERTIFICADO', status: 'NAO_COMPARECEU', agente_nome: 'Ana Oliveira', unidade_nome: 'Matriz São Paulo', unidade_id: 'u1', usuario_id: 'u2', created_at: '', updated_at: '' },
  { id: '7', ar_id: 'ar1', cliente_nome: 'Fernanda Lima', data: '2026-07-05', hora: '15:00', hora_fim: '15:30', tipo_servico: 'ENTREGA', status: 'AGENDADO', agente_nome: 'Pedro Santos', unidade_nome: 'Filial Belo Horizonte', unidade_id: 'u4', usuario_id: 'u3', created_at: '', updated_at: '' },
  { id: '8', ar_id: 'ar1', cliente_nome: 'Delta Tech', data: '2026-07-05', hora: '16:00', hora_fim: '16:30', tipo_servico: 'CERTIFICADO', status: 'AGENDADO', agente_nome: 'Carlos Silva', unidade_nome: 'Matriz São Paulo', unidade_id: 'u1', usuario_id: 'u1', created_at: '', updated_at: '' },
  { id: '9', ar_id: 'ar1', cliente_nome: 'Gabriel Souza', data: '2026-07-06', hora: '09:00', hora_fim: '09:30', tipo_servico: 'RENOVACAO', status: 'AGENDADO', agente_nome: 'Ana Oliveira', unidade_nome: 'Matriz São Paulo', unidade_id: 'u1', usuario_id: 'u2', created_at: '', updated_at: '' },
  { id: '10', ar_id: 'ar1', cliente_nome: 'Helena Costa', data: '2026-07-06', hora: '10:30', hora_fim: '11:00', tipo_servico: 'CERTIFICADO', status: 'CONFIRMADO', agente_nome: 'Carlos Silva', unidade_nome: 'Filial Campinas', unidade_id: 'u2', usuario_id: 'u1', created_at: '', updated_at: '' },
  { id: '11', ar_id: 'ar1', cliente_nome: 'Igor Almeida', data: '2026-07-07', hora: '14:00', hora_fim: '14:30', tipo_servico: 'ORCAMENTO', status: 'AGENDADO', agente_nome: 'Marina Costa', unidade_nome: 'Matriz São Paulo', unidade_id: 'u1', usuario_id: 'u4', created_at: '', updated_at: '' },
  { id: '12', ar_id: 'ar1', cliente_nome: 'Julia Martins', data: '2026-07-07', hora: '08:30', hora_fim: '09:00', tipo_servico: 'CERTIFICADO', status: 'AGENDADO', agente_nome: 'Pedro Santos', unidade_nome: 'Matriz São Paulo', unidade_id: 'u1', usuario_id: 'u3', created_at: '', updated_at: '' },
];

export default function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState<GS_Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('DAY');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('TODOS');
  const [filterUnidade, setFilterUnidade] = useState('Todas');
  const [filterAgente, setFilterAgente] = useState('Todos');
  const [selectedAgendamento, setSelectedAgendamento] = useState<GS_Agendamento | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; agendamento: GS_Agendamento } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    gsApi.get<GS_Agendamento[]>('/agenda')
      .then(setAgendamentos)
      .catch(() => setAgendamentos(MOCK_AGENDAMENTOS))
      .finally(() => setLoading(false));
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  function isToday(d: Date) {
    return d.toDateString() === today.toDateString();
  }

  function changeDate(delta: number) {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta);
    setSelectedDate(next);
  }

  function goToToday() {
    setSelectedDate(new Date());
  }

  const dateKey = selectedDate.toISOString().split('T')[0];

  function getWeekDates(): Date[] {
    const start = new Date(selectedDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    const dates: Date[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }

  function getAppointmentsForDay(date: Date): GS_Agendamento[] {
    const key = date.toISOString().split('T')[0];
    return agendamentos.filter((a) => {
      if (a.data !== key) return false;
      if (filterStatus !== 'TODOS' && a.status !== filterStatus) return false;
      if (filterUnidade !== 'Todas' && a.unidade_nome !== filterUnidade) return false;
      if (filterAgente !== 'Todos' && a.agente_nome !== filterAgente) return false;
      return true;
    });
  }

  function getHourFromTime(time: string): number {
    return parseInt(time.split(':')[0], 10);
  }

  function getMinuteFromTime(time: string): number {
    return parseInt(time.split(':')[1], 10);
  }

  const dayAppointments = useMemo(() => getAppointmentsForDay(selectedDate), [selectedDate, agendamentos, filterStatus, filterUnidade, filterAgente]);

  const stats = useMemo(() => {
    const total = dayAppointments.length;
    const agendado = dayAppointments.filter((a) => a.status === 'AGENDADO').length;
    const confirmado = dayAppointments.filter((a) => a.status === 'CONFIRMADO').length;
    const atendido = dayAppointments.filter((a) => a.status === 'ATENDIDO').length;
    const naoCompareceu = dayAppointments.filter((a) => a.status === 'NAO_COMPARECEU').length;
    return { total, agendado, confirmado, atendido, naoCompareceu };
  }, [dayAppointments]);

  const hours = Array.from({ length: 11 }, (_, i) => i + 8);

  function getAppointmentStyle(a: GS_Agendamento) {
    const hour = getHourFromTime(a.hora);
    const minute = getMinuteFromTime(a.hora);
    const top = (minute / 60) * 100;
    const endHour = a.hora_fim ? getHourFromTime(a.hora_fim) : hour + 1;
    const endMinute = a.hora_fim ? getMinuteFromTime(a.hora_fim) : 0;
    const durationMinutes = (endHour - hour) * 60 + (endMinute - minute);
    const height = Math.max((durationMinutes / 60) * 100, 25);
    return { top: `${top}%`, height: `${height}%` };
  }

  async function handleStatusChange(agendamento: GS_Agendamento, newStatus: AgendaStatus, extra?: Record<string, string>) {
    setActionLoading(true);
    try {
      await gsApi.put(`/agenda/${agendamento.id}`, { status: newStatus, ...extra });
      setAgendamentos((prev) => prev.map((a) => a.id === agendamento.id ? { ...a, status: newStatus, ...extra } : a));
    } catch {
      setAgendamentos((prev) => prev.map((a) => a.id === agendamento.id ? { ...a, status: newStatus, ...extra } : a));
    }
    setActionLoading(false);
    setConfirmAction(null);
    setSelectedAgendamento(null);
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
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Agenda</h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie os agendamentos de atendimento</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-100 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setViewMode('DAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'DAY' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Dia
            </button>
            <button
              onClick={() => setViewMode('WEEK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'WEEK' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Semana
            </button>
          </div>
          <Link
            href="/gs/agenda/novo"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <Plus size={16} />
            Novo Agendamento
          </Link>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
            aria-label="Dia anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goToToday}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isToday(selectedDate) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Hoje
          </button>
          <button
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
            aria-label="Próximo dia"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-800">
            {getDiaSemana(selectedDate)}, {selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="w-[88px]" />
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Filter size={14} />
          Filtros
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterUnidade}
            onChange={(e) => setFilterUnidade(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {UNIDADES.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {FILTER_STATUS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  filterStatus === f.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <select
            value={filterAgente}
            onChange={(e) => setFilterAgente(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {AGENTES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total do dia', value: stats.total, color: 'text-slate-800', bg: 'bg-white' },
          { label: 'Agendados', value: stats.agendado, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Confirmados', value: stats.confirmado, color: 'text-indigo-700', bg: 'bg-indigo-50' },
          { label: 'Atendidos', value: stats.atendido, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Não Compareceram', value: stats.naoCompareceu, color: 'text-red-700', bg: 'bg-red-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border border-slate-100 rounded-2xl p-4 shadow-sm text-center`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${s.color}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      {viewMode === 'DAY' ? (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="relative">
            {hours.map((hour) => {
              const hourAppointments = dayAppointments.filter((a) => getHourFromTime(a.hora) === hour);
              return (
                <div key={hour} className="flex border-b border-slate-50 min-h-[80px] group">
                  <div className="w-20 shrink-0 px-3 py-3 text-xs font-bold text-slate-400 border-r border-slate-50 flex items-start pt-3">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                  <div className="flex-1 relative px-2 py-1">
                    {hourAppointments.map((a) => {
                      const st = AGENDA_STATUS_UI[a.status];
                      const style = getAppointmentStyle(a);
                      return (
                        <button
                          key={a.id}
                          onClick={() => setSelectedAgendamento(a)}
                          className="absolute left-2 right-2 rounded-xl border p-2.5 cursor-pointer hover:shadow-md transition-all text-left overflow-hidden"
                          style={{
                            top: style.top,
                            height: style.height,
                            borderColor: st.dot.replace('bg-', 'border-').replace('-400', '-200'),
                            backgroundColor: st.bg,
                          }}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`w-2 h-2 rounded-full ${st.dot} shrink-0`} />
                            <span className="text-[10px] font-bold text-slate-700">{a.hora}{a.hora_fim ? ` - ${a.hora_fim}` : ''}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 truncate">{a.cliente_nome}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${st.text}`}>{SERVICO_LABELS[a.tipo_servico]}</span>
                            {a.agente_nome && (
                              <span className="text-[9px] text-slate-400 truncate">{a.agente_nome}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {dayAppointments.length === 0 && (
              <div className="text-center py-16">
                <Calendar size={40} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Nenhum agendamento para este dia.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <WeekView
          weekDates={getWeekDates()}
          agendamentos={agendamentos}
          filterStatus={filterStatus}
          filterUnidade={filterUnidade}
          filterAgente={filterAgente}
          onSelectAppointment={setSelectedAgendamento}
        />
      )}

      {/* Detail Modal */}
      {selectedAgendamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSelectedAgendamento(null)} />
          <div className="relative bg-white border border-slate-100 rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-slate-800">Detalhes do Agendamento</h2>
              <button
                onClick={() => setSelectedAgendamento(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Status badge */}
              <div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold ${AGENDA_STATUS_UI[selectedAgendamento.status].bg} ${AGENDA_STATUS_UI[selectedAgendamento.status].text}`}>
                  <span className={`w-2 h-2 rounded-full ${AGENDA_STATUS_UI[selectedAgendamento.status].dot}`} />
                  {AGENDA_STATUS_UI[selectedAgendamento.status].label}
                </span>
              </div>

              {/* Client info */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</h3>
                <p className="text-sm font-bold text-slate-800">{selectedAgendamento.cliente_nome}</p>
                {selectedAgendamento.cliente_numero && (
                  <p className="text-xs text-slate-400">Nº {selectedAgendamento.cliente_numero}</p>
                )}
                {selectedAgendamento.cliente_telefone && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Phone size={12} className="text-slate-300" /> {selectedAgendamento.cliente_telefone}
                  </p>
                )}
                {selectedAgendamento.cliente_email && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Mail size={12} className="text-slate-300" /> {selectedAgendamento.cliente_email}
                  </p>
                )}
              </div>

              {/* Appointment info */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Agendamento</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-slate-400">Data</span>
                    <p className="font-semibold text-slate-700">{new Date(selectedAgendamento.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Horário</span>
                    <p className="font-semibold text-slate-700">{selectedAgendamento.hora}{selectedAgendamento.hora_fim ? ` - ${selectedAgendamento.hora_fim}` : ''}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Serviço</span>
                    <p className="font-semibold text-slate-700">{SERVICO_LABELS[selectedAgendamento.tipo_servico]}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Unidade</span>
                    <p className="font-semibold text-slate-700">{selectedAgendamento.unidade_nome || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Attendance info */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Atendimento</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-slate-400">Agente</span>
                    <p className="font-semibold text-slate-700">{selectedAgendamento.agente_nome || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Indicação</span>
                    <p className="font-semibold text-slate-700">{selectedAgendamento.indicacao || '—'}</p>
                  </div>
                </div>
                {selectedAgendamento.observacoes && (
                  <div>
                    <span className="text-xs text-slate-400">Observações</span>
                    <p className="text-sm text-slate-600 mt-0.5">{selectedAgendamento.observacoes}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ações</p>
                <div className="grid grid-cols-2 gap-2">
                  {selectedAgendamento.status === 'AGENDADO' && (
                    <button
                      onClick={() => setConfirmAction({ type: 'confirmar', agendamento: selectedAgendamento })}
                      disabled={actionLoading}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} /> Confirmar
                    </button>
                  )}
                  {(selectedAgendamento.status === 'AGENDADO' || selectedAgendamento.status === 'CONFIRMADO') && (
                    <button
                      onClick={() => setConfirmAction({ type: 'atender', agendamento: selectedAgendamento })}
                      disabled={actionLoading}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                    >
                      <UserCheck size={14} /> Atendido
                    </button>
                  )}
                  {(selectedAgendamento.status === 'AGENDADO' || selectedAgendamento.status === 'CONFIRMADO') && (
                    <button
                      onClick={() => setConfirmAction({ type: 'nao_compareceu', agendamento: selectedAgendamento })}
                      disabled={actionLoading}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                    >
                      <UserX size={14} /> Não Compareceu
                    </button>
                  )}
                  {selectedAgendamento.status === 'AGENDADO' && (
                    <button
                      onClick={() => setConfirmAction({ type: 'reagendar', agendamento: selectedAgendamento })}
                      disabled={actionLoading}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                    >
                      <RefreshCw size={14} /> Reagendar
                    </button>
                  )}
                  {(selectedAgendamento.status === 'AGENDADO' || selectedAgendamento.status === 'CONFIRMADO') && (
                    <button
                      onClick={() => setConfirmAction({ type: 'cancelar', agendamento: selectedAgendamento })}
                      disabled={actionLoading}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                    >
                      <X size={14} /> Cancelar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {selectedAgendamento.cliente_id && (
                    <Link
                      href={`/gs/clientes/${selectedAgendamento.cliente_id}`}
                      onClick={() => setSelectedAgendamento(null)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all"
                    >
                      <ExternalLink size={14} /> Ver Cliente
                    </Link>
                  )}
                  {selectedAgendamento.cliente_id && (
                    <Link
                      href={`/gs/pedidos/novo?cliente=${selectedAgendamento.cliente_id}`}
                      onClick={() => setSelectedAgendamento(null)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all"
                    >
                      <ShoppingBag size={14} /> Criar Pedido
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setConfirmAction(null)} />
          <div className="relative bg-white border border-slate-100 rounded-2xl shadow-modal w-full max-w-sm p-6 z-10">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className="text-amber-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Confirmar Ação</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {confirmAction.type === 'confirmar' && 'Confirmar agendamento de ' + confirmAction.agendamento.cliente_nome + '?'}
                  {confirmAction.type === 'atender' && 'Marcar ' + confirmAction.agendamento.cliente_nome + ' como atendido?'}
                  {confirmAction.type === 'nao_compareceu' && 'Registrar que ' + confirmAction.agendamento.cliente_nome + ' não compareceu?'}
                  {confirmAction.type === 'reagendar' && 'Reagendar o atendimento de ' + confirmAction.agendamento.cliente_nome + '?'}
                  {confirmAction.type === 'cancelar' && 'Cancelar o agendamento de ' + confirmAction.agendamento.cliente_nome + '?'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  const statusMap: Record<string, AgendaStatus> = {
                    confirmar: 'CONFIRMADO',
                    atender: 'ATENDIDO',
                    nao_compareceu: 'NAO_COMPARECEU',
                    reagendar: 'REAGENDADO',
                    cancelar: 'CANCELADO',
                  };
                  handleStatusChange(confirmAction.agendamento, statusMap[confirmAction.type] || 'CANCELADO');
                }}
                disabled={actionLoading}
                className={`px-4 py-2 text-xs font-bold rounded-xl text-white transition-all ${
                  confirmAction.type === 'cancelar' || confirmAction.type === 'nao_compareceu'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmAction.type === 'reagendar'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                } disabled:opacity-50`}
              >
                {actionLoading ? 'Aguarde...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WeekView({
  weekDates,
  agendamentos,
  filterStatus,
  filterUnidade,
  filterAgente,
  onSelectAppointment,
}: {
  weekDates: Date[];
  agendamentos: GS_Agendamento[];
  filterStatus: FilterStatus;
  filterUnidade: string;
  filterAgente: string;
  onSelectAppointment: (a: GS_Agendamento) => void;
}) {
  const hours = Array.from({ length: 11 }, (_, i) => i + 8);
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

  function getAppointments(date: Date) {
    const key = date.toISOString().split('T')[0];
    return agendamentos.filter((a) => {
      if (a.data !== key) return false;
      if (filterStatus !== 'TODOS' && a.status !== filterStatus) return false;
      if (filterUnidade !== 'Todas' && a.unidade_nome !== filterUnidade) return false;
      if (filterAgente !== 'Todos' && a.agente_nome !== filterAgente) return false;
      return true;
    });
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Header */}
          <div className="flex border-b border-slate-100">
            <div className="w-20 shrink-0 border-r border-slate-50" />
            {weekDates.map((date, i) => {
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div key={i} className="flex-1 px-2 py-3 text-center border-r border-slate-50 last:border-r-0">
                  <p className={`text-xs font-bold ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>{days[i]}</p>
                  <p className={`text-lg font-black ${isToday ? 'text-indigo-600' : 'text-slate-700'}`}>
                    {date.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Body */}
          {hours.map((hour) => (
            <div key={hour} className="flex border-b border-slate-50 min-h-[60px]">
              <div className="w-20 shrink-0 px-3 py-2 text-xs font-bold text-slate-400 border-r border-slate-50">
                {String(hour).padStart(2, '0')}:00
              </div>
              {weekDates.map((date, i) => {
                const apps = getAppointments(date).filter((a) => parseInt(a.hora.split(':')[0], 10) === hour);
                return (
                  <div key={i} className="flex-1 px-1 py-1 border-r border-slate-50 last:border-r-0 space-y-1">
                    {apps.map((a) => {
                      const st = AGENDA_STATUS_UI[a.status];
                      return (
                        <button
                          key={a.id}
                          onClick={() => onSelectAppointment(a)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg border ${st.bg} hover:shadow-sm transition-all cursor-pointer`}
                          style={{ borderColor: st.dot.replace('bg-', 'border-').replace('-400', '-200') }}
                        >
                          <div className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot} shrink-0`} />
                            <span className="text-[9px] font-bold text-slate-600">{a.hora}</span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-800 truncate">{a.cliente_nome}</p>
                          <p className="text-[8px] text-slate-400 truncate">{SERVICO_LABELS[a.tipo_servico]}</p>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
