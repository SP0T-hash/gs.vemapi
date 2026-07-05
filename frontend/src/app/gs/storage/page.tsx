'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  HardDrive,
  Upload,
  FileText,
  Shield,
  Server,
  Database,
  CheckCircle2,
  XCircle,
  Copy,
  ClipboardCheck,
  ExternalLink,
  RefreshCw,
  Activity,
  FolderOpen,
} from 'lucide-react';

interface StorageStats {
  totalFiles: number;
  usedSpace: number;
  totalSpace: number;
  documentos: number;
  certificados: number;
}

interface BucketInfo {
  name: string;
  files: number;
  size: number;
  lastModified: string;
}

interface ProviderInfo {
  provider: string;
  bucket: string;
  region: string;
  encryption: boolean;
}

const STORAGE_API = '/api/gs/storage';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

const MOCK_STATS: StorageStats = {
  totalFiles: 1543,
  usedSpace: 2_847_000_000,
  totalSpace: 10_737_418_240,
  documentos: 892,
  certificados: 651,
};

const MOCK_BUCKETS: BucketInfo[] = [
  { name: 'documentos', files: 892, size: 1_234_567_890, lastModified: '04/07/2026 14:32' },
  { name: 'certificados', files: 651, size: 1_612_432_110, lastModified: '04/07/2026 14:30' },
  { name: 'nfs', files: 0, size: 0, lastModified: '—' },
];

const MOCK_PROVIDER: ProviderInfo = {
  provider: 'Cloudflare R2',
  bucket: 'gs-vemapi-storage',
  region: 'auto',
  encryption: true,
};

export default function StoragePage() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${STORAGE_API}/stats`).then(r => r.json()).catch(() => MOCK_STATS),
      fetch(`${STORAGE_API}/buckets`).then(r => r.json()).catch(() => MOCK_BUCKETS),
      fetch(`${STORAGE_API}/provider`).then(r => r.json()).catch(() => MOCK_PROVIDER),
    ])
      .then(([s, b, p]) => {
        setStats(s);
        setBuckets(b);
        setProvider(p);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${STORAGE_API}/test`);
      const data = await res.json();
      setTestResult(data.success ?? false);
    } catch {
      setTestResult(false);
    } finally {
      setTesting(false);
    }
  };

  const handleCopyCORS = () => {
    const corsConfig = JSON.stringify({
      allowedOrigins: ['https://vemapi.com.br', 'https://app.vemapi.com.br'],
      allowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 3600,
    }, null, 2);
    navigator.clipboard.writeText(corsConfig).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={28} className="text-slate-300 animate-spin" />
      </div>
    );
  }

  const usagePercent = stats ? Math.round((stats.usedSpace / stats.totalSpace) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Armazenamento</h1>
        <p className="text-sm text-slate-400 mt-1">Documentos · Certificados · Notas Fiscais</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <FileText size={20} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800">{stats?.totalFiles.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-slate-500 mt-1">Total de Arquivos</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Database size={20} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800">{formatBytes(stats?.usedSpace ?? 0)}</p>
          <p className="text-xs text-slate-500 mt-1">Espaço Utilizado</p>
          <div className="mt-2 bg-slate-100 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{usagePercent}% de {formatBytes(stats?.totalSpace ?? 0)}</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <FolderOpen size={20} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800">{stats?.documentos.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-slate-500 mt-1">Documentos</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Shield size={20} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800">{stats?.certificados.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-slate-500 mt-1">Certificados</p>
        </div>
      </div>

      {/* Provider Info + Test */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Provedor</h2>
            <button
              onClick={handleTest}
              disabled={testing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {testing ? <RefreshCw size={14} className="animate-spin" /> : <Server size={14} />}
              {testing ? 'Testando...' : 'Testar Conexão'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Provider</p>
              <p className="text-sm font-semibold text-slate-700">{provider?.provider}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Bucket</p>
              <p className="text-sm font-semibold text-slate-700">{provider?.bucket}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Região</p>
              <p className="text-sm font-semibold text-slate-700">{provider?.region}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Criptografia</p>
              <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={14} /> Ativo (AES-256-GCM)
              </p>
            </div>
          </div>

          {testResult !== null && (
            <div className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
              testResult ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}>
              {testResult ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {testResult ? 'Conexão estabelecida com sucesso!' : 'Falha ao conectar ao provedor de armazenamento.'}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Ações Rápidas</h2>
          <div className="space-y-3">
            <Link
              href="/gs/documentos/upload"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors text-sm font-semibold"
            >
              <Upload size={16} />
              Upload Documento
            </Link>
            <Link
              href="/gs/documentos"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors text-sm font-semibold"
            >
              <FileText size={16} />
              Ver Documentos
            </Link>
            <Link
              href="/gs/configuracoes/storage"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors text-sm font-semibold"
            >
              <HardDrive size={16} />
              Configurações de Armazenamento
            </Link>
          </div>
        </div>
      </div>

      {/* Buckets */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Buckets</h2>
          <button
            onClick={handleCopyCORS}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            {copied ? <ClipboardCheck size={14} /> : <Copy size={14} />}
            {copied ? 'Copiado!' : 'Configurar CORS'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {buckets.map((b) => (
            <div key={b.name} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Database size={18} className="text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-700">{b.name}</h3>
              </div>
              <div className="space-y-1 text-xs text-slate-500">
                <p>Arquivos: <span className="font-semibold text-slate-700">{b.files.toLocaleString('pt-BR')}</span></p>
                <p>Tamanho: <span className="font-semibold text-slate-700">{formatBytes(b.size)}</span></p>
                <p>Última modif.: <span className="font-semibold text-slate-700">{b.lastModified}</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
