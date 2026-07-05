import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type AuditEvent =
  | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED'
  | 'DATA_ACCESSED' | 'DATA_EXPORTED' | 'DATA_DELETED'
  | 'FILE_UPLOADED' | 'FILE_DOWNLOADED' | 'FILE_DELETED'
  | 'PAYMENT_RECEIVED' | 'PAYMENT_REFUNDED'
  | 'CERT_ISSUED' | 'CERT_REVOKED'
  | 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED'
  | 'PERMISSION_CHANGED'
  | 'SUBSCRIPTION_CHANGED'
  | 'INTEGRATION_CONFIGURED'
  | 'CONTRACT_ACCEPTED'
  | 'API_CALL';

export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuditEntry {
  event: AuditEvent;
  severity: AuditSeverity;
  userId?: string;
  userName?: string;
  userLevel?: string;
  arId?: string;
  targetId?: string;
  targetType?: string;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  hash?: string;
}

function getPrevHashEntry(): { hash: string } | null {
  try {
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(process.cwd(), 'logs', 'audit');
    const chainFile = path.join(logDir, 'chain.dat');
    if (fs.existsSync(chainFile)) {
      const content = fs.readFileSync(chainFile, 'utf8').trim();
      if (content) {
        const lines = content.split('\n');
        const lastLine = lines[lines.length - 1];
        if (lastLine) {
          const parts = lastLine.split('|');
          return { hash: parts[0] };
        }
      }
    }
  } catch {
  }
  return null;
}

function appendToChainFile(hash: string, entry: AuditEntry): void {
  try {
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(process.cwd(), 'logs', 'audit');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const chainFile = path.join(logDir, 'chain.dat');
    const logFile = path.join(logDir, `${new Date().toISOString().split('T')[0]}.log`);
    const line = `${hash}|${entry.event}|${entry.severity}|${entry.userId || ''}|${entry.timestamp}`;
    fs.appendFileSync(chainFile, line + '\n');
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  } catch {
  }
}

export function hashAuditEntry(entry: Omit<AuditEntry, 'hash'>, prevHash: string): string {
  const data = JSON.stringify({ ...entry, hash: undefined });
  return createHash('sha256').update(prevHash + data).digest('hex');
}

export async function logAudit(
  entry: Omit<AuditEntry, 'timestamp' | 'hash'>
): Promise<void> {
  const timestamp = new Date().toISOString();
  const prevHashEntry = getPrevHashEntry();
  const prevHash = prevHashEntry?.hash || createHash('sha256').update('GENESIS_BLOCK').digest('hex');

  const fullEntry: AuditEntry = {
    ...entry,
    timestamp,
    hash: undefined,
  };

  const hash = hashAuditEntry(fullEntry, prevHash);
  fullEntry.hash = hash;

  try {
    await supabase.from('gs_audit_logs').insert({
      event: entry.event,
      severity: entry.severity,
      user_id: entry.userId || null,
      user_name: entry.userName || null,
      user_level: entry.userLevel || null,
      ar_id: entry.arId || null,
      target_id: entry.targetId || null,
      target_type: entry.targetType || null,
      description: entry.description,
      metadata: entry.metadata || null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
      timestamp,
      hash,
      prev_hash: prevHash,
    });
  } catch (error) {
    console.error('[Audit] Failed to write to database:', error);
  }

  appendToChainFile(hash, fullEntry);
}

export async function getAuditLogs(filters?: {
  event?: AuditEvent;
  severity?: AuditSeverity;
  userId?: string;
  arId?: string;
  targetId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<{ entries: AuditEntry[]; total: number; page: number }> {
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('gs_audit_logs')
    .select('*', { count: 'exact' });

  if (filters?.event) query = query.eq('event', filters.event);
  if (filters?.severity) query = query.eq('severity', filters.severity);
  if (filters?.userId) query = query.eq('user_id', filters.userId);
  if (filters?.arId) query = query.eq('ar_id', filters.arId);
  if (filters?.targetId) query = query.eq('target_id', filters.targetId);
  if (filters?.dateFrom) query = query.gte('timestamp', filters.dateFrom);
  if (filters?.dateTo) query = query.lte('timestamp', filters.dateTo);

  query = query
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch audit logs: ${error.message}`);

  const entries: AuditEntry[] = (data || []).map((row: any) => ({
    event: row.event,
    severity: row.severity,
    userId: row.user_id,
    userName: row.user_name,
    userLevel: row.user_level,
    arId: row.ar_id,
    targetId: row.target_id,
    targetType: row.target_type,
    description: row.description,
    metadata: row.metadata,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    timestamp: row.timestamp,
    hash: row.hash,
  }));

  return {
    entries,
    total: count || 0,
    page,
  };
}

export async function verifyAuditChain(): Promise<{
  valid: boolean;
  entriesChecked: number;
  firstInvalidHash?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('gs_audit_logs')
      .select('*')
      .order('timestamp', { ascending: true });

    if (error) throw new Error(`Failed to fetch audit chain: ${error.message}`);

    if (!data || data.length === 0) {
      return { valid: true, entriesChecked: 0 };
    }

    let prevHash = createHash('sha256').update('GENESIS_BLOCK').digest('hex');

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const entry: AuditEntry = {
        event: row.event,
        severity: row.severity,
        userId: row.user_id,
        userName: row.user_name,
        userLevel: row.user_level,
        arId: row.ar_id,
        targetId: row.target_id,
        targetType: row.target_type,
        description: row.description,
        metadata: row.metadata,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.timestamp,
        hash: undefined,
      };

      const expectedHash = hashAuditEntry(entry, prevHash);

      if (expectedHash !== row.hash) {
        return {
          valid: false,
          entriesChecked: i + 1,
          firstInvalidHash: row.hash,
          error: `Hash mismatch at entry ${i + 1} (id: ${row.id}). Expected: ${expectedHash}, found: ${row.hash}`,
        };
      }

      prevHash = row.hash;
    }

    return {
      valid: true,
      entriesChecked: data.length,
    };
  } catch (error) {
    return {
      valid: false,
      entriesChecked: 0,
      error: error instanceof Error ? error.message : 'Unknown error during chain verification',
    };
  }
}
