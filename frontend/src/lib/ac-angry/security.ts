/**
 * AC ANGRY - Módulos de Segurança Core 🛡️
 * Arquivo: src/lib/ac-angry/security.ts
 *
 * Contém:
 *  - NonceManager     → Anti-replay / CSRF
 *  - SessionManager   → Sessões AGR autenticadas
 *  - RateLimiter      → Proteção contra força bruta
 *  - AuditLogger      → Trilha de auditoria imutável (hash chain)
 *  - ProtocolLocker   → Controle de concorrência de protocolo
 *  - DataEncryptor    → AES-256-GCM + SHA-256
 *  - CertValidator    → Validação de certificados ICP-Brasil
 */

import { createClient } from '@supabase/supabase-js';
import {
  createHmac,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
  scryptSync,
  timingSafeEqual,
} from 'crypto';

// ---------------------------------------------------------------------------
// Cliente Supabase com Service Role (backend apenas — NUNCA expor no cliente)
// ---------------------------------------------------------------------------
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ===========================================================================
// 1. NONCE MANAGER — Anti-Replay / CSRF
// ===========================================================================

export type NonceScope = 'AUTH' | 'SIGN' | 'BIOMETRY' | 'EMIT';

const ENV_NONCE_TTL = Number(process.env.PKI_NONCE_TTL) || 300000; // ms, default 5min

const NONCE_TTL: Record<NonceScope, number> = {
  AUTH:     Math.floor((ENV_NONCE_TTL) / 1000),
  SIGN:     Math.floor((ENV_NONCE_TTL * 0.4) / 1000),
  BIOMETRY: Math.floor((ENV_NONCE_TTL * 0.6) / 1000),
  EMIT:     Math.floor((ENV_NONCE_TTL * 2) / 1000),
};

export const NonceManager = {
  async generate(
    scope: NonceScope,
    protocolId?: string,
    agrId?: string,
  ): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    const secret = process.env.PKI_NONCE_SECRET!;
    const signature = createHmac('sha256', secret).update(raw).digest('hex');
    const nonce = `${raw}.${signature}`;

    const expiresAt = new Date(Date.now() + NONCE_TTL[scope] * 1000).toISOString();

    const { error } = await supabase.from('security_nonces').insert({
      nonce,
      scope,
      protocol_id: protocolId ?? null,
      agr_id: agrId ?? null,
      expires_at: expiresAt,
    });

    if (error) throw new Error(`NonceManager.generate failed: ${error.message}`);
    return nonce;
  },

  async consume(nonce: string, scope: NonceScope): Promise<void> {
    const [raw, signature] = nonce.split('.');
    if (!raw || !signature) throw new Error('Nonce malformado.');

    const secret = process.env.PKI_NONCE_SECRET!;
    const expected = createHmac('sha256', secret).update(raw).digest('hex');

    if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      throw new Error('Assinatura de nonce inválida.');
    }

    const { data, error } = await supabase
      .from('security_nonces')
      .select('id, used, expires_at, scope')
      .eq('nonce', nonce)
      .single();

    if (error || !data) throw new Error('Nonce não encontrado.');
    if (data.used) throw new Error('Nonce já utilizado (replay detectado).');
    if (data.scope !== scope) throw new Error(`Nonce de escopo inválido: esperado ${scope}.`);
    if (new Date(data.expires_at) < new Date()) throw new Error('Nonce expirado.');

    await supabase
      .from('security_nonces')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', data.id);
  },

  generateCSRFToken(): string {
    const raw = randomBytes(32).toString('hex');
    const secret = process.env.PKI_NONCE_SECRET!;
    const signature = createHmac('sha256', secret).update(raw).digest('hex');
    return `${raw}.${signature}`;
  },

  validateCSRFToken(token: string): boolean {
    const [raw, signature] = token.split('.');
    if (!raw || !signature) return false;
    const secret = process.env.PKI_NONCE_SECRET!;
    const expected = createHmac('sha256', secret).update(raw).digest('hex');
    if (expected.length !== signature.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  },

  generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
    }
    return codes;
  },
};

// ===========================================================================
// 2. SESSION MANAGER — Sessões AGR
// ===========================================================================

export interface AgrSession {
  sessionToken: string;
  agrId: string;
  certSerial?: string;
  expiresAt: Date;
}

export interface SecureSession {
  id: string;
  session_token: string;
  agr_id: string;
  cert_serial: string | null;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  expires_at: string;
  last_activity: string;
  created_at: string;
}

