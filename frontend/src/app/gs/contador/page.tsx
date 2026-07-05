'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gsApi } from '@/lib/gs/auth';
import { Activity, Plus, Search, ArrowUpRight, Copy, CheckCircle2, AlertTriangle } from 'lucide-react';
import { SCANNER_PS_SCRIPT, NF_STATUS_MAP } from '@/types/gs/accountant';
import type { GS_NotaFiscal } from '@/types/gs/accountant';

type ContadorTab = 'carteira' | 'scanner' | 'nf';

interface CertCarteira {
  id: string;
  cliente: string;
  produto: string;
  data_expiracao: string;
  dias_restantes: number;
  status: 'ATIVO' | 'EXPIRADO' | 'RENOVACAO_PENDENTE';
}

interface ScannerResult {
  subject: string;
  issuer: string;
  notAfter: string;
  finding: 'OK' | 'WARNING' | 'CRITICAL' | 'EXPIRED';
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const MOCK_CERTIFICADOS: CertCarteira[] = [
  { id: '1', cliente: 'Maria Silva',          produto: 'PF A3 - 3 anos', data_expiracao: '15/08/2029', dias_restantes: 1136, status: 'ATIVO' },
  { id: '2', cliente: 'Tech Solutions Ltda',  produto: 'PJ A1 - 1 ano', data_expiracao: '20/07/2027',  dias_restantes: 380,  status: 'ATIVO' },
  { id: '3', cliente: 'João Santos',          produto: 'PF A1 - 1 ano', data_expiracao: '05/08/2026',  dias_restantes: 31,   status: 'ATIVO' },
  { id: '4', cliente: 'Beta Construções',     produto: 'PJ A3 - 2 anos', data_expiracao: '10/07/2026',  dias_restantes: 5,    status: 'ATIVO' },
  { id: '5', cliente: 'Ana Oliveira',         produto: 'PF A3 - 1 ano', data_expiracao: '01/06/2026',  dias_restantes: -34,  status: 'EXPIRADO' },
  { id: '6', cliente: 'Delta Tech',           produto: 'NF-e - 1 ano',  data_expiracao: '25/07/2026',  dias_restantes: 20,   status: 'RENOVACAO_PENDENTE' },
];

const MOCK_SCANNER: ScannerResult[] = [
  { subject: 'CN=Maria Silva, OU=PF',                issuer: 'CN=AC ANGRY ICP-Brasil v5, OU=AC', notAfter: '15/08/2029', finding: 'OK' },
  { subject: 'CN=Tech Solutions Ltda, OU=PJ',        issuer: 'CN=AC ANGRY ICP-Brasil v5, OU=AC', notAfter: '20/07/2027', finding: 'OK' },
  { subject: 'CN=Beta Construções, OU=PJ',           issuer: 'CN=AC ANGRY ICP-Brasil v5, OU=AC', notAfter: '10/07/2026', finding: 'CRITICAL' },
  { subject: 'CN=João Santos, OU=PF',                issuer: 'CN=AC SAFEWEB ICP-Brasil, OU=AC',  notAfter: '05/08/2026', finding: 'WARNING' },
  { subject: 'CN=Antigo Cert, OU=PF',                issuer: 'CN=AC ANGRY ICP-Brasil v4, OU=AC', notAfter: '01/03/2025', finding: 'EXPIRED' },
];

const MOCK_NFS: GS_NotaFiscal[] = [
  { id: '1', ar_id: '1', pedido_id: '1', cliente_id: '1', numero: 'NF-2026-0001', tipo: 'NFSE', valor: 299.90, status: 'AUTORIZADA', created_at: '04/07/2026', updated_at: '04/07/2026' },
  { id: '2', ar_id: '1', pedido_id: '2', cliente_id: '2', numero: 'NF-2026-0002', tipo: 'NFSE', valor: 189.50, status: 'AUTORIZADA', created_at: '03/07/2026', updated_at: '03/07/2026' },
  { id: '3', ar_id: '1', pedido_id: '3', cliente_id: '3', numero: 'NF-2026-0003', tipo: 'NFE',  valor: 450.00, status: 'PENDENTE',   created_at: '03/07/2026', updated_at: '03/07/2026' },
  { id: '4', ar_id: '1', pedido_id: '4', cliente_id: '4', numero: 'NF-2026-0004', tipo: 'NFSE', valor: 199.90, status: 'REJEITADA',  created_at: '02/07/2026', updated_at: '02/07/2026' },
  { id: '5', ar_id: '1', pedido_id: '5', cliente_id: '5', numero: 'NF-2026-0005', tipo: 'NFE',  valor: 149.90, status: 'CANCELADA',  created_at: '01/07/2026', updated_at: '01/07/2026' },
];

const FINDING_UI: Record<string, { label: string; bg: string; text: string; border: string }> = {
  OK:       { label: 'OK',       bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  WARNING:  { label: 'Alerta',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  CRITICAL: { label: 'Crítico',  bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
  EXPIRED:  { label: 'Expirado', bg: 'bg-slate-100',  text: 'text-slate-500',   border: 'border-slate-200' },
};

function ExpiryBar({ dias }: { dias: number }) {
  const pct = Math.min(Math.max((dias / 365) * 100, 0), 100);
  const color =
    dias > 60 ? 'bg-emerald-400' :
    dias > 30 ? 'bg-amber-400' :
    dias > 15 ? 'bg-orange-400' :
    dias > 0  ? 'bg-red-400' : 'bg-slate-300';
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function ContadorPage() {
  const [tab, setTab] = useState<ContadorTab>('carteira');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SCANNER_PS_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Contador</h1>
        <p className="text-sm text-slate-400 mt-1">Gestão de certificados dos clientes</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('carteira')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${tab === 'carteira' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Carteira</button>
        <button onClick={() => setTab('scanner')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${tab === 'scanner' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Scanner</button>
        <button onClick={() => setTab('nf')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${tab === 'nf' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Notas Fiscais</button>
      </div>

      {/* Carteira */}
      {tab === 'carteira' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <p className="text-xs text-slate-400 mb-1">Total de Certificados</p>
              <p className="text-2xl font-black text-slate-800">{MOCK_CERTIFICADOS.length}</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <p className="text-xs text-slate-400 mb-1">A Expirar (&lt;30 dias)</p>
              <p className="text-2xl font-black text-amber-600">{MOCK_CERTIFICADOS.filter(c => c.dias_restantes > 0 && c.dias_restantes <= 30).length}</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <p className="text-xs text-slate-400 mb-1">Expirados</p>
              <p className="text-2xl font-black text-red-600">{MOCK_CERTIFICADOS.filter(c => c.dias_restantes <= 0).length}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Produto</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Expira em</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Validade</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {MOCK_CERTIFICADOS.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 font-semibold text-slate-700">{c.cliente}</td>
                      <td className="px-5 py-4 text-slate-500">{c.produto}</td>
                      <td className="px-5 py-4 text-slate-500">{c.data_expiracao}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-[120px]">
                            <ExpiryBar dias={c.dias_restantes} />
                          </div>
                          <span className={`text-[11px] font-bold whitespace-nowrap ${
                            c.dias_restantes > 60 ? 'text-emerald-600' :
                            c.dias_restantes > 30 ? 'text-amber-600' :
                            c.dias_restantes > 15 ? 'text-orange-600' :
                            c.dias_restantes > 0 ? 'text-red-600' : 'text-slate-400'
                          }`}>
                            {c.dias_restantes > 0 ? `${c.dias_restantes}d` : 'Expirado'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          c.status === 'ATIVO' ? 'bg-emerald-50 text-emerald-700' :
                          c.status === 'RENOVACAO_PENDENTE' ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {c.status === 'ATIVO' ? 'Ativo' : c.status === 'RENOVACAO_PENDENTE' ? 'Renovação Pend.' : 'Expirado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Scanner */}
      {tab === 'scanner' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-700">Script PowerShell</h2>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                {copied ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-200 text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto max-h-[300px] overflow-y-auto font-mono">
              {SCANNER_PS_SCRIPT}
            </pre>
            <p className="text-xs text-slate-400 mt-3">
              Execute este script no PowerShell como Administrador na máquina do cliente.
            </p>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700">Resultados da Última Varredura</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Emissor</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Expira</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {MOCK_SCANNER.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-slate-700">{s.subject}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">{s.issuer}</td>
                      <td className="px-5 py-4 text-slate-500">{s.notAfter}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${FINDING_UI[s.finding].bg} ${FINDING_UI[s.finding].text} ${FINDING_UI[s.finding].border}`}>
                          {FINDING_UI[s.finding].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Notas Fiscais */}
      {tab === 'nf' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Número</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {MOCK_NFS.map((nf) => {
                  const st = NF_STATUS_MAP[nf.status] || { label: nf.status, bg: 'bg-slate-100', text: 'text-slate-500' };
                  return (
                    <tr key={nf.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 font-semibold text-slate-700">{nf.numero || '—'}</td>
                      <td className="px-5 py-4 text-slate-500">{nf.cliente_id || '—'}</td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-700">{formatBRL(nf.valor)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${st.bg} ${st.text}`}>{st.label}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-500">{nf.created_at}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
