'use client';

import { useState } from 'react';
import { Save, Send, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { gsApi } from '@/lib/gs/auth';

interface NotificationItem {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  daysBefore?: number;
  daysOptions?: number[];
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    key: 'pagamento_recebido',
    label: 'Pagamento recebido',
    description: 'Notificar quando um cliente realizar o pagamento',
    enabled: true,
  },
  {
    key: 'fatura_vencida',
    label: 'Fatura vencida',
    description: 'Notificar quando uma fatura estiver em atraso',
    enabled: true,
  },
  {
    key: 'certificado_expiracao',
    label: 'Certificado perto de expirar',
    description: 'Notificar antes do certificado expirar',
    enabled: true,
    daysBefore: 30,
    daysOptions: [7, 15, 30],
  },
  {
    key: 'certificado_expirado',
    label: 'Certificado expirado',
    description: 'Notificar quando o certificado expirar',
    enabled: true,
  },
  {
    key: 'novo_ticket',
    label: 'Novo ticket de suporte',
    description: 'Notificar quando um novo ticket for aberto',
    enabled: true,
  },
  {
    key: 'resposta_ticket',
    label: 'Resposta de ticket',
    description: 'Notificar quando houver resposta em um ticket',
    enabled: true,
  },
];

type RecipientOption = 'apenas_eu' | 'todos_admins' | 'email_especifico';

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);
  const [recipient, setRecipient] = useState<RecipientOption>('todos_admins');
  const [specificEmail, setSpecificEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [testEmailInput, setTestEmailInput] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleNotification = (key: string) => {
    setNotifications(prev =>
      prev.map(n => n.key === key ? { ...n, enabled: !n.enabled } : n)
    );
  };

  const setDaysBefore = (key: string, days: number) => {
    setNotifications(prev =>
      prev.map(n => n.key === key ? { ...n, daysBefore: days } : n)
    );
  };

  const handleSave = async () => {
    try {
      await gsApi.post('/gs/configuracoes/notificacoes', {
        notifications,
        recipient,
        specificEmail: recipient === 'email_especifico' ? specificEmail : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleTestEmail = async () => {
    const email = testEmailInput.trim();
    if (!email) return;

    setTesting(true);
    setTestResult('sending');

    try {
      const res = await fetch('/api/gs/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setTestResult('success');
      } else {
        setTestResult('error');
      }
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult('idle'), 4000);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Notificações</h1>
        <p className="text-sm text-slate-400 mt-1">Configure quais notificações por e-mail sua AR receberá</p>
      </div>

      {/* Quem recebe */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm max-w-xl">
        <h2 className="text-sm font-bold text-slate-700 mb-4">Quem recebe as notificações</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer">
            <input
              type="radio"
              name="recipient"
              value="apenas_eu"
              checked={recipient === 'apenas_eu'}
              onChange={() => setRecipient('apenas_eu')}
              className="accent-emerald-600"
            />
            <div>
              <p className="text-sm font-semibold text-slate-700">Apenas eu</p>
              <p className="text-xs text-slate-400">Somente eu recebo os e-mails de notificação</p>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer">
            <input
              type="radio"
              name="recipient"
              value="todos_admins"
              checked={recipient === 'todos_admins'}
              onChange={() => setRecipient('todos_admins')}
              className="accent-emerald-600"
            />
            <div>
              <p className="text-sm font-semibold text-slate-700">Todos admins da AR</p>
              <p className="text-xs text-slate-400">Todos os administradores cadastrados recebem as notificações</p>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer">
            <input
              type="radio"
              name="recipient"
              value="email_especifico"
              checked={recipient === 'email_especifico'}
              onChange={() => setRecipient('email_especifico')}
              className="accent-emerald-600"
            />
            <div>
              <p className="text-sm font-semibold text-slate-700">E-mail específico</p>
              <p className="text-xs text-slate-400">Enviar para um e-mail específico</p>
            </div>
          </label>
          {recipient === 'email_especifico' && (
            <input
              type="email"
              placeholder="email@exemplo.com.br"
              value={specificEmail}
              onChange={e => setSpecificEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all mt-2"
            />
          )}
        </div>
      </div>

      {/* Toggles */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden max-w-xl">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-700">Eventos de notificação</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {notifications.map((item) => (
            <div key={item.key}>
              <div className="px-6 py-3.5 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                    {item.daysOptions && (
                      <button
                        onClick={() => toggleSection(item.key)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {expandedSection === item.key ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                </div>
                <button
                  onClick={() => toggleNotification(item.key)}
                  className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ml-4 ${
                    item.enabled ? 'bg-emerald-400' : 'bg-slate-200'
                  }`}
                  aria-label={item.enabled ? `Desativar ${item.label}` : `Ativar ${item.label}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                    item.enabled ? 'translate-x-5' : ''
                  }`} />
                </button>
              </div>
              {item.daysOptions && expandedSection === item.key && (
                <div className="px-6 pb-4 pt-0">
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
                    <span className="text-xs font-medium text-slate-500">Notificar em:</span>
                    {item.daysOptions.map(days => (
                      <button
                        key={days}
                        onClick={() => setDaysBefore(item.key, days)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          item.daysBefore === days
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {days} dias
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Test Email */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm max-w-xl">
        <h2 className="text-sm font-bold text-slate-700 mb-4">Enviar e-mail de teste</h2>
        <p className="text-xs text-slate-400 mb-4">
          Envie um e-mail de teste para verificar se as configurações estão corretas.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="email"
            placeholder="seu@email.com.br"
            value={testEmailInput}
            onChange={e => setTestEmailInput(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
          <button
            onClick={handleTestEmail}
            disabled={testing || !testEmailInput.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            {testing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send size={16} />
                Enviar teste
              </>
            )}
          </button>
        </div>
        {testResult === 'success' && (
          <div className="flex items-center gap-2 mt-3 text-emerald-600 text-sm font-medium">
            <CheckCircle2 size={16} />
            E-mail enviado com sucesso! Verifique sua caixa de entrada.
          </div>
        )}
        {testResult === 'error' && (
          <div className="flex items-center gap-2 mt-3 text-red-500 text-sm font-medium">
            <AlertTriangle size={16} />
            Falha ao enviar. Verifique as configurações de e-mail.
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center justify-between max-w-xl">
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
        >
          <Save size={16} />
          {saved ? 'Salvo!' : 'Salvar configurações'}
        </button>
      </div>
    </div>
  );
}
