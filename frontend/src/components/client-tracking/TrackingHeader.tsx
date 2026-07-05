'use client';

import {
  Search,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Cabeçalho da página de Acompanhamento
 * - Exibe o formulário de busca por protocolo + CPF
 * - Segue DESIGN_SYSTEM_v2.md: light mode, emerald/indigo
 */
export function TrackingHeader() {
  return (
    <header className="bg-white border-b border-slate-100 shadow-[0_1px_10px_-5px_rgba(0,0,0,0.10)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Logo e identidade visual */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <ShieldCheck size={22} className="text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              AC ANGRY
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Central de Emissão Digital
            </p>
          </div>
        </div>

        {/* Descrição */}
        <p className="text-sm text-slate-500 max-w-2xl">
          Acompanhe em tempo real o andamento da emissão do seu Certificado Digital ICP-Brasil.
          Informe seu protocolo e CPF para consultar.
        </p>

        {/* Selos de conformidade */}
        <div className="flex flex-wrap gap-3 mt-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border bg-emerald-50 text-emerald-700 border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            ICP-Brasil
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border bg-indigo-50 text-indigo-700 border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" aria-hidden="true" />
            LGPD
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border bg-emerald-50 text-emerald-700 border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            ITI
          </span>
        </div>
      </div>
    </header>
  );
}

/**
 * Formulário de busca de protocolo
 */
export function TrackingSearchForm() {
  const router = useRouter();
  const [protocolo, setProtocolo] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function formatProtocolo(value: string) {
    // Aceita apenas números e letras, converte para maiúsculo
    return value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().slice(0, 20);
  }

  function formatCpf(value: string) {
    // Aceita apenas dígitos e formata como CPF ou 4 últimos dígitos
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!protocolo.trim()) {
      setError('Informe o número do protocolo.');
      return;
    }

    const cpfDigits = cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 4 && cpfDigits.length !== 11) {
      setError('Informe o CPF completo ou os últimos 4 dígitos.');
      return;
    }

    setLoading(true);
    router.push(`/acompanhar/${protocolo.trim()}?cpf=${cpfDigits}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Protocolo */}
        <div className="space-y-1.5">
          <label
            htmlFor="protocolo"
            className="text-xs font-semibold text-slate-500 uppercase tracking-wide"
          >
            Nº do Protocolo
          </label>
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
              aria-hidden="true"
            />
            <input
              id="protocolo"
              type="text"
              inputMode="text"
              autoComplete="off"
              placeholder="Ex: AC-2024-001234"
              value={protocolo}
              onChange={(e) => setProtocolo(formatProtocolo(e.target.value))}
              aria-invalid={!!error && !protocolo.trim()}
              aria-describedby={error && !protocolo.trim() ? 'tracking-error' : undefined}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl 
                         shadow-sm font-medium text-slate-700 placeholder:text-slate-400
                         focus:outline-none focus:ring-2 focus:ring-emerald-500/30 
                         focus:border-emerald-500 transition-all duration-200 
                         disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            />
          </div>
        </div>

        {/* CPF */}
        <div className="space-y-1.5">
          <label
            htmlFor="cpf"
            className="text-xs font-semibold text-slate-500 uppercase tracking-wide"
          >
            CPF (completo ou últimos 4 dígitos)
          </label>
          <input
            id="cpf"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00 ou 0000"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            aria-invalid={!!error && cpf.replace(/\D/g, '').length !== 4 && cpf.replace(/\D/g, '').length !== 11}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl 
                       shadow-sm font-medium text-slate-700 placeholder:text-slate-400
                       focus:outline-none focus:ring-2 focus:ring-emerald-500/30 
                       focus:border-emerald-500 transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <p
          id="tracking-error"
          role="alert"
          className="text-xs font-semibold text-red-600 flex items-center gap-1.5"
        >
          <AlertCircle size={12} aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold 
                   px-6 rounded-xl shadow-lg shadow-emerald-600/20 
                   transition-all duration-200 active:scale-[0.98] 
                   focus-visible:outline-none focus-visible:ring-2 
                   focus-visible:ring-emerald-500 focus-visible:ring-offset-2
                   disabled:opacity-50 disabled:pointer-events-none
                   flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            Consultando...
          </>
        ) : (
          <>
            Acompanhar Pedido
            <ArrowRight size={18} aria-hidden="true" />
          </>
        )}
      </button>

      {/* Nota LGPD */}
      <p className="text-[10px] text-slate-400 text-center">
        Ao consultar, você concorda com o tratamento dos seus dados conforme a LGPD.
        Apenas as informações necessárias ao acompanhamento serão exibidas.
      </p>
    </form>
  );
}
