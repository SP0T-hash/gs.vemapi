'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  TestTube,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Shield,
  RefreshCw,
  HardDrive,
} from 'lucide-react';

type Provider = 's3' | 'r2';

interface StorageConfig {
  provider: Provider;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  encryptionEnabled: boolean;
  maxFileSize: number;
  allowedMimeTypes: string[];
  signedUrlExpiration: number;
  encryptionKey?: string;
}

const DEFAULT_CONFIG: StorageConfig = {
  provider: 'r2',
  endpoint: '',
  region: 'auto',
  accessKeyId: '',
  secretAccessKey: '',
  bucketName: 'gs-vemapi-storage',
  encryptionEnabled: true,
  maxFileSize: 10,
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  signedUrlExpiration: 60,
};

const PROVIDER_INFO: Record<Provider, { name: string; desc: string }> = {
  s3: { name: 'Amazon S3', desc: 'Provedor padrão da AWS, amplamente utilizado e compatível com a maioria dos serviços.' },
  r2: { name: 'Cloudflare R2', desc: 'Zero taxas de egress, performance global integrada à rede Cloudflare.' },
};

const EXPIRATION_OPTIONS = [
  { value: 15, label: '15 minutos' },
  { value: 60, label: '1 hora' },
  { value: 360, label: '6 horas' },
  { value: 1440, label: '24 horas' },
];

const MIME_TAGS = ['application/pdf', 'image/jpeg', 'image/png'];
const MIME_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
};

