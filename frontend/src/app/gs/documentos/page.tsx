'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Image,
  Shield,
  Search,
  Plus,
  Download,
  Trash2,
  RefreshCw,
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type DocTipo = 'RG' | 'CNH' | 'COMPROVANTE' | 'CERTIFICADO' | 'NF' | 'OUTROS';

interface Documento {
  id: string;
  fileName: string;
  originalName: string;
  tipo: DocTipo;
  size: number;
  mimeType: string;
  uploadedAt: string;
  clienteNome: string | null;
  clienteId: string | null;
}

const TIPO_UI: Record<DocTipo, { label: string; bg: string; text: string }> = {
  RG:           { label: 'RG',          bg: 'bg-blue-50',   text: 'text-blue-700' },
  CNH:          { label: 'CNH',         bg: 'bg-emerald-50',text: 'text-emerald-700' },
  COMPROVANTE:  { label: 'Comprovante', bg: 'bg-amber-50',  text: 'text-amber-700' },
  CERTIFICADO:  { label: 'Certificado', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  NF:           { label: 'NF',          bg: 'bg-purple-50', text: 'text-purple-700' },
  OUTROS:       { label: 'Outros',      bg: 'bg-slate-50',  text: 'text-slate-600' },
};

const TIPOS: DocTipo[] = ['RG', 'CNH', 'COMPROVANTE', 'CERTIFICADO', 'NF', 'OUTROS'];
const ITEMS_PER_PAGE = 12;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function getFileIcon(mime: string, tipo: DocTipo) {
  if (tipo === 'CERTIFICADO') return <Shield size={28} className="text-indigo-500" />;
  if (mime.startsWith('image/')) return <Image size={28} className="text-amber-500" />;
  return <FileText size={28} className="text-slate-500" />;
}

const MOCK_DOCUMENTOS: Documento[] = [
  { id: '1', fileName: 'rg_maria.pdf', originalName: 'RG_Maria_Silva.pdf', tipo: 'RG', size: 245760, mimeType: 'application/pdf', uploadedAt: '2026-07-04T10:30:00', clienteNome: 'Maria Silva', clienteId: '1' },
  { id: '2', fileName: 'cnh_joao.pdf', originalName: 'CNH_João_Santos.pdf', tipo: 'CNH', size: 312000, mimeType: 'application/pdf', uploadedAt: '2026-07-04T09:15:00', clienteNome: 'João Santos', clienteId: '2' },
  { id: '3', fileName: 'comprovante_endereco.jpg', originalName: 'comprovante_endereco.jpg', tipo: 'COMPROVANTE', size: 512000, mimeType: 'image/jpeg', uploadedAt: '2026-07-03T14:22:00', clienteNome: 'Tech Solutions Ltda', clienteId: '3' },
  { id: '4', fileName: 'cert_a3_ana.cer', originalName: 'certificado_a3_ana.cer', tipo: 'CERTIFICADO', size: 2048, mimeType: 'application/x-x509-ca-cert', uploadedAt: '2026-07-03T11:00:00', clienteNome: 'Ana Oliveira', clienteId: '4' },
  { id: '5', fileName: 'nf_tech_456.pdf', originalName: 'NF_456_Tech_Solutions.pdf', tipo: 'NF', size: 89000, mimeType: 'application/pdf', uploadedAt: '2026-07-02T16:45:00', clienteNome: 'Tech Solutions Ltda', clienteId: '3' },
  { id: '6', fileName: 'rg_carlos.jpg', originalName: 'RG_Carlos_Pereira.jpg', tipo: 'RG', size: 1024000, mimeType: 'image/jpeg', uploadedAt: '2026-07-02T08:30:00', clienteNome: 'Carlos Pereira', clienteId: '5' },
  { id: '7', fileName: 'cnh_fernanda.pdf', originalName: 'CNH_Fernanda_Lima.pdf', tipo: 'CNH', size: 278000, mimeType: 'application/pdf', uploadedAt: '2026-07-01T13:10:00', clienteNome: null, clienteId: null },
  { id: '8', fileName: 'outro_documento.docx', originalName: 'contrato_servicos.docx', tipo: 'OUTROS', size: 45000, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', uploadedAt: '2026-06-30T17:00:00', clienteNome: 'Beta Construções', clienteId: '6' },
];

export default function DocumentosPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<DocTipo | 'TODOS'>('TODOS');
  const [clienteFilter, setClienteFilter] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/gs/storage/documentos')
      .then(r => r.json())
      .then(setDocumentos)
      .catch(() => setDocumentos(MOCK_DOCUMENTOS))
      .finally(() => setLoading(false));
  }, []);

  const filtered = documentos.filter((d) => {
    const matchSearch = search === '' ||
      d.originalName.toLowerCase().includes(search.toLowerCase()) ||
      (d.clienteNome?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchTipo = tipoFilter === 'TODOS' || d.tipo === tipoFilter;
    const matchCliente = clienteFilter === '' ||
      (d.clienteNome?.toLowerCase().includes(clienteFilter.toLowerCase()) ?? false);
    return matchSearch && matchTipo && matchCliente;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, tipoFilter, clienteFilter]);

  const handleDownload = async (doc: Documento) => {
    setDownloading(doc.id);
    try {
      const res = await fetch(`/api/gs/storage/documentos/${doc.id}/download`);
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        const blob = new Blob();
        const url = URL.createObjectURL(blob);
        window.open(url);
      }
    } catch {
      alert('Erro ao gerar link de download.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/gs/storage/documentos/${id}`, { method: 'DELETE' });
      setDocumentos((prev) => prev.filter((d) => d.id !== id));
    } catch {
      alert('Erro ao excluir documento.');
    }
    setConfirmDelete(null);
  };

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
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Documentos</h1>
          <p className="text-sm text-slate-400 mt-1">{documentos.length} documentos armazenados</p>
        </div>
        <Link
          href="/gs/documentos/upload"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
        >
          <Plus size={16} />
          Upload
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou cliente..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>
        <select
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value as DocTipo | 'TODOS')}
          className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
        >
          <option value="TODOS">Todos os tipos</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>{TIPO_UI[t].label}</option>
          ))}
        </select>
        <input
          type="text"
          value={clienteFilter}
          onChange={(e) => setClienteFilter(e.target.value)}
          placeholder="Filtrar por cliente..."
          className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all max-w-[200px]"
        />
      </div>

      {/* Grid */}
      {paginated.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map((doc) => (
              <div key={doc.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                    {getFileIcon(doc.mimeType, doc.tipo)}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold ${TIPO_UI[doc.tipo].bg} ${TIPO_UI[doc.tipo].text}`}>
                    {TIPO_UI[doc.tipo].label}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-800 mb-1 truncate" title={doc.originalName}>
                  {doc.originalName}
                </h3>
                <p className="text-xs text-slate-400 mb-1">{formatBytes(doc.size)}</p>
                <p className="text-xs text-slate-400 mb-1">{formatDate(doc.uploadedAt)}</p>
                {doc.clienteNome && (
                  <p className="text-xs text-indigo-600 font-medium truncate">{doc.clienteNome}</p>
                )}

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50">
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={downloading === doc.id}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {downloading === doc.id ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                    Download
                  </button>
                  <button
                    onClick={() => setConfirmDelete(doc.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Confirmação de exclusão inline */}
                {confirmDelete === doc.id && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-xs font-semibold text-red-700 mb-2">Excluir este documento?</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Excluir
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                    p === page
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-500 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <AlertTriangle size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-500 mb-1">Nenhum documento encontrado</p>
          <p className="text-xs text-slate-400 mb-6">Faça upload do primeiro documento para começar.</p>
          <Link
            href="/gs/documentos/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <Plus size={16} />
            Fazer Upload
          </Link>
        </div>
      )}
    </div>
  );
}
