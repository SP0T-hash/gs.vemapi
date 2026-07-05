/**
 * AC ANGRY — Módulos de Segurança 🛡️
 *
 * Barrel export para importação simplificada:
 *
 *   import { NonceManager, SessionManager, RateLimiter, AuditLogger, ProtocolLocker, DataEncryptor, CertValidator } from '@/lib/ac-angry';
 *   import { withAuth, withCertAuth, withNonce, withRateLimit, withSecurityHeaders, getClientIp } from '@/lib/ac-angry';
 *   import { validateCertFile, extractCertFromPFX } from '@/lib/ac-angry';
 */

export {
  NonceManager,
  SessionManager,
  RateLimiter,
  RateLimitError,
  AuditLogger,
  ProtocolLocker,
  DataEncryptor,
  CertValidator,
} from './security';

export type {
  NonceScope,
  AgrSession,
  SecureSession,
  AuditQuery,
  AuditEntry,
  CertValidation,
  CertInfo,
} from './security';

export {
  withAuth,
  withCertAuth,
  withNonce,
  withRateLimit,
  withSecurityHeaders,
  getClientIp,
  getClientCert,
  validateSignature,
  generateSecurityHeaders,
} from './api-middleware';

export type {
  AuthContext,
  AuthOptions,
} from './api-middleware';

export {
  validateCertFile,
  extractCertFromPFX,
  validatePhotoForBiometry,
  encryptCertArtifact,
  decryptCertArtifact,
} from './file-security';

export type {
  CertFileValidation,
  BiometryValidation,
} from './file-security';
