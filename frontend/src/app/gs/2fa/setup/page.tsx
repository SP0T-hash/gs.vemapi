'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  ShieldCheck,
  Smartphone,
  Key,
  Copy,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { gsApi } from '@/lib/gs/auth';

type SetupStep = 1 | 2 | 3 | 4 | 5;

interface SetupData {
  secret: string;
  otpauth_url: string;
}

export default function TwoFactorSetupPage() {
  const router = useRouter();

  const [step, setStep] = useState<SetupStep>(1);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codesSaved, setCodesSaved] = useState(false);
  const [showError, setShowError] = useState(false);

  const verifyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 3 && verifyInputRef.current) {
      verifyInputRef.current.focus();
    }
  }, [step]);

  const startSetup = async () => {
    setLoading(true);
    setError('');
    setShowError(false);
    try {
      const data = await gsApi.post<SetupData>('/auth/2fa/setup');
      setSetupData(data);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Erro ao iniciar configuração do 2FA');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const verifyToken = async () => {
    if (verifyCode.length !== 6) return;
    setLoading(true);
    setError('');
    setShowError(false);
    try {
      const data = await gsApi.post<{ backup_codes: string[] }>('/auth/2fa/verify', {
        token: verifyCode,
      });
      setBackupCodes(data.backup_codes);
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Código inválido. Tente novamente.');
      setShowError(true);
      setVerifyCode('');
    } finally {
      setLoading(false);
    }
  };

  const finishSetup = async () => {
    if (!codesSaved) return;
    setLoading(true);
    setError('');
    setShowError(false);
    try {
      await gsApi.post('/auth/2fa/enable');
      setStep(5);
    } catch (err: any) {
      setError(err.message || 'Erro ao ativar 2FA');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
    } catch {
      // fallback
    }
  };

  const downloadBackupCodes = () => {
    const content = backupCodes.join('\n');
    const header = '=== GS VEMAPI - Códigos de Recuperação 2FA ===\n';
    const footer = '\nGuarde estes códigos em local seguro.\n';
    const blob = new Blob([header + content + footer], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gs-vemapi-2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleVerifyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerifyCode(val);
    setShowError(false);
    if (val.length === 6) {
      verifyToken();
    }
  };

  const handleVerifyPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setVerifyCode(pasted);
      setTimeout(() => verifyToken(), 100);
    }
  };

  const formatSecret = (secret: string) => {
    const parts = [];
    for (let i = 0; i < secret.length; i += 4) {
      parts.push(secret.slice(i, i + 4));
    }
    return parts.join('-');
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3, 4, 5].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              s === step
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : s < step
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-slate-100 text-slate-300'
            }`}
          >
            {s < step ? <CheckCircle2 size={16} /> : s}
          </div>
          {s < 5 && <div className={`w-6 h-0.5 ${s < step ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
        </div>
      ))}
    </div>
  );

  const renderQRCard = () => {
    if (!setupData) return null;
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-slate-200 inline-block shadow-sm">
          <div className="w-48 h-48 bg-slate-50 rounded-xl flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-3 left-3 w-10 h-10 border-t-[3px] border-l-[3px] border-indigo-400 rounded-tl" />
            <div className="absolute top-3 right-3 w-10 h-10 border-t-[3px] border-r-[3px] border-indigo-400 rounded-tr" />
            <div className="absolute bottom-3 left-3 w-10 h-10 border-b-[3px] border-l-[3px] border-indigo-400 rounded-bl" />
            <div className="absolute bottom-3 right-3 w-10 h-10 border-b-[3px] border-r-[3px] border-indigo-400 rounded-br" />
            <div className="text-center z-10">
              <ShieldCheck size={48} className="text-indigo-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">GS VEMAPI</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 text-center max-w-xs break-all font-mono bg-slate-50 px-3 py-2 rounded-xl">
          {setupData.otpauth_url}
        </p>
      </div>
    );
  };

  // ─── Step 1: Introduction ──────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-600/20">
              <Shield size={36} className="text-white" />
            </div>

            <h1 className="text-xl font-black text-slate-800 tracking-tight text-center mb-2">
              Configure a Autenticação de Dois Fatores
            </h1>
            <p className="text-sm text-slate-400 text-center mb-6">
              Proteja sua conta com uma camada extra de segurança
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Segurança adicional</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Mesmo que sua senha seja comprometida, sua conta permanece protegida.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                <Smartphone size={20} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-indigo-800">Código temporário</p>
                  <p className="text-xs text-indigo-600 mt-0.5">
                    Um código de 6 dígitos gerado a cada 30 segundos pelo seu aplicativo autenticador.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                <Key size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Códigos de recuperação</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Códigos de uso único para recuperar o acesso caso perca seu dispositivo.
                  </p>
                </div>
              </div>
            </div>

            {showError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={startSetup}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Preparando...
                </>
              ) : (
                <>
                  Começar
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 2: QR Code ──────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {renderStepIndicator()}

          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-xl">
            <h1 className="text-lg font-black text-slate-800 tracking-tight text-center mb-2">
              Escaneie o QR Code
            </h1>
            <p className="text-sm text-slate-400 text-center mb-6">
              Escaneie com seu aplicativo autenticador
            </p>

            <div className="flex justify-center mb-6">
              {setupData ? renderQRCard() : (
                <div className="w-48 h-48 bg-slate-50 rounded-2xl flex items-center justify-center">
                  <RefreshCw size={32} className="animate-spin text-slate-300" />
                </div>
              )}
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-2 text-xs text-slate-500">
                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-indigo-600">1</span>
                </div>
                <p>Abra seu aplicativo autenticador (Google Authenticator, Authy, Microsoft Authenticator)</p>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-500">
                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-indigo-600">2</span>
                </div>
                <p>Toque em <strong>+</strong> e escaneie o código ao lado</p>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-500">
                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-indigo-600">3</span>
                </div>
                <p>Ou insira manualmente a chave: <code className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">{setupData ? formatSecret(setupData.secret) : ''}</code></p>
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              Já escaneou? Continuar
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 3: Verify Code ──────────────────────────────────────
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {renderStepIndicator()}

          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/20">
              <Smartphone size={28} className="text-white" />
            </div>

            <h1 className="text-lg font-black text-slate-800 tracking-tight text-center mb-1">
              Verifique o Código
            </h1>
            <p className="text-sm text-slate-400 text-center mb-6">
              Digite o código de 6 dígitos do seu aplicativo
            </p>

            {showError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="mb-6">
              <input
                ref={verifyInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={verifyCode}
                onChange={handleVerifyChange}
                onPaste={handleVerifyPaste}
                disabled={loading}
                placeholder="000000"
                className="w-full text-center text-3xl font-bold tracking-[0.5em] px-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
              />
            </div>

            <button
              onClick={verifyToken}
              disabled={verifyCode.length !== 6 || loading}
              className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar e Ativar'
              )}
            </button>

            <p className="text-center text-xs text-slate-400 mt-4">
              O código expira em 30 segundos
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 4: Backup Codes ─────────────────────────────────────
  if (step === 4) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {renderStepIndicator()}

          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-xl">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100 mb-6">
              <AlertTriangle size={20} className="text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 font-medium">
                Salve estes códigos em um local seguro. Eles são a <strong>ÚNICA</strong> forma de recuperar sua conta se você perder o acesso ao seu aplicativo autenticador.
              </p>
            </div>

            <h1 className="text-lg font-black text-slate-800 tracking-tight text-center mb-4">
              Códigos de Recuperação
            </h1>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {backupCodes.map((code, i) => {
                const formatted = `${code.slice(0, 5)}-${code.slice(5)}`;
                return (
                  <div
                    key={i}
                    className="bg-slate-50 rounded-xl px-3 py-2.5 font-mono text-sm font-bold text-slate-700 text-center tracking-wider border border-slate-100"
                  >
                    {formatted}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={copyBackupCodes}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 transition-all"
              >
                <Copy size={14} />
                Copiar todos
              </button>
              <button
                onClick={downloadBackupCodes}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 transition-all"
              >
                <Download size={14} />
                Baixar
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 transition-all"
              >
                <Printer size={14} />
                Imprimir
              </button>
            </div>

            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={codesSaved}
                onChange={(e) => setCodesSaved(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-500 leading-relaxed">
                Eu salvei meus códigos de recuperação em um local seguro e entendi que sem eles não será possível recuperar minha conta se perder o acesso ao autenticador.
              </span>
            </label>

            {showError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={finishSetup}
              disabled={!codesSaved || loading}
              className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Ativando...
                </>
              ) : (
                'Finalizar'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 5: Complete ─────────────────────────────────────────
  if (step === 5) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-xl text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-200 flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
                <CheckCircle2 size={36} className="text-emerald-600" />
              </div>
            </div>

            <h1 className="text-xl font-black text-slate-800 tracking-tight mb-2">
              Tudo Pronto!
            </h1>
            <p className="text-sm text-emerald-700 font-semibold mb-3">
              Autenticação de dois fatores ativada com sucesso!
            </p>
            <p className="text-xs text-slate-400 mb-6">
              Sessões em outros dispositivos foram encerradas por segurança.
            </p>

            <button
              onClick={() => router.push('/gs/configuracoes')}
              className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
            >
              Ir para Configurações
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