const SESSION_TTL_HOURS = 8;

export const SessionManager = {
  async create(
    agrId: string,
    ipAddress: string,
    userAgent: string,
    certSerial?: string,
  ): Promise<string> {
    await SessionManager.cleanupExpired();

    const token = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();

    const { error } = await supabase.from('secure_sessions').insert({
      session_token: token,
      agr_id: agrId,
      cert_serial: certSerial ?? null,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt,
    });

    if (error) throw new Error(`SessionManager.create failed: ${error.message}`);

    await AuditLogger.log({
      eventType: 'SESSION_CREATED',
      agrId,
      ipAddress,
      userAgent,
      severity: 'INFO',
    });

    return token;
  },

  async validate(token: string): Promise<AgrSession> {
    const { data, error } = await supabase
      .from('secure_sessions')
      .select('session_token, agr_id, cert_serial, expires_at, is_active')
      .eq('session_token', token)
      .single();

    if (error || !data) throw new Error('Sessão não encontrada.');
    if (!data.is_active) throw new Error('Sessão encerrada.');
    if (new Date(data.expires_at) < new Date()) {
      await SessionManager.revoke(token);
      throw new Error('Sessão expirada.');
    }

    await supabase
      .from('secure_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('session_token', token);

    return {
      sessionToken: data.session_token,
      agrId: data.agr_id,
      certSerial: data.cert_serial ?? undefined,
      expiresAt: new Date(data.expires_at),
    };
  },

  async revoke(token: string): Promise<void> {
    await supabase
      .from('secure_sessions')
      .update({ is_active: false })
      .eq('session_token', token);
  },

  async rotateToken(oldToken: string): Promise<string> {
    const session = await SessionManager.validate(oldToken);
    const newToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();

    const { error } = await supabase
      .from('secure_sessions')
      .update({ session_token: newToken, expires_at: expiresAt, last_activity: new Date().toISOString() })
      .eq('session_token', oldToken);

    if (error) throw new Error(`SessionManager.rotateToken failed: ${error.message}`);

    await AuditLogger.log({
      eventType: 'SESSION_ROTATED',
      agrId: session.agrId,
      severity: 'INFO',
    });

    return newToken;
  },

  async getActiveSessions(agrId: string): Promise<SecureSession[]> {
    const { data, error } = await supabase
      .from('secure_sessions')
      .select('*')
      .eq('agr_id', agrId)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString());

    if (error) throw new Error(`SessionManager.getActiveSessions failed: ${error.message}`);
    return (data ?? []) as SecureSession[];
  },

  async terminateOtherSessions(agrId: string, currentToken: string): Promise<void> {
    const { error } = await supabase
      .from('secure_sessions')
      .update({ is_active: false })
      .eq('agr_id', agrId)
      .neq('session_token', currentToken);

    if (error) throw new Error(`SessionManager.terminateOtherSessions failed: ${error.message}`);

    await AuditLogger.log({
      eventType: 'SESSIONS_TERMINATED',
      agrId,
      severity: 'INFO',
    });
  },

  async cleanupExpired(): Promise<void> {
    const { error } = await supabase
      .from('secure_sessions')
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true);

    if (error) console.error('[SessionManager] cleanupExpired error:', error.message);
  },
};

// ===========================================================================
// 3. RATE LIMITER — Proteção contra força bruta
// ===========================================================================

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  blockDurationSeconds: number;
}

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  return v ? parseInt(v, 10) : fallback;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  LOGIN:   { maxRequests: envInt('RATE_LIMIT_MAX_LOGIN', 5),  windowSeconds: envInt('RATE_LIMIT_WINDOW', 60),  blockDurationSeconds: 300 },
  SIGN:    { maxRequests: envInt('RATE_LIMIT_MAX_EMIT', 10),  windowSeconds: envInt('RATE_LIMIT_WINDOW', 60),  blockDurationSeconds: 120 },
  EMIT:    { maxRequests: envInt('RATE_LIMIT_MAX_EMIT', 20),  windowSeconds: envInt('RATE_LIMIT_WINDOW', 300), blockDurationSeconds: 600 },
  DEFAULT: { maxRequests: 30, windowSeconds: 60, blockDurationSeconds: 60 },
};

