'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CreditCard,
  QrCode,
  Ban as Barcode,
  Hash,
  Send,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { gsApi } from '@/lib/gs/auth';
import { formatBRL, type FaturaMeioPagamento } from '@/types/gs/billing';

interface FormData {
  cliente_nome: string;
  cliente_documento: string;
  cliente_email: string;
  descricao: string;
  valor_original: number;
  valor_desconto: number;
  data_vencimento: string;
  meio_pagamento: FaturaMeioPagamento | '';
  parcelas: number;
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function NovaFaturaPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    cliente_nome: '',
    cliente_documento: '',
    cliente_email: '',
    descricao: '',
    valor_original: 0,
    valor_desconto: 0,
    data_vencimento: addDays(new Date(), 7),
    meio_pagamento: '',
    parcelas: 1,
  });

  const valorTotal = Math.max(0, form.valor_original - form.valor_desconto);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.cliente_nome.trim()) {
      setError('Nome do cliente é obrigatório.');
      return;
    }
    if (!form.cliente_documento.trim()) {
      setError('CPF/CNPJ do cliente é obrigatório.');
      return;
    }
    if (form.valor_original <= 0) {
      setError('Valor original deve ser maior que zero.');
      return;
    }
    if (!form.meio_pagamento) {
      setError('Selecione um meio de pagamento.');
      return;
    }

    setSubmitting(true);
    try {
      await gsApi.post('/faturas', {
        ...form,
        meio_pagamento: form.meio_pagamento as FaturaMeioPagamento,
        valor_total: valorTotal,
        tipo_cobranca: form.parcelas > 1 ? 'PARCELAMENTO' : 'UNICA',
      });
      router.push('/gs/faturas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar fatura.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/gs/faturas"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400
                   hover:text-slate-600 transition-colors"
      >
        <ArrowLeft size={14} />
        Voltar para Faturas
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          Nova Fatura
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Crie uma cobrança para enviar ao seu cliente
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados do Cliente */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Dados do Cliente
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Nome <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.cliente_nome}
                onChange={(e) => update('cliente_nome', e.target.value)}
                placeholder="Nome completo ou razão social"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400
                           placeholder:text-slate-300"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                CPF/CNPJ <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.cliente_documento}
                onChange={(e) => update('cliente_documento', e.target.value)}
                placeholder="000.000.000-00"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400
                           placeholder:text-slate-300"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.cliente_email}
                onChange={(e) => update('cliente_email', e.target.value)}
                placeholder="cliente@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400
                           placeholder:text-slate-300"
              />
            </div>
          </div>
        </div>

        {/* Detalhes da Cobrança */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Detalhes da Cobrança
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Produto / Serviço
              </label>
              <input
                type="text"
                value={form.descricao}
                onChange={(e) => update('descricao', e.target.value)}
                placeholder="Ex: Certificado PF A3 - 3 anos"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400
                           placeholder:text-slate-300"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Valor Original <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.valor_original || ''}
                  onChange={(e) => update('valor_original', parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400
                             placeholder:text-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Desconto
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor_desconto || ''}
                  onChange={(e) => update('valor_desconto', parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400
                             placeholder:text-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Data Vencimento <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={form.data_vencimento}
                onChange={(e) => update('data_vencimento', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Meio de Pagamento <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={form.meio_pagamento}
                onChange={(e) => update('meio_pagamento', e.target.value as FaturaMeioPagamento)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400
                           bg-white"
              >
                <option value="">Selecione...</option>
                <option value="PIX">PIX</option>
                <option value="BOLETO">Boleto</option>
                <option value="CARTAO">Cartão de Crédito</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Parcelas
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={form.parcelas}
                onChange={(e) => update('parcelas', parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">
            Resumo
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Valor Original</span>
              <span className="font-semibold text-slate-700">{formatBRL(form.valor_original)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Desconto</span>
              <span className="font-semibold text-red-500">- {formatBRL(form.valor_desconto)}</span>
            </div>
            <hr className="border-slate-100" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Valor Total</span>
              <span className="text-lg font-black text-emerald-600">{formatBRL(valorTotal)}</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600
                     text-white rounded-2xl text-sm font-bold shadow-sm shadow-indigo-600/20
                     hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all"
        >
          {submitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
          {submitting ? 'Criando...' : 'Criar Fatura e Enviar Cobrança'}
        </button>
      </form>
    </div>
  );
}
