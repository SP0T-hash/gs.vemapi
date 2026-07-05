'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  UserCog,
  Headphones,
  Calculator,
  Settings,
  LogOut,
  ChevronDown,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  HardDrive,
} from 'lucide-react';
import { checkSession, logoutGS, getCurrentUser, type GS_UserSession } from '@/lib/gs/auth';
import { USER_LEVEL_LABELS, USER_LEVEL_COLORS } from '@/types/gs/permissions';

/**
 * Layout principal do app GS (protegido)
 *
 * Sidebar minimalista com navegação por módulos.
 * Design System v2.0: light mode, emerald/indigo.
 */
export default function GSLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<GS_UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkSession().then((u) => {
      if (!u) {
        router.replace('/gs/login');
        return;
      }
      setUser(u);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw size={32} className="animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-sm text-slate-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-[40] w-[65px] bg-white/70 backdrop-blur-lg
                     border-r border-slate-100 flex flex-col items-center py-4 shrink-0
                     transition-all duration-300 shadow-[1px_0_10px_-5px_rgba(0,0,0,0.05)]
                     hidden md:flex`}
      >
        {/* Logo */}
        <Link
          href="/gs"
          className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center
                     shadow-lg shadow-indigo-600/20 mb-6 hover:bg-indigo-700 transition-colors"
          aria-label="GS VEMAPI - Início"
        >
          <ShieldCheck size={22} className="text-white" aria-hidden="true" />
        </Link>

        {/* Navegação */}
        <nav className="flex flex-col items-center gap-3 flex-1">
          <NavItem
            href="/gs"
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            active={pathname === '/gs'}
          />
          <NavItem
            href="/gs/pedidos"
            icon={<FileText size={20} />}
            label="Pedidos"
            active={pathname.startsWith('/gs/pedidos')}
          />
          <NavItem
            href="/gs/clientes"
            icon={<Users size={20} />}
            label="Clientes"
            active={pathname.startsWith('/gs/clientes')}
          />
          <NavItem
            href="/gs/unidades"
            icon={<Building2 size={20} />}
            label="Unidades"
            active={pathname.startsWith('/gs/unidades')}
            show={['AC_ADMIN', 'AR_ADMIN', 'UNIDADE_ADMIN'].includes(user.nivel)}
          />
          <NavItem
            href="/gs/usuarios"
            icon={<UserCog size={20} />}
            label="Usuários"
            active={pathname.startsWith('/gs/usuarios')}
            show={['AC_ADMIN', 'AR_ADMIN', 'UNIDADE_ADMIN'].includes(user.nivel)}
          />
          <NavItem
            href="/gs/suporte"
            icon={<Headphones size={20} />}
            label="Suporte"
            active={pathname.startsWith('/gs/suporte')}
          />
          <NavItem
            href="/gs/contador"
            icon={<Calculator size={20} />}
            label="Contador"
            active={pathname.startsWith('/gs/contador')}
            show={user.nivel === 'CONTADOR'}
          />
          <NavItem
            href="/gs/integracoes"
            icon={<RefreshCw size={20} />}
            label="Integrações"
            active={pathname.startsWith('/gs/integracoes')}
            show={['AC_ADMIN', 'AR_ADMIN'].includes(user.nivel)}
          />
          <NavItem
            href="/gs/storage"
            icon={<HardDrive size={20} />}
            label="Storage"
            active={pathname.startsWith('/gs/storage') || pathname.startsWith('/gs/documentos') || pathname.startsWith('/gs/configuracoes/storage')}
            show={['AC_ADMIN', 'AR_ADMIN'].includes(user.nivel)}
          />
        </nav>

        {/* Config */}
        <div className="mt-auto">
          <NavItem
            href="/gs/configuracoes"
            icon={<Settings size={20} />}
            label="Configurações"
            active={pathname.startsWith('/gs/configuracoes')}
          />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 md:ml-[65px] flex flex-col">
        {/* Top Navbar */}
        <header
          className="h-[65px] bg-white/80 backdrop-blur-md border-b border-slate-100
                     flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0
                     z-[50] shadow-[0_1px_10px_-5px_rgba(0,0,0,0.10)]"
        >
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Abrir menu"
            >
              <LayoutDashboard size={20} className="text-slate-600" />
            </button>

            <div>
              <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                GS VEMAPI
              </h1>
              {user.arNome && (
                <p className="text-[10px] text-slate-400">{user.arNome}</p>
              )}
            </div>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50
                         transition-colors focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-xs font-bold text-indigo-700">
                  {user.nome.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-slate-700">{user.nome}</p>
                <p className="text-[10px] text-slate-400">{USER_LEVEL_LABELS[user.nivel]}</p>
              </div>
              <ChevronDown size={16} className="text-slate-400" aria-hidden="true" />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div
                  className="absolute right-0 mt-2 w-64 bg-white border border-slate-100
                             rounded-2xl shadow-modal p-2 z-20"
                  role="menu"
                >
                  <div className="px-3 py-2 border-b border-slate-100 mb-2">
                    <p className="text-sm font-semibold text-slate-700">{user.nome}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px]
                                  font-bold uppercase tracking-wide border mt-1.5
                                  ${USER_LEVEL_COLORS[user.nivel].bg}
                                  ${USER_LEVEL_COLORS[user.nivel].text}
                                  ${USER_LEVEL_COLORS[user.nivel].border}`}
                    >
                      {USER_LEVEL_LABELS[user.nivel]}
                    </span>
                  </div>

                  <button
                    onClick={() => logoutGS()}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl
                               text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    role="menuitem"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    Sair do Sistema
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 w-[250px] bg-white border-r border-slate-100
                       shadow-lg z-40 p-4 overflow-y-auto animate-in slide-in-from-left"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                <ShieldCheck size={22} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">GS VEMAPI</p>
                <p className="text-[10px] text-slate-400">{USER_LEVEL_LABELS[user.nivel]}</p>
              </div>
            </div>

            <nav className="space-y-1">
              <MobileNavItem href="/gs" icon={<LayoutDashboard size={18} />} label="Dashboard" active={pathname === '/gs'} onClick={() => setSidebarOpen(false)} />
              <MobileNavItem href="/gs/pedidos" icon={<FileText size={18} />} label="Pedidos" active={pathname.startsWith('/gs/pedidos')} onClick={() => setSidebarOpen(false)} />
              <MobileNavItem href="/gs/clientes" icon={<Users size={18} />} label="Clientes" active={pathname.startsWith('/gs/clientes')} onClick={() => setSidebarOpen(false)} />
              <MobileNavItem href="/gs/unidades" icon={<Building2 size={18} />} label="Unidades" active={pathname.startsWith('/gs/unidades')} onClick={() => setSidebarOpen(false)} />
              <MobileNavItem href="/gs/usuarios" icon={<UserCog size={18} />} label="Usuários" active={pathname.startsWith('/gs/usuarios')} onClick={() => setSidebarOpen(false)} />
              <MobileNavItem href="/gs/suporte" icon={<Headphones size={18} />} label="Suporte" active={pathname.startsWith('/gs/suporte')} onClick={() => setSidebarOpen(false)} />
              <MobileNavItem href="/gs/integracoes" icon={<RefreshCw size={18} />} label="Integrações" active={pathname.startsWith('/gs/integracoes')} onClick={() => setSidebarOpen(false)} />
              {(user.nivel === 'AC_ADMIN' || user.nivel === 'AR_ADMIN') && (
                <MobileNavItem href="/gs/storage" icon={<HardDrive size={18} />} label="Storage" active={pathname.startsWith('/gs/storage') || pathname.startsWith('/gs/documentos') || pathname.startsWith('/gs/configuracoes/storage')} onClick={() => setSidebarOpen(false)} />
              )}
              <MobileNavItem href="/gs/configuracoes" icon={<Settings size={18} />} label="Config" active={pathname.startsWith('/gs/configuracoes')} onClick={() => setSidebarOpen(false)} />
            </nav>

            <hr className="my-4 border-slate-100" />
            <button
              onClick={() => logoutGS()}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} /> Sair
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}

// ─── Componentes ───────────────────────────────────────────────────────────────

function NavItem({
  href,
  icon,
  label,
  active,
  show = true,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  show?: boolean;
}) {
  if (!show) return null;

  return (
    <Link
      href={href}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2
        ${active
          ? 'bg-emerald-100 text-emerald-600 shadow-sm'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
        }`}
      aria-label={label}
      title={label}
    >
      {icon}
    </Link>
  );
}

function MobileNavItem({
  href,
  icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
        ${active
          ? 'bg-emerald-50 text-emerald-700'
          : 'text-slate-600 hover:bg-slate-50'
        }`}
    >
      <span className={active ? 'text-emerald-600' : 'text-slate-400'}>{icon}</span>
      {label}
    </Link>
  );
}
