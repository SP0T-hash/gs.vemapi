'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gsApi } from '@/lib/gs/auth';
import { Activity, Plus, Search, ArrowUpRight, RefreshCw, ShieldCheck, TestTube, Settings, Power } from 'lucide-react';

interface ACIntegration {
  id: string;
  nome: string;
  logo: string;
  status: 'CONECTADO' | 'DESCONECTADO';
  descricao: string;
}

interface IntegrationLog {
  id: string;
  timestamp: string;
  acao: string;
  sucesso: boolean;
}

const MOCK_ACS: ACIntegration[] = [
  { id: 'angry',    nome: 'AC ANGRY',    logo: 'ANGRY', status: 'CONECTADO',    descricao: 'Certificação Digital ICP-Brasil' },
  { id: 'safeweb',  nome: 'Safeweb',     logo: 'SFW',  status: 'DESCONECTADO', descricao: 'Certificação Digital ICP-Brasil' },
  { id: 'valid',    nome: 'Valid',       logo: 'VLD',  status: 'DESCONECTADO', descricao: 'Certificação Digital ICP-Brasil' },
  { id: 'certisign',nome: 'Certisign',   logo: 'CER',  status: 'DESCONECTADO', descricao: 'Certificação Digital ICP-Brasil' },
  { id: 'syngular', nome: 'Syngular',    logo: 'SYN',  status: 'DESCONECTADO', descricao: 'Certificação Digital ICP-Brasil' },
];

const MOCK_LOGS: IntegrationLog[] = [
  { id: '1', timestamp: '05/07/2026 09:30:00', acao: 'Integração Angry AC — emissão de certificado #4425', sucesso: true },
  { id: '2', timestamp: '05/07/2026 09:15:00', acao: 'Integração Angry AC — consulta de status #4420', sucesso: true },
  { id: '3', timestamp: '04/07/2026 16:45:00', acao: 'Integração Safeweb — tentativa de conexão', sucesso: false },
  { id: '4', timestamp: '04/07/2026 14:00:00', acao: 'Integração Angry AC — validação de documento', sucesso: true },
  { id: '5', timestamp: '04/07/2026 11:20:00', acao: 'Integração Safeweb — timeout de conexão', sucesso: false },
];

const AC_COLORS: Record<string, string> = {
  ANGRY: 'bg-indigo-600',
  SFW: 'bg-blue-600',
  VLD: 'bg-emerald-600',
  CER: 'bg-amber-600',
  SYN: 'bg-purple-600',
};

export default function IntegracoesPage() {
  const [acs, setAcs] = useState<ACIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    gsApi.get<ACIntegration[]>('/integracoes')
      .then(setAcs)
      .catch(() => setAcs(MOCK_ACS))
      .finally(() => setLoading(false));
  }, []);

  const toggleAC = (id: string) => {
    setToggling(id);
    setTimeout(() => {
      setAcs((prev) =>
        prev.map((ac) =>
          ac.id === id
            ? { ...ac, status: ac.status === 'CONECTADO' ? 'DESCONECTADO' : 'CONECTADO' }
            : ac
        )
      );
      setToggling(null);
    }, 600);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Activity size={28} className="text-slate-300 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Integrações</h1>
        <p className="text-sm text-slate-400 mt-1">Conecte seu GS às Autoridades Certificadoras</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {acs.map((ac) => (
          <div
            key={ac.id}
            className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${AC_COLORS[ac.logo] || 'bg-slate-600'} flex items-center justify-center text-white font-black text-sm`}>
                  {ac.logo}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{ac.nome}</h3>
                  <p className="text-[10px] text-slate-400">{ac.descricao}</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                ac.status === 'CONECTADO' ? 'text-emerald-700' : 'text-slate-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${ac.status === 'CONECTADO' ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                {ac.status === 'CONECTADO' ? 'Conectado' : 'Desconectado'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleAC(ac.id)}
                disabled={toggling === ac.id}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  ac.status === 'CONECTADO'
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                } disabled:opacity-50`}
              >
                <Power size={14} />
                {toggling === ac.id ? '...' : ac.status === 'CONECTADO' ? 'Desconectar' : 'Conectar'}
              </button>
              <button className="px-3 py-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors" title="Configurar">
                <Settings size={14} />
              </button>
              <button className="px-3 py-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors" title="Testar Conexão">
                <TestTube size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Logs */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">
          Logs de Integração
        </h2>
        <div className="space-y-2">
          {MOCK_LOGS.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 text-sm"
            >
              <div className="flex items-center gap-3">
                {log.sucesso ? (
                  <RefreshCw size={14} className="text-emerald-500 shrink-0" />
                ) : (
                  <RefreshCw size={14} className="text-red-400 shrink-0" />
                )}
                <div>
                  <p className="text-xs text-slate-700">{log.acao}</p>
                  <p className="text-[10px] text-slate-400">{log.timestamp}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                log.sucesso ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                {log.sucesso ? 'Sucesso' : 'Falha'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
