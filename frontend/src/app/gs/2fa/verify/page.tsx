'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react';

const GS_API_URL = process.env.NEXT_PUBLIC_GS_API_URL ?? '/api/gs';

export default function TwoFactorVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tempToken = searchParams.get('token');

  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(5);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!tempToken) {
      router.replace('/gs/login');
      return;
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [tempToken, router]);

  const verifyCode = async (token: string, isBackup: boolean) => {
    setLoading(true);
    setError('');

    try {
      const body = isBackup
        ? { tempToken, backupCode: token }
        : { tempToken, code: token };

      const response = await fetch(`${GS_API_URL}/auth/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Erro ao verificar código' }));
        throw new Error(err.error ?? 'Código inválido. Tente novamente.');
      }

      const data = await response.json();

      // Save session token and redirect
      if (data.session_token || data.token) {
        document.cookie = `gs_token=${data.session_token || data.token}; path=/; SameSite=Strict; Secure`;
      }

      router.replace('/gs');
    } catch (err: any) {
      const msg = err.message || 'Código inválido. Tente novamente.';
      setError(msg);
      setAttempts((prev) => Math.max(0, prev - 1));
      setCode('');
      setBackupCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
    setError('');
    if (val.length === 6) {
      verifyCode(val, false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted);
      setTimeout(() => verifyCode(pasted, false), 100);
    }
  };

  const handleBackupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = backupCode.replace(/[^A-Za-z0-9]/g, '');
    if (formatted.length < 10) {
      setError('Código de recuperação inválido. O formato esperado é XXXXX-XXXXX.');
      return;
    }
    verifyCode(backupCode, true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/20">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            GS VEMAPI
          </h1>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xl">
          <div className="text-center mb-6">
            <ShieldCheck size={28} className="text-indigo-600 mx-auto mb-3" />
            <h2 className="text-sm font-bold text-slate-700 mb-1">
              Autenticação de Dois Fatores
            </h2>
            <p className="text-xs text-slate-400">
              {useBackup
                ? 'Digite um dos seus códigos de recuperação'
                : 'Insira o código de 6 dígitos do seu aplicativo autenticador'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                {error}
                {attempts > 0 && attempts < 5 && (
                  <p className="text-xs text-red-500 mt-1">
                    Tentativas restantes: {attempts}
                  </p>
                )}
              </div>
            </div>
          )}

          {!useBackup ? (
            <>
              <div className="mb-6">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={handleCodeChange}
                  onPaste={handlePaste}
                  disabled={loading}
                  placeholder="000000"
                  className="w-full text-center text-3xl font-bold tracking-[0.5em] px-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>

              <button
                onClick={() => verifyCode(code, false)}
                disabled={code.length !== 6 || loading}
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar'
                )}
              </button>

              <button
                onClick={() => { setUseBackup(true); setError(''); }}
                className="w-full text-xs text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
              >
                Usar código de recuperação
              </button>
            </>
          ) : (
            <form onSubmit={handleBackupSubmit}>
              <div className="mb-4">
                <input
                  type="text"
                  value={backupCode}
                  onChange={(e) => { setBackupCode(e.target.value); setError(''); }}
                  placeholder="XXXXX-XXXXX"
                  disabled={loading}
                  className="w-full text-center text-lg font-mono font-bold tracking-wider px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={!backupCode || loading}
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <Link
            href="/gs/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft size={14} />
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
