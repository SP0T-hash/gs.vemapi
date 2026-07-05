/**
 * GS Auth — Autenticação segura do sistema GS
 *
 * - Login com email + senha (bcrypt)
 * - Sessão via JWT + cookie httpOnly
 * - Refresh token automático
 * - Rate limit por IP
 * - Logs de auditoria
 * - 2FA (TOTP) opcional
 */

import type { TOTPSetup } from './totp';

const GS_API_URL = process.env.NEXT_PUBLIC_GS_API_URL ?? '/api/gs';
const TOKEN_COOKIE = 'gs_token';

// ─── Gerenciamento do token em memória ─────────────────────────────────────────
let inMemoryToken: string | null = null;
let currentUser: GS_UserSession | null = null;

// Store tempToken for 2FA flow
let pendingTempToken: string | null = null;

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
  pendingTempToken = null;
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
}

export function getToken(): string | null {
  return inMemoryToken;
}

export function getCurrentUser(): GS_UserSession | null {
  return currentUser;
}

export function getPendingTempToken(): string | null {
  return pendingTempToken;
}

export function clearPendingTempToken(): void {
  pendingTempToken = null;
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

export async function loginGS(email: string, password: string): Promise<GS_UserSession | { requires2FA: boolean; tempToken: string; user: GS_UserSession }> {
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

  // 2FA required
  if (data.requires2FA) {
    pendingTempToken = data.tempToken;
    return {
      requires2FA: true,
      tempToken: data.tempToken,
      user: data.user,
    };
  }

  saveToken(data.token);
  currentUser = data.user;
  return data.user;
}

export async function verify2FACode(tempToken: string, code: string): Promise<GS_UserSession> {
  const response = await fetch(`${GS_API_URL}/auth/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tempToken, code }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro ao verificar 2FA' }));
    throw new Error(error.error ?? 'Erro ao verificar 2FA');
  }

  const data = await response.json();
  saveToken(data.token);
  currentUser = data.user;
  pendingTempToken = null;
  return data.user;
}

export async function setup2FA(): Promise<{
  secret: string;
  otpauthUrl: string;
  qrCodeSvg: string;
  backupCodes: string[];
}> {
  const response = await fetch(`${GS_API_URL}/auth/2fa/setup`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(inMemoryToken ? { Authorization: `Bearer ${inMemoryToken}` } : {}),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro ao obter setup 2FA' }));
    throw new Error(error.error ?? 'Erro ao obter setup 2FA');
  }

  return response.json();
}

export async function verifyAndEnable2FA(token: string): Promise<{ success: boolean; backupCodes: string[] }> {
  const response = await fetch(`${GS_API_URL}/auth/2fa/setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(inMemoryToken ? { Authorization: `Bearer ${inMemoryToken}` } : {}),
    },
    body: JSON.stringify({ token }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro ao ativar 2FA' }));
    throw new Error(error.error ?? 'Erro ao ativar 2FA');
  }

  return response.json();
}

export async function disable2FA(token: string, password: string): Promise<{ success: boolean }> {
  const response = await fetch(`${GS_API_URL}/auth/2fa/disable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(inMemoryToken ? { Authorization: `Bearer ${inMemoryToken}` } : {}),
    },
    body: JSON.stringify({ token, password }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro ao desativar 2FA' }));
    throw new Error(error.error ?? 'Erro ao desativar 2FA');
  }

  return response.json();
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
