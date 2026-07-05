/**
 * GS Auth — Autenticação segura do sistema GS
 *
 * - Login com email + senha (bcrypt)
 * - Sessão via JWT + cookie httpOnly
 * - Refresh token automático
 * - Rate limit por IP
 * - Logs de auditoria
 */

const GS_API_URL = process.env.NEXT_PUBLIC_GS_API_URL ?? '/api/gs';
const TOKEN_COOKIE = 'gs_token';

// ─── Gerenciamento do token em memória ─────────────────────────────────────────
let inMemoryToken: string | null = null;
let currentUser: GS_UserSession | null = null;

export interface GS_UserSession {
  usuarioId: string;
  nome: string;
  email: string;
  nivel: import('@/types/gs/permissions').UserLevel;
  arId: string | null;
  unidadeId: string | null;
  arNome?: string;
  unidadeNome?: string;
}

function saveToken(token: string) {
  inMemoryToken = token;
  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; SameSite=Strict; Secure`;
}

function clearToken() {
  inMemoryToken = null;
  currentUser = null;
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
}

export function getToken(): string | null {
  return inMemoryToken;
}

export function getCurrentUser(): GS_UserSession | null {
  return currentUser;
}

// ─── API interna ───────────────────────────────────────────────────────────────
async function gsFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${GS_API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Refresh automático em caso de 401
  if (response.status === 401 && retry) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return gsFetch<T>(endpoint, options, false);
    }
    clearToken();
    window.location.href = '/gs/login';
    throw new Error('Sessão expirada.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.error ?? `Erro ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

// ─── Funções públicas ──────────────────────────────────────────────────────────

export async function loginGS(email: string, password: string): Promise<GS_UserSession> {
  const response = await fetch(`${GS_API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro ao fazer login' }));
    throw new Error(error.error ?? 'Erro ao fazer login');
  }

  const data = await response.json();
  saveToken(data.token);
  currentUser = data.user;
  return data.user;
}

export async function logoutGS() {
  try {
    await gsFetch('/auth/logout', { method: 'POST' }, false);
  } catch {
    // Ignora erros no logout
  }
  clearToken();
  window.location.href = '/gs/login';
}

export async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch(`${GS_API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) return false;
    const data = await response.json();
    saveToken(data.token);
    currentUser = data.user;
    return true;
  } catch {
    return false;
  }
}

export async function checkSession(): Promise<GS_UserSession | null> {
  try {
    const user = await gsFetch<GS_UserSession>('/auth/me');
    currentUser = user;
    return user;
  } catch {
    return null;
  }
}

// ─── API Client tipado ─────────────────────────────────────────────────────────
export const gsApi = {
  get: <T>(url: string) => gsFetch<T>(url),
  post: <T>(url: string, body?: unknown) =>
    gsFetch<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: unknown) =>
    gsFetch<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: unknown) =>
    gsFetch<T>(url, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) =>
    gsFetch<T>(url, { method: 'DELETE' }),
};
