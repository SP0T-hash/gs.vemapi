'use client';

import { Check, Circle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { TRACKING_STATUS_MAP, type ClientTimelineEvent, type ClientStatus } from '@/types/tracking.types';

/**
 * Timeline de Acompanhamento
 *
 * Exibe a linha do tempo do pedido com design system AC ANGRY v2.0.
 * Cada evento mostra: data/hora, título, descrição e ícone de status.
 *
 * LGPD: exibe apenas dados não-sensíveis e necessários ao acompanhamento.
 */
interface Props {
  events: ClientTimelineEvent[];
  currentStatus: ClientStatus;
}

export function TrackingTimeline({ events, currentStatus }: Props) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <p className="text-sm text-slate-400">Nenhum evento registrado até o momento.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">
        Linha do Tempo
      </h2>

      <ol className="relative space-y-0" role="list" aria-label="Linha do tempo do pedido">
        {events.map((event, index) => (
          <TimelineItem
            key={`${event.type}-${index}`}
            event={event}
            isFirst={index === 0}
            isLast={index === events.length - 1}
            isError={event.isError}
            isCurrent={event.isCurrent}
          />
        ))}
      </ol>
    </div>
  );
}

/**
 * Item individual da timeline
 */
function TimelineItem({
  event,
  isFirst,
  isLast,
  isError,
  isCurrent,
}: {
  event: ClientTimelineEvent;
  isFirst: boolean;
  isLast: boolean;
  isError: boolean;
  isCurrent: boolean;
}) {
  return (
    <li className="relative flex gap-4 pb-2">
      {/* Coluna do ícone/linha */}
      <div className="flex flex-col items-center">
        <div
          className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0
            ${isCurrent
              ? isError
                ? 'bg-red-50 border-red-400 text-red-600'
                : 'bg-emerald-50 border-emerald-400 text-emerald-600'
              : 'bg-white border-slate-200 text-slate-400'
            }
            ${isCurrent && !isError ? 'animate-pulse' : ''}
          `}
          aria-hidden="true"
        >
          {isCurrent ? (
            isError ? (
              <AlertTriangle size={14} />
            ) : (
              <Loader2 size={14} className="animate-spin" />
            )
          ) : isError ? (
            <XCircle size={14} />
          ) : (
            <Check size={14} />
          )}
        </div>

        {/* Linha conectora */}
        {!isLast && (
          <div
            className={`w-0.5 flex-1 min-h-[24px] ${
              !isError ? 'bg-emerald-200' : 'bg-red-200'
            }`}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Conteúdo */}
      <div className={`pb-6 flex-1 ${isLast ? 'pb-0' : ''}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className={`text-sm font-bold ${
                isCurrent
                  ? isError
                    ? 'text-red-700'
                    : 'text-emerald-700'
                  : 'text-slate-600'
              }`}
            >
              {event.title}
              {isCurrent && !isError && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">
                  Atual
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {event.description}
            </p>
          </div>
          <time
            dateTime={event.ocorridoEm}
            className="text-[10px] font-mono font-semibold text-slate-400 shrink-0 mt-0.5"
          >
            {formatDateTime(event.ocorridoEm)}
          </time>
        </div>
      </div>
    </li>
  );
}

function formatDateTime(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