export default function StorageConfigPage() {
  const [config, setConfig] = useState<StorageConfig>(DEFAULT_CONFIG);
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [mimeInput, setMimeInput] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('gs_storage_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
      }
    } catch {
      // Ignore
    }
    setConfigLoaded(true);
  }, []);

  const handleSave = useCallback(() => {
    try {
      const toSave = { ...config };
      delete toSave.encryptionKey;
      localStorage.setItem('gs_storage_config', JSON.stringify(toSave));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Ignore
    }
  }, [config]);

  const handleTest = useCallback(async () => {
    if (!configLoaded) return;
    setTesting(true);
    setTestResult(null);

    try {
      handleSave();
      const res = await fetch('/api/gs/storage/test');
      const data = await res.json();
      setTestResult(data.success ?? false);
    } catch {
      setTestResult(false);
    } finally {
      setTesting(false);
    }
  }, [configLoaded, handleSave]);

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem('gs_storage_config');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGenerateKey = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const hex = Array.from(array).map((b) => b.toString(16).padStart(2, '0')).join('');
    setGeneratedKey(hex);
  };

  const updateConfig = useCallback(<K extends keyof StorageConfig>(key: K, value: StorageConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addMimeType = () => {
    const trimmed = mimeInput.trim();
    if (trimmed && !config.allowedMimeTypes.includes(trimmed)) {
      updateConfig('allowedMimeTypes', [...config.allowedMimeTypes, trimmed]);
      setMimeInput('');
    }
  };

  const removeMimeType = (mime: string) => {
    updateConfig('allowedMimeTypes', config.allowedMimeTypes.filter((m) => m !== mime));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Armazenamento</h1>
          <p className="text-sm text-slate-400 mt-1">Configuração do provedor de armazenamento</p>
        </div>
        <Link
          href="/gs/configuracoes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft size={14} />
          Voltar
        </Link>
      </div>

      {/* Provider Section */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Provedor</h2>

        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(PROVIDER_INFO) as [Provider, { name: string; desc: string }][]).map(([key, info]) => (
            <button
              key={key}
              onClick={() => updateConfig('provider', key)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                config.provider === key
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <HardDrive size={20} className={config.provider === key ? 'text-indigo-600' : 'text-slate-400'} />
              <p className={`text-sm font-bold mt-2 ${config.provider === key ? 'text-indigo-700' : 'text-slate-700'}`}>
                {info.name}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{info.desc}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Endpoint</label>
            <input
              type="text"
              value={config.endpoint}
              onChange={(e) => updateConfig('endpoint', e.target.value)}
              placeholder={config.provider === 'r2' ? 'https://<account>.r2.cloudflarestorage.com' : 'https://s3.<region>.amazonaws.com'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Região</label>
            <input
              type="text"
              value={config.region}
              onChange={(e) => updateConfig('region', e.target.value)}
              placeholder={config.provider === 'r2' ? 'auto' : 'us-east-1'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Access Key ID</label>
            <div className="relative">
              <input
                type={showAccessKey ? 'text' : 'password'}
                value={config.accessKeyId}
                onChange={(e) => updateConfig('accessKeyId', e.target.value)}
                placeholder="AKIA..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowAccessKey(!showAccessKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showAccessKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Secret Access Key</label>
            <div className="relative">
              <input
                type={showSecretKey ? 'text' : 'password'}
                value={config.secretAccessKey}
                onChange={(e) => updateConfig('secretAccessKey', e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showSecretKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Bucket Name</label>
            <input
              type="text"
              value={config.bucketName}
              onChange={(e) => updateConfig('bucketName', e.target.value)}
              placeholder="gs-vemapi-storage"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Encryption Section */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Criptografia</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">Criptografar arquivos antes do upload</p>
            <p className="text-xs text-slate-400">AES-256-GCM no cliente antes de enviar ao provedor</p>
          </div>
          <button
            onClick={() => updateConfig('encryptionEnabled', !config.encryptionEnabled)}
            className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors ${
              config.encryptionEnabled ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
              config.encryptionEnabled ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Shield size={14} className="text-slate-400" />
            <span className="font-medium">Chave mestra:</span>
            <code className="text-[10px] bg-slate-100 px-2 py-0.5 rounded">
              GS_ENCRYPTION_KEY (variável de ambiente)
            </code>
          </div>
          <button
            onClick={handleGenerateKey}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <RefreshCw size={14} />
            Gerar nova chave
          </button>

          {generatedKey && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-bold text-amber-700 mb-1">⚠️ Chave gerada — salve-a em local seguro!</p>
              <code className="text-[10px] bg-amber-100 px-2 py-1 rounded block break-all">{generatedKey}</code>
              <p className="text-[10px] text-amber-600 mt-1">
                Adicione ao .env.local: <code className="font-bold">GS_ENCRYPTION_KEY={generatedKey}</code>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Segurança</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Tamanho Máximo (MB)
            </label>
            <input
              type="number"
              value={config.maxFileSize}
              onChange={(e) => updateConfig('maxFileSize', Number(e.target.value))}
              min={1}
              max={100}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Expiração Signed URL
            </label>
            <select
              value={config.signedUrlExpiration}
              onChange={(e) => updateConfig('signedUrlExpiration', Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            >
              {EXPIRATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            MIME Types Permitidos
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {config.allowedMimeTypes.map((mime) => (
              <span
                key={mime}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold"
              >
                {MIME_LABELS[mime] || mime}
                <button
                  onClick={() => removeMimeType(mime)}
                  className="text-indigo-400 hover:text-indigo-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={mimeInput}
              onChange={(e) => setMimeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMimeType())}
              placeholder="Adicionar MIME type..."
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
            <button
              onClick={addMimeType}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
            >
              Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <Save size={16} />
            {saved ? 'Salvo!' : 'Salvar Configuração'}
          </button>
          <button
            onClick={handleTest}
            disabled={testing}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TestTube size={16} />
            {testing ? 'Testando...' : 'Testar Conexão'}
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 transition-all"
          >
            <RotateCcw size={16} />
            Resetar para Padrão
          </button>
        </div>

        {testResult !== null && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold ${
            testResult ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {testResult ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {testResult ? 'Conexão estabelecida com sucesso!' : 'Falha ao conectar ao provedor.'}
          </div>
        )}
      </div>
    </div>
  );
}
