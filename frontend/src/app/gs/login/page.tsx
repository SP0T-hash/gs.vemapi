'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Eye, EyeOff, RefreshCw, KeyRound, Smartphone, ArrowLeft } from 'lucide-react';
import { loginGS, verify2FACode, checkSession } from '@/lib/gs/auth';

export default function GSLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 2FA state
  const [step, setStep] = useState<'LOGIN' | '2FA'>('LOGIN');
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [backupMode, setBackupMode] = useState(false);

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkSession().then((user) => {
      if (user) router.replace('/gs');
      else setChecking(false);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await loginGS(email, password);

      if (result && typeof result === 'object' && 'requires2FA' in result) {
        setTempToken(result.tempToken);
        setStep('2FA');
        setTwoFactorCode('');
        setBackupMode(false);
      } else {
        router.replace('/gs');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verify2FACode(tempToken, twoFactorCode);
      router.replace('/gs');
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar código 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setStep('LOGIN');
    setTempToken('');
    setTwoFactorCode('');
    setError('');
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  if (step === '2FA') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/20">
              <Smartphone size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Autenticação em Dois Fatores
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {backupMode
                ? 'Use um código de backup (XXXXX-XXXXX)'
                : 'Digite o código do seu aplicativo autenticador'}
            </p>
          </div>

          <form
            onSubmit={handle2FASubmit}
            className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xl"
          >
            <h2 className="text-sm font-bold text-slate-600 mb-6 uppercase tracking-wide">
              {backupMode ? 'Código de Backup' : 'Código 2FA'}
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-start gap-2">
                <span className="mt-0.5 shrink-0">⚠</span>
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="2fa-code"
                  className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5"
                >
                  {backupMode ? 'Código de Backup' : 'Código do Autenticador'}
                </label>
                <div className="relative">
                  <input
                    id="2fa-code"
                    type="text"
                    required
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.toUpperCase())}
                    placeholder={backupMode ? 'XXXXX-XXXXX' : '000 000'}
                    autoComplete="one-time-code"
                    maxLength={backupMode ? 11 : 6}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm
                               text-slate-700 placeholder-slate-300 text-center tracking-[0.3em] font-mono text-lg
                               focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                               transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || twoFactorCode.length < (backupMode ? 10 : 6)}
              className="w-full mt-6 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm
                         font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20
                         disabled:opacity-50 disabled:cursor-not-allowed
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin" />
                  Verificando...
                </span>
              ) : (
                'Verificar e Entrar'
              )}
            </button>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft size={14} />
                Voltar
              </button>

              <button
                type="button"
                onClick={() => {
                  setBackupMode(!backupMode);
                  setTwoFactorCode('');
                  setError('');
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {backupMode ? 'Usar código do app' : 'Usar código de backup'}
              </button>
            </div>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Ambiente seguro • GS VEMAPI v2.0
          </p>
        </div>
      </div>
    );
  }

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
          <p className="text-sm text-slate-400 mt-1">
            Sistema de Gestão de Certificados Digitais
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xl"
        >
          <h2 className="text-sm font-bold text-slate-600 mb-6 uppercase tracking-wide">
            Acessar o Sistema
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-start gap-2">
              <span className="mt-0.5 shrink-0">⚠</span>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm
                           text-slate-700 placeholder-slate-300
                           focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                           transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm
                             text-slate-700 placeholder-slate-300 pr-10
                             focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                             transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm
                       font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin" />
                Entrando...
              </span>
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Ambiente seguro • GS VEMAPI v2.0
        </p>
      </div>
    </div>
  );
}
