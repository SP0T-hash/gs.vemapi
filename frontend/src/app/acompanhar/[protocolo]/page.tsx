'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Clock,
  User,
  FileText,
  Server,
  ShieldCheck,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { TrackingTimeline } from '@/components/client-tracking/TrackingTimeline';
import { TRACKING_STATUS_MAP, type TrackingData, type ClientStatus } from '@/types/tracking.types';

const POLLING_INTERVAL = 15_000; // 15 segundos

/**
 * Página de Detalhes do Acompanhamento
 *
 * Exibe o andamento em tempo real do pedido de certificado digital.
 * Faz polling a cada 15s para atualizar os dados.
 *
 * LGPD: exibe apenas dados não-sensíveis (CPF mascarado).
 * ICP-Brasil: status reflete o ciclo de vida do certificado.
 */
export default function TrackingDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const protocolo = params?.protocolo as string;
  const cpf = searchParams?.get('cpf') ?? '';

  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Buscar dados do protocolo
  const fetchData = useCallback(async (isPolling = false) => {
    if (!protocolo || !cpf) return;

    try {
      if (isPolling) {
        setRefreshing(true);
      }

      const response = await fetch(
        `/api/ac/track?protocolo=${encodeURIComponent(protocolo)}&cpf=${encodeURIComponent(cpf)}`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ erro: 'Erro ao consultar.' }));
        throw new Error(err.erro ?? `Erro ${response.status}`);
      }

      const result: TrackingData = await response.json();
      setData(result);
      setError('');
      setLastUpdate(new Date());
    } catch (err) {
      if (!isPolling) {
        setError(err instanceof Error ? err.message : 'Erro ao consultar protocolo.');
      }
      // Em polling, silencia erros para não assustar o cliente
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [protocolo, cpf]);

  // Fetch inicial
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling automático
  useEffect(() => {
    if (loading || error) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [loading, error, fetchData]);

  // Loading state
  if (loading) {
    return <TrackingLoading protocolo={protocolo} />;
  }

  // Error state
  if (error) {
    return <TrackingError protocolo={protocolo} error={error} />;
  }

  // Dados não encontrados
  if (!data) {
    return <TrackingError protocolo={protocolo} error="Protocolo não encontrado." />;
  }

  // Status config
  const statusConfig = TRACKING_STATUS_MAP[data.status as ClientStatus]
    ?? TRACKING_STATUS_MAP.PEDIDO_RECEBIDO;
  const isError = ['DOCUMENTOS_REJEITADOS', 'CANCELADO', 'ERRO'].includes(data.status);
  const isConcluded = ['CERTIFICADO_EMITIDO', 'CERTIFICADO_ENTREGUE'].includes(data.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 shadow-[0_1px_10px_-5px_rgba(0,0,0,0.10)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/acompanhar"
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Nova Consulta
              </Link>
            </div>

            {/* Selos de conformidade */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border bg-emerald-50 text-emerald-700 border-emerald-200">
                ICP-Brasil
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border bg-indigo-50 text-indigo-700 border-indigo-200">
                LGPD
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status banner */}
        <div
          className={`rounded-2xl border p-6 mb-8 shadow-[0_1px_4px_rgba(0,0,0,0.06)] ${
            isError
              ? 'bg-red-50 border-red-200'
              : isConcluded
              ? 'bg-emerald-50 border-emerald-200'
              : `${statusConfig.bg} ${statusConfig.border}`
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isError
                  ? 'bg-red-100 text-red-600'
                  : isConcluded
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-white/80'
              }`}
              aria-hidden="true"
            >
              {isError ? (
                <AlertTriangle size={24} />
              ) : isConcluded ? (
                <ShieldCheck size={24} />
              ) : (
                <Loader2 size={24} className="animate-spin text-indigo-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className={`text-xl font-bold ${
                isError ? 'text-red-800' : isConcluded ? 'text-emerald-800' : 'text-slate-800'
              }`}>
                {isConcluded
                  ? 'Certificado Emitido com Sucesso!'
                  : isError
                  ? 'Houve um problema com seu pedido'
                  : statusConfig.label}
              </h1>
              <p className={`text-sm mt-1 ${
                isError ? 'text-red-600' : 'text-slate-500'
              }`}>
                {data.status === 'EM_ATENDIMENTO' && data.agente
                  ? `Seu atendimento está sendo realizado por ${data.agente.nome}.`
                  : `Protocolo: ${data.protocolo}`}
              </p>

              {/* Mensagens do status */}
              {data.mensagens.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {data.mensagens.map((msg, i) => (
                    <li
                      key={i}
                      className={`text-xs flex items-start gap-1.5 ${
                        isError ? 'text-red-600' : 'text-slate-500'
                      }`}
                    >
                      <span className="mt-0.5" aria-hidden="true">•</span>
                      {msg}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Atualização */}
            <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 
                           hover:text-emerald-600 transition-colors disabled:opacity-50"
                aria-label="Atualizar dados"
              >
                <RefreshCw
                  size={14}
                  className={refreshing ? 'animate-spin' : ''}
                  aria-hidden="true"
                />
                {refreshing ? 'Atualizando...' : 'Atualizar'}
              </button>
              {lastUpdate && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock size={10} aria-hidden="true" />
                  {formatTime(lastUpdate)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2">
            <TrackingTimeline
              events={data.timeline}
              currentStatus={data.status as ClientStatus}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Dados do Protocolo */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Dados do Protocolo
              </h3>

              <div className="space-y-3">
                <InfoRow
                  icon={<FileText size={14} />}
                  label="Protocolo"
                  value={data.protocolo}
                  mono
                />
                <InfoRow
                  icon={<User size={14} />}
                  label="Titular"
                  value={data.titular.nome}
                />
                <InfoRow
                  icon={<ShieldCheck size={14} />}
                  label="Documento"
                  value={data.titular.documento}
                  mono
                />
                <InfoRow
                  icon={<Server size={14} />}
                  label="Produto"
                  value={data.produto}
                />
              </div>
            </div>

            {/* Prazos */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Prazos
              </h3>

              <div className="space-y-3">
                <InfoRow
                  icon={<Clock size={14} />}
                  label="Pedido em"
                  value={formatDate(data.prazos.pedidoEm)}
                />
                {data.prazos.previsaoConclusao && (
                  <InfoRow
                    icon={<Clock size={14} />}
                    label="Conclusão"
                    value={formatDate(data.prazos.previsaoConclusao)}
                  />
                )}
                <InfoRow
                  icon={<RefreshCw size={14} />}
                  label="Atualizado em"
                  value={formatDate(data.prazos.atualizadoEm)}
                />
              </div>
            </div>

            {/* Agente */}
            {data.agente && (
              <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-[0_1px_4px_rgba(79,70,229,0.08)]">
                <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">
                  Seu Atendente
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-indigo-700">
                      {data.agente.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{data.agente.nome}</p>
                    <a
                      href={`mailto:${data.agente.email}`}
                      className="text-xs text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      {data.agente.email}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Precisa de ajuda? */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Precisa de Ajuda?
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Entre em contato com nosso suporte.
              </p>
              <a
                href="mailto:suporte@acangry.ac.br"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                suporte@acangry.ac.br
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-[10px] text-slate-400 text-center">
            AC ANGRY — Autoridade Certificadora credenciada ICP-Brasil &mdash; &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-slate-400 mt-0.5" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className={`text-sm font-medium text-slate-700 truncate ${mono ? 'font-mono' : ''}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

/**
 * Tela de Loading
 */
function TrackingLoading({ protocolo }: { protocolo: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-sm mx-auto px-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <Loader2 size={32} className="animate-spin text-emerald-600" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-bold text-slate-800 mb-2">Consultando Protocolo</h1>
        <p className="text-sm text-slate-500 mb-2 font-mono font-semibold">{protocolo}</p>
        <p className="text-xs text-slate-400">Buscando informações do seu pedido...</p>

        <Link
          href="/acompanhar"
          className="inline-flex items-center gap-1.5 mt-8 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Nova Consulta
        </Link>
      </div>
    </div>
  );
}

/**
 * Tela de Erro
 */
function TrackingError({ protocolo, error }: { protocolo: string; error: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-sm mx-auto px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} className="text-red-600" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-bold text-slate-800 mb-2">Não foi possível consultar</h1>
        <p className="text-sm text-red-600 mb-4">{error}</p>

        <div className="space-y-3">
          <Link
            href="/acompanhar"
            className="inline-flex items-center justify-center gap-2 h-11 bg-emerald-600 hover:bg-emerald-700 
                       text-white font-bold px-6 rounded-xl shadow-lg shadow-emerald-600/20 
                       transition-all duration-200 active:scale-[0.98]
                       focus-visible:outline-none focus-visible:ring-2 
                       focus-visible:ring-emerald-500 focus-visible:ring-offset-2
                       text-sm"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Tentar Novamente
          </Link>
        </div>

        {error.includes('não conferem') && (
          <p className="text-xs text-slate-400 mt-4">
            Verifique se o número do protocolo e o CPF informados estão corretos.
            O CPF deve ser o mesmo informado no momento da compra.
          </p>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
