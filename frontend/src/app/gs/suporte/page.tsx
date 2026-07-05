'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gsApi } from '@/lib/gs/auth';
import { Activity, Plus, Search, ArrowUpRight, MessageSquare } from 'lucide-react';

type TicketTab = 'TODOS' | 'ABERTOS' | 'EM_ANDAMENTO' | 'RESOLVIDOS' | 'FECHADOS';
type Prioridade = 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAIXA';
type TicketStatus = 'ABERTO' | 'EM_ANALISE' | 'AGUARDANDO_CLIENTE' | 'RESOLVIDO' | 'FECHADO';

interface Ticket {
  id: string;
  titulo: string;
  status: TicketStatus;
  prioridade: Prioridade;
  cliente: string;
  data: string;
  responsavel: string;
  descricao: string;
}

const TAB_LABELS: Record<TicketTab, string> = {
  TODOS: 'Todos',
  ABERTOS: 'Abertos',
  EM_ANDAMENTO: 'Em Andamento',
  RESOLVIDOS: 'Resolvidos',
  FECHADOS: 'Fechados',
};

const STATUS_UI: Record<TicketStatus, { label: string; bg: string; text: string }> = {
  ABERTO:             { label: 'Aberto',          bg: 'bg-red-50',     text: 'text-red-700' },
  EM_ANALISE:         { label: 'Em Análise',      bg: 'bg-amber-50',   text: 'text-amber-700' },
  AGUARDANDO_CLIENTE: { label: 'Aguard. Cliente', bg: 'bg-blue-50',    text: 'text-blue-700' },
  RESOLVIDO:          { label: 'Resolvido',       bg: 'bg-emerald-50', text: 'text-emerald-700' },
  FECHADO:            { label: 'Fechado',         bg: 'bg-slate-100',  text: 'text-slate-500' },
};

const PRIORIDADE_UI: Record<Prioridade, { label: string; bg: string; text: string }> = {
  URGENTE: { label: 'Urgente', bg: 'bg-red-50',    text: 'text-red-700' },
  ALTA:    { label: 'Alta',    bg: 'bg-amber-50',   text: 'text-amber-700' },
  MEDIA:   { label: 'Média',   bg: 'bg-blue-50',    text: 'text-blue-700' },
  BAIXA:   { label: 'Baixa',   bg: 'bg-slate-100',  text: 'text-slate-500' },
};

const MOCK_TICKETS: Ticket[] = [
  { id: '1', titulo: 'Certificado não instalou no Windows', status: 'ABERTO', prioridade: 'URGENTE', cliente: 'Tech Solutions', data: '05/07/2026', responsavel: '—', descricao: 'Cliente relatou erro 0x8009000d ao tentar importar o PFX.' },
  { id: '2', titulo: 'Dúvida sobre renovação PF A3',       status: 'EM_ANALISE', prioridade: 'MEDIA', cliente: 'Maria Silva', data: '04/07/2026', responsavel: 'Carlos', descricao: 'Cliente quer saber se precisa comparecer presencialmente.' },
  { id: '3', titulo: 'Nota fiscal não emitida',             status: 'AGUARDANDO_CLIENTE', prioridade: 'ALTA', cliente: 'Beta Construções', data: '03/07/2026', responsavel: 'Ana', descricao: 'NF do pedido #4421 consta como pendente há 5 dias.' },
  { id: '4', titulo: 'Videoconferência não agendada',       status: 'RESOLVIDO', prioridade: 'BAIXA', cliente: 'João Santos', data: '02/07/2026', responsavel: 'Carlos', descricao: 'Horário agendado para 08/07 às 14h.' },
  { id: '5', titulo: 'Erro no login do sistema GS',        status: 'FECHADO', prioridade: 'ALTA', cliente: 'Admin AR', data: '01/07/2026', responsavel: 'Suporte', descricao: 'Problema resolvido após limpeza de cache do navegador.' },
  { id: '6', titulo: 'Reembolso de certificado cancelado', status: 'ABERTO', prioridade: 'MEDIA', cliente: 'Delta Tech', data: '30/06/2026', responsavel: '—', descricao: 'Cliente solicita estorno do pedido #4389.' },
];

function statusFilter(tab: TicketTab, status: TicketStatus): boolean {
  if (tab === 'TODOS') return true;
  if (tab === 'ABERTOS') return status === 'ABERTO';
  if (tab === 'EM_ANDAMENTO') return status === 'EM_ANALISE' || status === 'AGUARDANDO_CLIENTE';
  if (tab === 'RESOLVIDOS') return status === 'RESOLVIDO';
  if (tab === 'FECHADOS') return status === 'FECHADO';
  return true;
}

export default function SuportePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TicketTab>('TODOS');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    gsApi.get<Ticket[]>('/suporte')
      .then(setTickets)
      .catch(() => setTickets(MOCK_TICKETS))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tickets.filter((t) => statusFilter(tab, t.status));

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
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Suporte</h1>
          <p className="text-sm text-slate-400 mt-1">{tickets.length} tickets registrados</p>
        </div>
        <Link
          href="/gs/suporte/novo"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
        >
          <Plus size={16} />
          Novo Ticket
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(Object.keys(TAB_LABELS) as TicketTab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedTicket(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
              tab === t
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Ticket list or detail */}
      {selectedTicket ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">{selectedTicket.titulo}</h2>
              <p className="text-xs text-slate-400 mt-1">
                {selectedTicket.cliente} • {selectedTicket.data}
              </p>
            </div>
            <button
              onClick={() => setSelectedTicket(null)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Voltar
            </button>
          </div>
          <div className="flex gap-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${STATUS_UI[selectedTicket.status].bg} ${STATUS_UI[selectedTicket.status].text}`}>
              {STATUS_UI[selectedTicket.status].label}
            </span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${PRIORIDADE_UI[selectedTicket.prioridade].bg} ${PRIORIDADE_UI[selectedTicket.prioridade].text}`}>
              {PRIORIDADE_UI[selectedTicket.prioridade].label}
            </span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{selectedTicket.descricao}</p>
          <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-100">
            <span>Responsável: <strong className="text-slate-700">{selectedTicket.responsavel}</strong></span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="text-left bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${STATUS_UI[ticket.status].bg} ${STATUS_UI[ticket.status].text}`}>
                    {STATUS_UI[ticket.status].label}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${PRIORIDADE_UI[ticket.prioridade].bg} ${PRIORIDADE_UI[ticket.prioridade].text}`}>
                    {PRIORIDADE_UI[ticket.prioridade].label}
                  </span>
                </div>
                <ArrowUpRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
              </div>

              <h3 className="text-sm font-bold text-slate-800 mb-2">{ticket.titulo}</h3>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <MessageSquare size={13} className="text-slate-300" />
                  {ticket.cliente}
                </span>
                <span>{ticket.data}</span>
              </div>

              {ticket.responsavel !== '—' && (
                <p className="text-[10px] text-slate-400 mt-2">
                  Responsável: {ticket.responsavel}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && !selectedTicket && (
        <div className="text-center py-12">
          <p className="text-sm text-slate-400">Nenhum ticket encontrado nesta aba.</p>
        </div>
      )}
    </div>
  );
}
