/**
 * AC ANGRY — Módulos de Segurança 🛡️
 *
 * Barrel export para importação simplificada:
 *
 *   import { NonceManager, SessionManager, RateLimiter, AuditLogger, ProtocolLocker } from '@/lib/ac-angry';
 *   import { withAuth, getClientIp } from '@/lib/ac-angry';
 */

export {
  NonceManager,
  SessionManager,
  RateLimiter,
  RateLimitError,
  AuditLogger,
  ProtocolLocker,
} from './security';

export type {
  NonceScope,
  AgrSession,
} from './security';

export {
  withAuth,
  getClientIp,
} from './api-middleware';

export type {
  AuthContext,
} from './api-middleware';
