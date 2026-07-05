'use client';

import { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  ArrowUpRight,
  CreditCard,
  QrCode,
  Ban as Barcode,
  Filter,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { gsApi } from '@/lib/gs/auth';
import {
  formatBRL,
  FATURA_STATUS_MAP,
  type GS_Fatura,
  type FaturaStatus,
} from '@/types/gs/billing';

type FilterType = 'TODAS' | FaturaStatus;

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'TODAS', label: 'Todas' },
  { key: 'PENDENTE', label: 'Pendentes' },
  { key: 'PAGA', label: 'Pagas' },
  { key: 'VENCIDA', label: 'Vencidas' },
];

const PAGAMENTO_ICON: Record<string, React.ReactNode> = {
  PIX: <QrCode size={14} className="text-blue-500" />,
  BOLETO: <Barcode size={14} className="text-amber-500" />,
  CARTAO: <CreditCard size={14} className="text-indigo-500" />,
};

export default function FaturasPage() {
  const [faturas, setFaturas] = useState<GS_Fatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('TODAS');

  useEffect(() => {
    gsApi.get<GS_Fatura[]>('/faturas')
      .then(setFaturas)
      .catch(() => setFaturas(mockFaturas))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'TODAS'
    ? faturas
    : faturas.filter((f) => f.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={28} className="text-slate-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Faturas
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerencie as cobranças dos seus clientes
          </p>
        </div>
        <Link
          href="/gs/faturas/nova"
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white
                     rounded-xl text-sm font-bold shadow-sm shadow-indigo-600/20
                     hover:bg-indigo-700 transition-all"
        >
          <Plus size={16} />
          Nova Fatura
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap
              ${
                filter === f.key
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'bg-white text-slate-500 border border-slate-100 hover:border-slate-200 hover:text-slate-700'
              }`}
          >
            {f.label}
            {f.key !== 'TODAS' && (
              <span className="ml-1.5 opacity-70">
                ({faturas.filter((ft) => ft.status === f.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-5 py-3">Cliente</th>
                <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-5 py-3">Descrição</th>
                <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wide px-5 py-3">Valor</th>
                <th className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wide px-5 py-3">Status</th>
                <th className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wide px-5 py-3">Pagamento</th>
                <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wide px-5 py-3">Vencimento</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((fat) => {
                const statusStyle = FATURA_STATUS_MAP[fat.status];
                return (
                  <tr key={fat.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors last:border-0">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-700">{fat.cliente_nome}</p>
                      <p className="text-[10px] text-slate-400">{fat.cliente_documento}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-500 max-w-[200px] truncate">
                      {fat.descricao ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-800">
                      {formatBRL(fat.valor_total)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${statusStyle.bg} ${statusStyle.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {fat.meio_pagamento ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                          {PAGAMENTO_ICON[fat.meio_pagamento] ?? null}
                          {fat.meio_pagamento}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right text-slate-500">
                      {new Date(fat.data_vencimento).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <FileText size={32} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">
                      {filter === 'TODAS'
                        ? 'Nenhuma fatura encontrada.'
                        : 'Nenhuma fatura com este status.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockFaturas: GS_Fatura[] = [
  {
    id: '1',
    ar_id: null,
    unidade_id: null,
    usuario_id: null,
    cliente_id: null,
    cliente_nome: 'Maria Silva',
    cliente_documento: '123.456.789-00',
    cliente_email: 'maria@email.com',
    cliente_telefone: null,
    pedido_id: null,
    valor_original: 350.0,
    valor_desconto: 0,
    valor_total: 350.0,
    taxa_gateway: 6.99,
    descricao: 'Certificado PF A3 - 3 anos',
    tipo_cobranca: 'UNICA',
    parcelas: 1,
    data_emissao: '2026-07-01',
    data_vencimento: '2026-07-10',
    data_pagamento: '2026-07-05',
    status: 'PAGA',
    meio_pagamento: 'PIX',
    asaas_payment_id: null,
    asaas_invoice_url: null,
    asaas_pix_code: null,
    asaas_bank_slip_url: null,
    asaas_card_url: null,
    split_gs: 35.0,
    split_ar: 280.0,
    split_ac: 35.0,
    conciliado: true,
  },
  {
    id: '2',
    ar_id: null,
    unidade_id: null,
    usuario_id: null,
    cliente_id: null,
    cliente_nome: 'Tech Solutions Ltda',
    cliente_documento: '00.123.456/0001-78',
    cliente_email: 'contato@techsol.com',
    cliente_telefone: null,
    pedido_id: null,
    valor_original: 2000.0,
    valor_desconto: 110.0,
    valor_total: 1890.0,
    taxa_gateway: 27.99,
    descricao: 'Certificado PJ A1 - 1 ano',
    tipo_cobranca: 'UNICA',
    parcelas: 1,
    data_emissao: '2026-07-02',
    data_vencimento: '2026-07-15',
    data_pagamento: null,
    status: 'PENDENTE',
    meio_pagamento: 'BOLETO',
    asaas_payment_id: null,
    asaas_invoice_url: null,
    asaas_pix_code: null,
    asaas_bank_slip_url: null,
    asaas_card_url: null,
    split_gs: 189.0,
    split_ar: 1512.0,
    split_ac: 189.0,
    conciliado: false,
  },
  {
    id: '3',
    ar_id: null,
    unidade_id: null,
    usuario_id: null,
    cliente_id: null,
    cliente_nome: 'João Santos',
    cliente_documento: '987.654.321-00',
    cliente_email: 'joao@email.com',
    cliente_telefone: null,
    pedido_id: null,
    valor_original: 270.0,
    valor_desconto: 0,
    valor_total: 270.0,
    taxa_gateway: 5.99,
    descricao: 'Renovação PF A1',
    tipo_cobranca: 'UNICA',
    parcelas: 1,
    data_emissao: '2026-06-20',
    data_vencimento: '2026-06-28',
    data_pagamento: null,
    status: 'VENCIDA',
    meio_pagamento: 'CARTAO',
    asaas_payment_id: null,
    asaas_invoice_url: null,
    asaas_pix_code: null,
    asaas_bank_slip_url: null,
    asaas_card_url: null,
    split_gs: 27.0,
    split_ar: 216.0,
    split_ac: 27.0,
    conciliado: false,
  },
  {
    id: '4',
    ar_id: null,
    unidade_id: null,
    usuario_id: null,
    cliente_id: null,
    cliente_nome: 'Ana Oliveira',
    cliente_documento: '456.789.123-00',
    cliente_email: 'ana@email.com',
    cliente_telefone: null,
    pedido_id: null,
    valor_original: 550.0,
    valor_desconto: 0,
    valor_total: 550.0,
    taxa_gateway: 8.99,
    descricao: 'NF-e - 1 ano',
    tipo_cobranca: 'UNICA',
    parcelas: 1,
    data_emissao: '2026-06-25',
    data_vencimento: '2026-07-05',
    data_pagamento: '2026-07-04',
    status: 'PAGA',
    meio_pagamento: 'PIX',
    asaas_payment_id: null,
    asaas_invoice_url: null,
    asaas_pix_code: null,
    asaas_bank_slip_url: null,
    asaas_card_url: null,
    split_gs: 55.0,
    split_ar: 440.0,
    split_ac: 55.0,
    conciliado: true,
  },
  {
    id: '5',
    ar_id: null,
    unidade_id: null,
    usuario_id: null,
    cliente_id: null,
    cliente_nome: 'Carlos Pereira',
    cliente_documento: '321.654.987-00',
    cliente_email: 'carlos@email.com',
    cliente_telefone: null,
    pedido_id: null,
    valor_original: 185.0,
    valor_desconto: 0,
    valor_total: 185.0,
    taxa_gateway: 4.99,
    descricao: 'Certificado PF A1',
    tipo_cobranca: 'UNICA',
    parcelas: 1,
    data_emissao: '2026-07-03',
    data_vencimento: '2026-07-20',
    data_pagamento: null,
    status: 'PENDENTE',
    meio_pagamento: 'PIX',
    asaas_payment_id: null,
    asaas_invoice_url: null,
    asaas_pix_code: null,
    asaas_bank_slip_url: null,
    asaas_card_url: null,
    split_gs: 18.5,
    split_ar: 148.0,
    split_ac: 18.5,
    conciliado: false,
  },
  {
    id: '6',
    ar_id: null,
    unidade_id: null,
    usuario_id: null,
    cliente_id: null,
    cliente_nome: 'Fernanda Lima',
    cliente_documento: '159.753.486-00',
    cliente_email: 'fernanda@email.com',
    cliente_telefone: null,
    pedido_id: null,
    valor_original: 420.0,
    valor_desconto: 50.0,
    valor_total: 370.0,
    taxa_gateway: 6.99,
    descricao: 'Certificado PF A3 - 1 ano',
    tipo_cobranca: 'UNICA',
    parcelas: 1,
    data_emissao: '2026-06-15',
    data_vencimento: '2026-06-25',
    data_pagamento: null,
    status: 'CANCELADA',
    meio_pagamento: null,
    asaas_payment_id: null,
    asaas_invoice_url: null,
    asaas_pix_code: null,
    asaas_bank_slip_url: null,
    asaas_card_url: null,
    split_gs: 37.0,
    split_ar: 296.0,
    split_ac: 37.0,
    conciliado: false,
  },
];
