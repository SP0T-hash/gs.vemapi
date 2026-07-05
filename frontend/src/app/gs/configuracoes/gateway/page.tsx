'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, EyeOff, TestTube, CheckCircle2, XCircle, Copy, ClipboardCheck, ExternalLink, Wallet, Webhook } from 'lucide-react';

interface TestResult {
  success: boolean;
  balance?: number;
  webhookUrl?: string;
  environment?: string;
  walletId?: string | null;
  error?: string;
  configured?: boolean;
}

export default function GatewayPage() {
  const [apiKey, setApiKey] = useState('');
  const [environment, setEnvironment] = useState('sandbox');
  const [walletId, setWalletId] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [configured, setConfigured] = useState(false);
  const [copied, setCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('gs_gateway_config');
      if (stored) {
        const config = JSON.parse(stored);
        if (config.apiKey) {
          setApiKey(config.apiKey);
          setConfigured(true);
        }
        if (config.environment) setEnvironment(config.environment);
        if (config.walletId) setWalletId(config.walletId);
      }
      const storedUrl = localStorage.getItem('gs_gateway_webhook_url');
      if (storedUrl) setWebhookUrl(storedUrl);
    } catch {
      // Ignore parse errors
    }
    setConfigLoaded(true);
  }, []);

  const handleSave = useCallback(() => {
    try {
      localStorage.setItem('gs_gateway_config', JSON.stringify({
        apiKey,
        environment,
        walletId,
      }));
      setConfigured(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Storage may be unavailable
    }
  }, [apiKey, environment, walletId]);

  const handleTest = useCallback(async () => {
    if (!configLoaded) return;
    setTesting(true);
    setTestResult(null);

    try {
      handleSave();
      const response = await fetch('/api/gs/gateway/test');
      const result: TestResult = await response.json();
      setTestResult(result);
      if (result.webhookUrl) {
        setWebhookUrl(result.webhookUrl);
        localStorage.setItem('gs_gateway_webhook_url', result.webhookUrl);
      }
    } catch {
      setTestResult({
        success: false,
        error: 'Erro de conexão com o servidor.',
      });
    } finally {
      setTesting(false);
    }
  }, [configLoaded, handleSave]);

  const handleCopyWebhookUrl = useCallback(() => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [webhookUrl]);

  const apiUrl = environment === 'production'
    ? 'https://api.asaas.com/api/v3'
    : 'https://sandbox.asaas.com/api/v3';

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gateway de Pagamento</h1>
          <p className="text-sm text-slate-400 mt-1">Asaas — Configuração de integração</p>
        </div>
        <Link
          href="/gs/configuracoes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft size={14} />
          Voltar
        </Link>
      </div>

      {/* Status */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold ${
        configured ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}>
        {configured ? (
          <><CheckCircle2 size={18} /> Asaas configurado</>
        ) : (
          <><XCircle size={18} /> Não configurado</>
        )}
      </div>

      {/* Form */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-bold text-slate-700">Credenciais</h2>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Asaas API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Insira sua API Key do Asaas"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Ambiente
            </label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            >
              <option value="sandbox">Sandbox (testes)</option>
              <option value="production">Produção</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">API: {apiUrl}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Wallet ID (Split)
            </label>
            <input
              type="text"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              placeholder="ID da carteira Asaas"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
            <p className="text-[10px] text-slate-400 mt-1">Para split de pagamento</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Split % GS
            </label>
            <input
              type="number"
              value={70}
              readOnly
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
            />
            <p className="text-[10px] text-slate-400 mt-1">Porcentagem do GS (fixa)</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Split % AR
            </label>
            <input
              type="number"
              defaultValue={30}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
            <p className="text-[10px] text-slate-400 mt-1">Porcentagem da AR</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <Save size={16} />
            {saved ? 'Salvo!' : 'Salvar Configuração'}
          </button>
          <button
            onClick={handleTest}
            disabled={testing || !apiKey}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TestTube size={16} />
            {testing ? 'Testando...' : 'Testar Conexão'}
          </button>
        </div>

        {testResult && (
          <div className={`rounded-xl border ${
            testResult.success ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
          }`}>
            <div className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold ${
              testResult.success ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {testResult.success ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              {testResult.success ? 'Conexão estabelecida com sucesso!' : testResult.error}
            </div>

            {testResult.success && (
              <div className="px-4 pb-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Wallet size={16} className="text-slate-400" />
                  <span className="font-medium">Saldo Asaas:</span>
                  <span className="font-bold text-emerald-600">
                    {testResult.balance != null
                      ? `R$ ${testResult.balance.toFixed(2)}`
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Webhook size={16} className="text-slate-400" />
                  <span className="font-medium">Webhook URL:</span>
                  <code className="text-xs bg-slate-100 px-2 py-0.5 rounded break-all flex-1">
                    {testResult.webhookUrl}
                  </code>
                  <button
                    onClick={handleCopyWebhookUrl}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                    title="Copiar URL"
                  >
                    {copied ? <ClipboardCheck size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                {testResult.walletId && (
                  <div className="text-xs text-slate-500">
                    Wallet ID: <code className="bg-slate-100 px-1 rounded">{testResult.walletId}</code>
                  </div>
                )}
                <div className="text-xs text-slate-500">
                  Ambiente: <span className="font-medium">{testResult.environment}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Webhook instructions */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <ExternalLink size={14} />
          Configurar Webhook no Asaas
        </h3>
        <ol className="text-xs text-slate-500 space-y-1.5 list-decimal list-inside">
          <li>Acesse o <a href="https://sandbox.asaas.com/config/integracoes" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Painel Asaas</a></li>
          <li>Vá em Configurações &gt; Integrações &gt; Webhook</li>
          <li>Cole a URL abaixo no campo "URL do Webhook":</li>
        </ol>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <code className="text-xs text-slate-600 flex-1 break-all">{webhookUrl || 'Clique em "Testar Conexão" primeiro'}</code>
          {webhookUrl && (
            <button
              onClick={handleCopyWebhookUrl}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              {copied ? <ClipboardCheck size={14} /> : <Copy size={14} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-400">
          Eventos necessários: PAYMENT_CREATED, PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE, PAYMENT_REFUNDED, PAYMENT_DELETED, SUBSCRIPTION_CREATED, SUBSCRIPTION_CANCELLED
        </p>
      </div>

      {/* Info */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Sobre o Split</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          O GS VEMAPI opera com split automático: 70% do valor é repassado ao GS (plataforma) e 30% é destinado à
          AR (Autoridade de Registro). Os valores são configurados por plano e podem ser ajustados conforme contrato.
        </p>
      </div>
    </div>
  );
}
