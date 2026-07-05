import type { Metadata } from 'next';
import { TrackingHeader, TrackingSearchForm } from '@/components/client-tracking/TrackingHeader';
import { Shield, FileCheck, Video, Server, Award } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Acompanhar Protocolo | AC ANGRY',
  description:
    'Acompanhe em tempo real o andamento da emissão do seu Certificado Digital ICP-Brasil. Informe seu protocolo e CPF para consultar.',
  robots: { index: false, follow: false },
};

/**
 * Página inicial de Acompanhamento de Protocolo
 *
 * Landing page pública onde o cliente informa protocolo + CPF
 * para acompanhar o andamento do seu certificado digital.
 *
 * LGPD: coleta mínima de dados (protocolo + 4 dígitos do CPF).
 * ICP-Brasil: fluxo de validação de identidade do requerente.
 * Design System v2.0: light mode com paleta emerald/indigo.
 */
export default function AcompanharPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TrackingHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário de busca */}
          <section className="lg:col-span-1">
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)] lg:sticky lg:top-24">
              <h2 className="text-base font-bold text-slate-800 mb-4">
                Consultar Protocolo
              </h2>
              <TrackingSearchForm />
            </div>
          </section>

          {/* Como funciona */}
          <section className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">
                Como funciona a emissão do seu Certificado Digital
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StepCard
                  icon={<FileCheck size={24} />}
                  title="Pedido"
                  description="Você solicita seu certificado digital"
                  color="emerald"
                  step={1}
                />
                <StepCard
                  icon={<Shield size={24} />}
                  title="Validação"
                  description="Documentos são verificados"
                  color="blue"
                  step={2}
                />
                <StepCard
                  icon={<Video size={24} />}
                  title="Videoconferência"
                  description="Identificação por vídeo ou presencial"
                  color="amber"
                  step={3}
                />
                <StepCard
                  icon={<Server size={24} />}
                  title="Emissão"
                  description="Geração do par de chaves criptográficas"
                  color="indigo"
                  step={4}
                />
                <StepCard
                  icon={<Award size={24} />}
                  title="Pronto!"
                  description="Certificado disponível para uso"
                  color="emerald"
                  step={5}
                />
              </div>
            </div>

            {/* Informações de segurança */}
            <div className="bg-white border border-indigo-100 rounded-2xl p-6 shadow-[0_1px_4px_rgba(79,70,229,0.08)]">
              <h2 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-3">
                Segurança e Transparência
              </h2>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <Shield size={16} className="text-indigo-500 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    <strong className="text-slate-800">ICP-Brasil:</strong> Todos os certificados seguem os padrões de segurança da Infraestrutura de Chaves Públicas Brasileira.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield size={16} className="text-indigo-500 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    <strong className="text-slate-800">LGPD:</strong> Seus dados pessoais são tratados com segurança e apenas para a finalidade de emissão do certificado.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield size={16} className="text-indigo-500 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    <strong className="text-slate-800">ITI:</strong> Regulamentado e fiscalizado pelo Instituto Nacional de Tecnologia da Informação.
                  </span>
                </li>
              </ul>
            </div>

            {/* Aviso LGPD */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-500">Proteção de Dados (LGPD):</strong> A AC ANGRY coleta e trata seus dados pessoais
                exclusivamente para os fins de emissão do certificado digital ICP-Brasil, conforme a
                Lei nº 13.709/2018 (LGPD). Você pode solicitar a qualquer momento a correção, exclusão
                ou portabilidade dos seus dados entrando em contato pelo e-mail{' '}
                <a href="mailto:lgpd@acangry.ac.br" className="text-emerald-600 hover:text-emerald-700 underline">
                  lgpd@acangry.ac.br
                </a>
                .
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-[10px] text-slate-400 text-center">
            AC ANGRY — Autoridade Certificadora credenciada ICP-Brasil &mdash; &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

function StepCard({
  icon,
  title,
  description,
  color,
  step,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'emerald' | 'blue' | 'amber' | 'indigo';
  step: number;
}) {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: 'text-emerald-600',
    },
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: 'text-blue-600',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: 'text-amber-600',
    },
    indigo: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      icon: 'text-indigo-600',
    },
  };

  const c = colorMap[color];

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-4 text-center`}>
      <div className={`flex justify-center mb-2 ${c.icon}`} aria-hidden="true">
        {icon}
      </div>
      <p className={`text-xs font-bold ${c.text}`}>{title}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${c.bg} ${c.text} border ${c.border} mt-2`}>
        {step}
      </span>
    </div>
  );
}
