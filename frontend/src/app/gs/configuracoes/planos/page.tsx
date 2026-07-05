'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gsApi } from '@/lib/gs/auth';
import { Activity, Plus, Search, ArrowUpRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { PLANO_NIVEL_LABELS, PLANO_NIVEL_COLORS, ASSINATURA_STATUS_MAP, formatBRL } from '@/types/gs/billing';
import type { GS_Plano, GS_Assinatura } from '@/types/gs/billing';

const MOCK_ASSINATURA: GS_Assinatura = {
  id: 'sub-1',
  ar_id: 'ar-1',
  contador_id: null,
  entidade_tipo: 'AR',
  plano_id: 'plano-pro',
  status: 'ATIVA',
  asaas_subscription_id: 'sub_asaas_001',
  asaas_customer_id: null,
  data_inicio: '01/01/2026',
  data_proximo_ciclo: '01/08/2026',
  data_cancelamento: null,
  ciclo_tipo: 'MENSAL',
  trial_ate: null,
  certs_no_ciclo: 18,
  certs_faturados: 15,
  excedente: 0,
  valor_mensal_cobrado: 297.00,
  split_percent_gs: 70,
  split_percent_ar: 30,
  dias_vencimento: 5,
};

const MOCK_PLANOS: GS_Plano[] = [
  {
    id: 'plano-basico', nome: 'Básico', slug: 'basico', descricao: 'Para pequenas ARs', publico_alvo: 'AR', nivel: 'BASICO',
    valor_mensal: 97.00, taxa_por_cert: 3.50, limite_certs: 30,
    max_usuarios: 3, max_unidades: 1, max_clientes: 200,
    integracoes: ['ANGRY'], suporte_tipo: 'EMAIL', recursos: { dashboard: true, relatorios_basicos: true },
    is_active: true, ordem: 1,
  },
  {
    id: 'plano-pro', nome: 'Profissional', slug: 'profissional', descricao: 'Para ARs em crescimento', publico_alvo: 'AR', nivel: 'PROFISSIONAL',
    valor_mensal: 197.00, taxa_por_cert: 2.50, limite_certs: 100,
    max_usuarios: 10, max_unidades: 3, max_clientes: 1000,
    integracoes: ['ANGRY', 'SAFEWEB'], suporte_tipo: 'CHAT', recursos: { dashboard: true, relatorios_avancados: true, api: true },
    is_active: true, ordem: 2,
  },
  {
    id: 'plano-enterprise', nome: 'Enterprise', slug: 'enterprise', descricao: 'Para grandes operações', publico_alvo: 'AC', nivel: 'ENTERPRISE',
    valor_mensal: 497.00, taxa_por_cert: 1.50, limite_certs: -1,
    max_usuarios: -1, max_unidades: -1, max_clientes: -1,
    integracoes: ['ANGRY', 'SAFEWEB', 'VALID', 'SYNGULAR', 'CERTISIGN'], suporte_tipo: 'PRIORITARIO', recursos: { dashboard: true, relatorios_avancados: true, api: true, whitelabel: true, biometria: true },
    is_active: true, ordem: 3,
  },
];

export default function PlanosPage() {
  const [assinatura, setAssinatura] = useState<GS_Assinatura | null>(null);
  const [planos, setPlanos] = useState<GS_Plano[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      gsApi.get<GS_Assinatura>('/assinatura').catch(() => MOCK_ASSINATURA),
      gsApi.get<GS_Plano[]>('/planos').catch(() => MOCK_PLANOS),
    ])
      .then(([sub, plans]) => {
        setAssinatura(sub);
        setPlanos(plans);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Activity size={28} className="text-slate-300 animate-pulse" />
      </div>
    );
  }

  const planoAtual = planos.find((p) => p.id === assinatura?.plano_id);
  const nivel = planoAtual?.nivel || 'BASICO';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Meu Plano</h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie sua assinatura e planos</p>
        </div>
        <Link
          href="/gs/configuracoes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft size={14} />
          Voltar
        </Link>
      </div>

      {/* Plano Atual */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-lg font-black text-slate-800">{planoAtual?.nome || 'Plano Atual'}</h2>
              {planoAtual && (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide border ${PLANO_NIVEL_COLORS[nivel].bg} ${PLANO_NIVEL_COLORS[nivel].text} ${PLANO_NIVEL_COLORS[nivel].border}`}>
                  {PLANO_NIVEL_LABELS[nivel]}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">{planoAtual?.descricao || '—'}</p>
          </div>
          <div>
            {assinatura && (
              <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold ${
                ASSINATURA_STATUS_MAP[assinatura.status].bg
              } ${ASSINATURA_STATUS_MAP[assinatura.status].text}`}>
                {ASSINATURA_STATUS_MAP[assinatura.status].label}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Valor Mensal</p>
            <p className="text-lg font-black text-slate-800">{planoAtual ? formatBRL(planoAtual.valor_mensal) : '—'}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Usuários</p>
            <p className="text-lg font-black text-slate-800">
              {assinatura ? `4/${planoAtual?.max_usuarios === -1 ? '∞' : planoAtual?.max_usuarios}` : '—'}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Cert. neste mês</p>
            <p className="text-lg font-black text-slate-800">
              {assinatura ? `${assinatura.certs_no_ciclo}/${planoAtual?.limite_certs === -1 ? '∞' : planoAtual?.limite_certs}` : '—'}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Taxa por Cert.</p>
            <p className="text-lg font-black text-slate-800">{planoAtual ? formatBRL(planoAtual.taxa_por_cert) : '—'}</p>
          </div>
        </div>

        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20">
          <ArrowUpRight size={16} />
          Alterar Plano
        </button>
      </div>

      {/* Planos disponíveis */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Planos Disponíveis</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {planos.map((plano) => {
            const isCurrent = plano.id === assinatura?.plano_id;
            return (
              <div
                key={plano.id}
                className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
                  isCurrent ? 'border-indigo-200 ring-2 ring-indigo-100' : 'border-slate-100 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-slate-800">{plano.nome}</h3>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide border ${PLANO_NIVEL_COLORS[plano.nivel].bg} ${PLANO_NIVEL_COLORS[plano.nivel].text} ${PLANO_NIVEL_COLORS[plano.nivel].border}`}>
                    {PLANO_NIVEL_LABELS[plano.nivel]}
                  </span>
                </div>

                <p className="text-2xl font-black text-slate-800 mb-1">
                  {formatBRL(plano.valor_mensal)}
                  <span className="text-xs font-normal text-slate-400">/mês</span>
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  + {formatBRL(plano.taxa_por_cert)} por certificado excedente
                </p>

                <ul className="space-y-2 mb-5">
                  <li className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    {plano.max_usuarios === -1 ? 'Usuários ilimitados' : `Até ${plano.max_usuarios} usuários`}
                  </li>
                  <li className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    {plano.max_unidades === -1 ? 'Unidades ilimitadas' : `Até ${plano.max_unidades} unidades`}
                  </li>
                  <li className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    {plano.limite_certs === -1 ? 'Certificados ilimitados' : `Até ${plano.limite_certs} certificados/mês`}
                  </li>
                  {plano.integracoes.map((int) => (
                    <li key={int} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      Integração {int}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={isCurrent}
                  className={`w-full px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20'
                  }`}
                >
                  {isCurrent ? 'Plano Atual' : 'Escolher Plano'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