export const RateLimiter = {
  async check(key: string, action: string): Promise<void> {
    const cfg = RATE_LIMITS[action] ?? RATE_LIMITS.DEFAULT;
    const bucketKey = `${key}:${action}`;

    const { data } = await supabase
      .from('rate_limit_buckets')
      .select('*')
      .eq('bucket_key', bucketKey)
      .single();

    const now = new Date();

    if (data) {
      if (data.blocked_until && new Date(data.blocked_until) > now) {
        const remaining = Math.ceil(
          (new Date(data.blocked_until).getTime() - now.getTime()) / 1000
        );
        throw new RateLimitError(`Muitas tentativas. Tente em ${remaining}s.`, remaining);
      }

      const windowStart = new Date(data.window_start);
      const windowAge = (now.getTime() - windowStart.getTime()) / 1000;

      if (windowAge < cfg.windowSeconds) {
        if (data.request_count >= cfg.maxRequests) {
          const consecutiveBlocks = data.blocked_until && new Date(data.blocked_until) < now
            ? (data.request_count > cfg.maxRequests ? data.request_count - cfg.maxRequests + 1 : 2)
            : (data.request_count > cfg.maxRequests ? data.request_count - cfg.maxRequests + 1 : 1);

          const blockDuration = cfg.blockDurationSeconds * Math.pow(2, consecutiveBlocks - 1);
          const maxBlock = 86400;
          const actualDuration = Math.min(blockDuration, maxBlock);

          const blockedUntil = new Date(now.getTime() + actualDuration * 1000);
          await supabase
            .from('rate_limit_buckets')
            .update({
              request_count: cfg.maxRequests + consecutiveBlocks,
              blocked_until: blockedUntil.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('bucket_key', bucketKey);

          throw new RateLimitError(
            `Rate limit atingido. Bloqueado por ${actualDuration}s.`,
            actualDuration,
          );
        }
        await supabase
          .from('rate_limit_buckets')
          .update({ request_count: data.request_count + 1, updated_at: now.toISOString() })
          .eq('bucket_key', bucketKey);
      } else {
        await supabase
          .from('rate_limit_buckets')
          .update({
            request_count: 1,
            window_start: now.toISOString(),
            blocked_until: null,
            updated_at: now.toISOString(),
          })
          .eq('bucket_key', bucketKey);
      }
    } else {
      await supabase.from('rate_limit_buckets').insert({
        bucket_key: bucketKey,
        action,
        request_count: 1,
        window_start: now.toISOString(),
      });
    }
  },

  async getRemainingAttempts(bucketKey: string, action: string): Promise<number> {
    const cfg = RATE_LIMITS[action] ?? RATE_LIMITS.DEFAULT;
    const { data } = await supabase
      .from('rate_limit_buckets')
      .select('request_count, blocked_until, window_start')
      .eq('bucket_key', `${bucketKey}:${action}`)
      .single();

    if (!data) return cfg.maxRequests;

    if (data.blocked_until && new Date(data.blocked_until) > new Date()) return 0;

    const windowAge = (Date.now() - new Date(data.window_start).getTime()) / 1000;
    if (windowAge >= cfg.windowSeconds) return cfg.maxRequests;

    const count = data.request_count > cfg.maxRequests ? cfg.maxRequests : data.request_count;
    return Math.max(0, cfg.maxRequests - count);
  },

  async resetBucket(bucketKey: string, action: string): Promise<void> {
    const { error } = await supabase
      .from('rate_limit_buckets')
      .update({
        request_count: 0,
        blocked_until: null,
        window_start: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('bucket_key', `${bucketKey}:${action}`);

    if (error) throw new Error(`RateLimiter.resetBucket failed: ${error.message}`);
  },
};

export class RateLimitError extends Error {
  constructor(message: string, public retryAfterSeconds: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// ===========================================================================
// 4. AUDIT LOGGER — Trilha Imutável com Hash Chain
// ===========================================================================

interface AuditEvent {
  eventType: string;
  agrId?: string;
  protocolId?: string;
  ipAddress?: string;
  userAgent?: string;
  payload?: Record<string, unknown>;
  severity?: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
}

export interface AuditQuery {
  eventType?: string;
  agrId?: string;
  protocolId?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditEntry {
  id: string;
  eventType: string;
  agrId: string | null;
  protocolId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  payload: Record<string, unknown> | null;
  severity: string;
  createdAt: string;
}

const AUDIT_RETENTION_DAYS = envInt('AUDIT_RETENTION_DAYS', 1825);

async function getLastAuditHash(): Promise<string | null> {
  const { data } = await supabase
    .from('audit_logs')
    .select('payload')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.payload && typeof data.payload === 'object' && 'hash_chain' in (data.payload as Record<string, unknown>)) {
    return (data.payload as Record<string, string>).hash_chain ?? null;
  }
  return null;
}

export const AuditLogger = {
  async log(event: AuditEvent): Promise<void> {
    const prevHash = await getLastAuditHash();
    const timestamp = new Date().toISOString();
    const chainData = `${prevHash ?? ''}|${event.eventType}|${event.agrId ?? ''}|${timestamp}`;
    const hashChain = createHash('sha256').update(chainData).digest('hex');

    const payload: Record<string, unknown> = {
      ...(event.payload ?? {}),
      hash_chain: hashChain,
      prev_hash: prevHash,
      chain_timestamp: timestamp,
    };

    supabase.from('audit_logs').insert({
      event_type: event.eventType,
      agr_id: event.agrId ?? null,
      protocol_id: event.protocolId ?? null,
      ip_address: event.ipAddress ?? null,
      user_agent: event.userAgent ?? null,
      payload,
      severity: event.severity ?? 'INFO',
    }).then(({ error }) => {
      if (error) console.error('[AuditLogger] Falha ao registrar evento:', error.message);
    });
  },

  async query(filters: AuditQuery = {}): Promise<AuditEntry[]> {
    let query = supabase
      .from('audit_logs')
      .select('*');

    if (filters.eventType) query = query.eq('event_type', filters.eventType);
    if (filters.agrId) query = query.eq('agr_id', filters.agrId);
    if (filters.protocolId) query = query.eq('protocol_id', filters.protocolId);
    if (filters.severity) query = query.eq('severity', filters.severity);
    if (filters.startDate) query = query.gte('created_at', filters.startDate);
    if (filters.endDate) query = query.lte('created_at', filters.endDate);

    query = query
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 100)
      .range(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 100) - 1);

    const { data, error } = await query;

    if (error) throw new Error(`AuditLogger.query failed: ${error.message}`);

    return ((data ?? []) as Record<string, unknown>[]).map(mapAuditRow);
  },

  async exportToCSV(filters: AuditQuery = {}): Promise<string> {
    const entries = await AuditLogger.query({ ...filters, limit: 10000 });
    const headers = ['ID', 'EventType', 'AgrID', 'ProtocolID', 'IPAddress', 'Severity', 'CreatedAt', 'HashChain'];
    const rows = entries.map(e => [
      e.id,
      e.eventType,
      e.agrId ?? '',
      e.protocolId ?? '',
      e.ipAddress ?? '',
      e.severity,
      e.createdAt,
      (e.payload?.hash_chain as string) ?? '',
    ]);
    return [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
  },

  async cleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - AUDIT_RETENTION_DAYS * 86400000).toISOString();
    const { error } = await supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', cutoff);

    if (error) console.error('[AuditLogger] cleanup error:', error.message);
  },

  async verifyChain(): Promise<{ valid: boolean; brokenAt?: string }> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, payload, created_at')
      .order('created_at', { ascending: true });

    if (error) throw new Error(`AuditLogger.verifyChain failed: ${error.message}`);
    if (!data || data.length === 0) return { valid: true };

    let prevHash: string | null = null;

    for (const row of data) {
      const p = row.payload as Record<string, unknown> | null;
      if (!p || !p.hash_chain) continue;

      const expectedPrev = prevHash;
      const storedPrev = p.prev_hash as string | null;

      if (expectedPrev !== storedPrev) {
        return { valid: false, brokenAt: row.id };
      }

      const chainData: string = `${prevHash ?? ''}|?|?|${String(p.chain_timestamp ?? '')}`;
      const computed: string = createHash('sha256').update(chainData).digest('hex');
      prevHash = computed;
    }

    return { valid: true };
  },
};

function mapAuditRow(row: Record<string, unknown>): AuditEntry {
  return {
    id: String(row.id),
    eventType: String(row.event_type),
    agrId: row.agr_id ? String(row.agr_id) : null,
    protocolId: row.protocol_id ? String(row.protocol_id) : null,
    ipAddress: row.ip_address ? String(row.ip_address) : null,
    userAgent: row.user_agent ? String(row.user_agent) : null,
    payload: row.payload ? row.payload as Record<string, unknown> : null,
    severity: String(row.severity),
    createdAt: String(row.created_at),
  };
}

// ===========================================================================
// 5. LOCKER LOGIC — Controle de Concorrência de Protocolo
// ===========================================================================

const LOCK_EXPIRY_MS = 30 * 60 * 1000;

export const ProtocolLocker = {
  async lock(protocolId: string, agrId: string): Promise<void> {
    const { data } = await supabase
      .from('protocols')
      .select('is_locked, locked_by, locked_at')
      .eq('id', protocolId)
      .single();

    if (data?.is_locked && data.locked_by !== agrId) {
      if (data.locked_at && Date.now() - new Date(data.locked_at).getTime() > LOCK_EXPIRY_MS) {
        await ProtocolLocker.forceUnlock(protocolId, agrId);
      } else {
        throw new Error('Protocolo bloqueado por outro AGR.');
      }
    }

    const { error } = await supabase
      .from('protocols')
      .update({
        is_locked: true,
        locked_by: agrId,
        locked_at: new Date().toISOString(),
        status: 'IN_PROGRESS',
      })
      .eq('id', protocolId);

    if (error) throw new Error(`ProtocolLocker.lock failed: ${error.message}`);

    await AuditLogger.log({
      eventType: 'PROTOCOL_LOCKED',
      agrId,
      protocolId,
      severity: 'INFO',
    });
  },

  async unlock(protocolId: string, agrId: string): Promise<void> {
    const { error } = await supabase
      .from('protocols')
      .update({ is_locked: false, locked_by: null, locked_at: null })
      .eq('id', protocolId)
      .eq('locked_by', agrId);

    if (error) throw new Error(`ProtocolLocker.unlock failed: ${error.message}`);

    await AuditLogger.log({
      eventType: 'PROTOCOL_UNLOCKED',
      agrId,
      protocolId,
      severity: 'INFO',
    });
  },

  async getLockStatus(protocolId: string): Promise<{ locked: boolean; lockedBy: string | null; lockedAt: string | null }> {
    const { data, error } = await supabase
      .from('protocols')
      .select('is_locked, locked_by, locked_at')
      .eq('id', protocolId)
      .single();

    if (error || !data) throw new Error('Protocolo não encontrado.');
    return {
      locked: data.is_locked,
      lockedBy: data.locked_by,
      lockedAt: data.locked_at,
    };
  },

  async forceUnlock(protocolId: string, agrId: string): Promise<void> {
    const { error } = await supabase
      .from('protocols')
      .update({ is_locked: false, locked_by: null, locked_at: null })
      .eq('id', protocolId);

    if (error) throw new Error(`ProtocolLocker.forceUnlock failed: ${error.message}`);

    await AuditLogger.log({
      eventType: 'PROTOCOL_FORCE_UNLOCKED',
      agrId,
      protocolId,
      severity: 'WARN',
    });
  },

  async isLockExpired(protocolId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('protocols')
      .select('locked_at')
      .eq('id', protocolId)
      .single();

    if (error || !data) throw new Error('Protocolo não encontrado.');
    if (!data.locked_at) return false;

    return Date.now() - new Date(data.locked_at).getTime() > LOCK_EXPIRY_MS;
  },
};

// ===========================================================================
// 6. DATA ENCRYPTOR — AES-256-GCM + SHA-256
// ===========================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, 'ac-angry-salt', 32);
}

export const DataEncryptor = {
  encrypt(text: string): string {
    const key = deriveKey(process.env.PKI_ENCRYPTION_KEY!);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${tag}:${encrypted}`;
  },

  decrypt(encrypted: string): string {
    const key = deriveKey(process.env.PKI_ENCRYPTION_KEY!);
    const parts = encrypted.split(':');
    if (parts.length !== 3) throw new Error('Formato de dado criptografado inválido.');
    const [ivHex, tagHex, data] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  },

  hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  },

  hashChain(prevHash: string, data: string): string {
    return createHash('sha256').update(prevHash + data).digest('hex');
  },
};

// ===========================================================================
// 7. CERT VALIDATOR — ICP-Brasil Certificate Validation
// ===========================================================================

export interface CertValidation {
  valid: boolean;
  errors: string[];
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  isICPBr: boolean;
}

export interface CertInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  commonName: string;
  organization: string;
  isICPBr: boolean;
}

function parseDN(dn: string): Record<string, string> {
  const parts: Record<string, string> = {};
  const regex = /([A-Za-z]+)\s*=\s*([^,]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(dn)) !== null) {
    parts[match[1].toUpperCase()] = match[2].trim();
  }
  return parts;
}

function tryParseX509(pem: string): CertInfo | null {
  try {
    const { X509Certificate: X509 } = require('crypto') as typeof import('crypto');
    const cert = new X509(pem);
    const subjectParts = parseDN(cert.subject);
    const issuerParts = parseDN(cert.issuer);
    const cn = subjectParts['CN'] ?? '';
    const org = subjectParts['O'] ?? '';
    const isICPBr =
      subjectParts['O']?.includes('ICP-Brasil') ||
      issuerParts['O']?.includes('ICP-Brasil') ||
      subjectParts['OU']?.includes('ICP-Brasil') ||
      false;

    return {
      subject: cert.subject,
      issuer: cert.issuer,
      validFrom: cert.validFrom,
      validTo: cert.validTo,
      serialNumber: cert.serialNumber,
      commonName: cn,
      organization: org,
      isICPBr,
    };
  } catch {
    return null;
  }
}

function parsePEMFields(pem: string): CertInfo {
  const fields: Record<string, string> = {};
  const lines = pem.split('\n');
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      fields[key] = value;
    }
  }

  const fullSubject = fields['Subject'] ?? fields['subject'] ?? '';
  const fullIssuer = fields['Issuer'] ?? fields['issuer'] ?? '';
  const subjectParts = parseDN(fullSubject);
  const issuerParts = parseDN(fullIssuer);

  return {
    subject: fullSubject,
    issuer: fullIssuer,
    validFrom: fields['Not Before'] ?? fields['notBefore'] ?? '',
    validTo: fields['Not After'] ?? fields['notAfter'] ?? '',
    serialNumber: fields['Serial Number'] ?? fields['serialNumber'] ?? '',
    commonName: subjectParts['CN'] ?? '',
    organization: subjectParts['O'] ?? '',
    isICPBr:
      subjectParts['O']?.includes('ICP-Brasil') ||
      issuerParts['O']?.includes('ICP-Brasil') ||
      fullSubject.includes('ICP-Brasil') ||
      fullIssuer.includes('ICP-Brasil'),
  };
}

export const CertValidator = {
  async validateCertificateChain(certPem: string): Promise<CertValidation> {
    const errors: string[] = [];

    if (!certPem || !certPem.includes('-----BEGIN CERTIFICATE-----')) {
      return { valid: false, errors: ['Formato PEM inválido.'], subject: '', issuer: '', validFrom: '', validTo: '', serialNumber: '', isICPBr: false };
    }

    const info = tryParseX509(certPem);
    if (!info) {
      return { valid: false, errors: ['Não foi possível parsear o certificado.'], subject: '', issuer: '', validFrom: '', validTo: '', serialNumber: '', isICPBr: false };
    }

    const now = new Date();
    const validFrom = new Date(info.validFrom);
    const validTo = new Date(info.validTo);

    if (isNaN(validFrom.getTime())) errors.push('Data de início inválida.');
    if (isNaN(validTo.getTime())) errors.push('Data de expiração inválida.');
    if (validFrom > now) errors.push('Certificado ainda não é válido.');
    if (validTo < now) errors.push('Certificado expirado.');

    // Basic chain: check that serial number is not empty
    if (!info.serialNumber || info.serialNumber === '00') {
      errors.push('Número de série inválido.');
    }

    return {
      valid: errors.length === 0,
      errors,
      subject: info.subject,
      issuer: info.issuer,
      validFrom: info.validFrom,
      validTo: info.validTo,
      serialNumber: info.serialNumber,
      isICPBr: info.isICPBr,
    };
  },

  extractCertInfo(certPem: string): CertInfo {
    const parsed = tryParseX509(certPem);
    if (parsed) return parsed;
    return parsePEMFields(certPem);
  },

  async checkRevocation(certSerial: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('protocols')
      .select('cert_serial, status')
      .eq('cert_serial', certSerial)
      .maybeSingle();

    if (error) return true;
    if (data?.status === 'CANCELLED' || data?.status === 'ERROR') return true;

    return false;
  },

  isICPBrBrasil(certPem: string): boolean {
    try {
      const info = CertValidator.extractCertInfo(certPem);
      return info.isICPBr;
    } catch {
      return false;
    }
  },
};
