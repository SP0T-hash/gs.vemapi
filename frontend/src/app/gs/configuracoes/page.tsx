'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Save, Bell, Users, CreditCard, Settings as SettingsIcon, ExternalLink, Shield, ShieldCheck, ShieldOff, Smartphone, Copy, AlertTriangle, RefreshCw, LogOut, Eye } from 'lucide-react';
import { USER_LEVEL_LABELS } from '@/types/gs/permissions';
import { gsApi } from '@/lib/gs/auth';

type ConfigTab = 'geral' | 'planos' | 'gateway' | 'seguranca' | 'notificacoes' | 'equipe';

const TAB_LABELS: Record<ConfigTab, string> = {
  geral: 'Geral',
  planos: 'Planos',
  gateway: 'Gateway',
  seguranca: 'Segurança',
  notificacoes: 'Notificações',
  equipe: 'Equipe',
};

interface TeamMember {
  id: string;
  nome: string;
  email: string;
  nivel: string;
}

const MOCK_TEAM: TeamMember[] = [
  { id: '1', nome: 'Admin Master',   email: 'admin@angry.ac.br',      nivel: 'AC_ADMIN' },
  { id: '2', nome: 'Carlos Suporte', email: 'carlos@angry.ac.br',     nivel: 'AC_SUPORTE' },
  { id: '3', nome: 'Ana Adm AR',     email: 'ana@ar-exemplo.com.br',  nivel: 'AR_ADMIN' },
  { id: '4', nome: 'Maria AGR',      email: 'maria@unidade.com.br',   nivel: 'UNIDADE_AGR' },
];

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<ConfigTab>('geral');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    nome: 'AR Exemplo Ltda',
    cnpj: '11.222.333/0001-81',
    email: 'contato@ar-exemplo.com.br',
    telefone: '(11) 3000-0000',
    endereco: 'Av. Paulista, 1000',
  });
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ─── 2FA state ────────────────────────────────────────────────
  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [tfaLoading, setTfaLoading] = useState(true);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupLoadError, setBackupLoadError] = useState('');
  const [disableConfirm, setDisableConfirm] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState('');

  // Load 2FA status
  useEffect(() => {
    gsApi.get<{ enabled: boolean }>('/auth/2fa/status')
      .then((data) => setTfaEnabled(data.enabled))
      .catch(() => {})
      .finally(() => setTfaLoading(false));
  }, []);

  const loadBackupCodes = async () => {
    setBackupLoadError('');
    try {
      const data = await gsApi.get<{ codes: string[] }>('/auth/2fa/backup-codes');
      setBackupCodes(data.codes);
      setShowBackupModal(true);
    } catch (err: any) {
      setBackupLoadError(err.message || 'Erro ao carregar códigos');
    }
  };

  const handleDisable2FA = async () => {
    setDisableLoading(true);
    setDisableError('');
    try {
      await gsApi.post('/auth/2fa/disable', {
        password: disablePassword,
        token: disableCode,
      });
      setTfaEnabled(false);
      setDisableConfirm(false);
      setDisablePassword('');
      setDisableCode('');
    } catch (err: any) {
      setDisableError(err.message || 'Erro ao desativar 2FA');
    } finally {
      setDisableLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Configurações</h1>
        <p className="text-sm text-slate-400 mt-1">Gerencie as configurações da sua AR</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {(Object.keys(TAB_LABELS) as ConfigTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
              tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Geral */}
      {tab === 'geral' && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5 max-w-xl">
          <h2 className="text-sm font-bold text-slate-700">Dados da AR</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nome da AR</label>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">CNPJ</label>
              <input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Telefone</label>
              <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Endereço</label>
              <input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
            </div>
          </div>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <Save size={16} />
            {saved ? 'Salvo!' : 'Salvar Configuração'}
          </button>
        </div>
      )}

      {/* Planos */}
      {tab === 'planos' && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm max-w-lg">
          <h2 className="text-sm font-bold text-slate-700 mb-2">Planos e Assinatura</h2>
          <p className="text-sm text-slate-500 mb-4">Visualize e gerencie seu plano atual, faça upgrade ou downgrade.</p>
          <Link
            href="/gs/configuracoes/planos"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <CreditCard size={16} />
            Gerenciar Planos e Assinatura
            <ExternalLink size={14} />
          </Link>
        </div>
      )}

      {/* Gateway */}
      {tab === 'gateway' && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm max-w-lg">
          <h2 className="text-sm font-bold text-slate-700 mb-2">Gateway de Pagamento</h2>
          <p className="text-sm text-slate-500 mb-4">Configure a integração com o Asaas para cobranças.</p>
          <Link
            href="/gs/configuracoes/gateway"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <SettingsIcon size={16} />
            Configurar Asaas
            <ExternalLink size={14} />
          </Link>
        </div>
      )}

      {/* Segurança */}
      {tab === 'seguranca' && (
        <div className="max-w-xl space-y-5">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Autenticação de Dois Fatores</h2>

            {tfaLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                <RefreshCw size={16} className="animate-spin" />
                Verificando status...
              </div>
            ) : tfaEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <ShieldCheck size={22} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-800">✅ Ativado</p>
                    <p className="text-xs text-emerald-600">
                      Sua conta está protegida com autenticação de dois fatores.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={loadBackupCodes}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 transition-all"
                  >
                    <Eye size={14} />
                    Ver códigos de recuperação
                  </button>
                  <button
                    onClick={() => setDisableConfirm(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-600 transition-all border border-red-100"
                  >
                    <ShieldOff size={14} />
                    Desativar 2FA
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Shield size={22} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-800">❌ Desativado</p>
                    <p className="text-xs text-amber-600">
                      A autenticação de dois fatores adiciona uma camada extra de segurança à sua conta. Recomendamos ativar.
                    </p>
                  </div>
                </div>

                <Link
                  href="/gs/2fa/setup"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                >
                  <ShieldCheck size={16} />
                  Ativar 2FA
                </Link>
              </div>
            )}
          </div>

          {/* Sessões ativas */}
          {tfaEnabled && (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-700 mb-4">Sessões Ativas</h2>
              <p className="text-xs text-slate-400 mb-4">
                Gerencie as sessões ativas da sua conta em outros dispositivos.
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Smartphone size={16} className="text-slate-400" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Dispositivo atual</p>
                      <p className="text-[10px] text-slate-400">Windows • Chrome • {new Date().toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">Atual</span>
                </div>
              </div>
            </div>
          )}

          {/* Backup codes error */}
          {backupLoadError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {backupLoadError}
            </div>
          )}
        </div>
      )}

      {/* Backup Codes Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowBackupModal(false)} />
          <div className="relative bg-white border border-slate-100 rounded-2xl p-6 shadow-xl max-w-md w-full">
            <h3 className="text-sm font-bold text-slate-700 mb-2">Códigos de Recuperação</h3>
            <p className="text-xs text-slate-400 mb-4">
              Estes códigos podem ser usados uma única vez para recuperar o acesso à sua conta.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {backupCodes.map((code, i) => (
                <div
                  key={i}
                  className="bg-slate-50 rounded-xl px-3 py-2 font-mono text-sm font-bold text-slate-700 text-center tracking-wider border border-slate-100"
                >
                  {code.slice(0, 5)}-{code.slice(5)}
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowBackupModal(false)}
              className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {disableConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setDisableConfirm(false)} />
          <div className="relative bg-white border border-slate-100 rounded-2xl p-6 shadow-xl max-w-sm w-full">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100 mb-4">
              <AlertTriangle size={20} className="text-red-600 shrink-0" />
              <p className="text-xs text-red-700 font-medium">
                Tem certeza? Desativar o 2FA reduz a segurança da sua conta.
              </p>
            </div>

            <h3 className="text-sm font-bold text-slate-700 mb-4">Confirme sua senha</h3>

            {disableError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700 flex items-start gap-1.5">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {disableError}
              </div>
            )}

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Senha atual</label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Código 2FA</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all tracking-[0.3em]"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setDisableConfirm(false); setDisableError(''); setDisablePassword(''); setDisableCode(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-600 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDisable2FA}
                disabled={!disablePassword || disableCode.length !== 6 || disableLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {disableLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Desativando...
                  </>
                ) : (
                  'Desativar 2FA'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificações */}
      {tab === 'notificacoes' && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm max-w-lg">
          <h2 className="text-sm font-bold text-slate-700 mb-2">Preferências de Notificação</h2>
          <p className="text-sm text-slate-500 mb-4">Configure quais notificações por e-mail sua AR receberá.</p>
          <Link
            href="/gs/configuracoes/notificacoes"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <Bell size={16} />
            Gerenciar Notificações
            <ExternalLink size={14} />
          </Link>
        </div>
      )}

      {/* Equipe */}
      {tab === 'equipe' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden max-w-xl">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">Membros da Equipe</h2>
            <span className="text-xs text-slate-400">{MOCK_TEAM.length} membros</span>
          </div>
          <div className="divide-y divide-slate-50">
            {MOCK_TEAM.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                    {m.nome.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{m.nome}</p>
                    <p className="text-xs text-slate-400">{m.email}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-500">{USER_LEVEL_LABELS[m.nivel as keyof typeof USER_LEVEL_LABELS] || m.nivel}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
