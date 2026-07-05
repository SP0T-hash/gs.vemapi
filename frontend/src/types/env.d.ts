/**
 * Declaração de tipos para variáveis de ambiente personalizadas.
 *
 * O Next.js já tipa as variáveis NEXT_PUBLIC_* automaticamente via
 * `process.env` com tipo `string | undefined`.
 *
 * Este arquivo adiciona tipos específicos para variáveis internas
 * (sem NEXT_PUBLIC_) usadas em API Routes (server-side).
 */
declare namespace NodeJS {
  interface ProcessEnv {
    // ─── Backend API ─────────────────────────────────────────────
    NEXT_PUBLIC_API_URL: string;

    // ─── Supabase ────────────────────────────────────────────────
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;

    // ─── PKI / Segurança ─────────────────────────────────────────
    PKI_NONCE_SECRET: string;
    AUTH_JWT_SECRET: string;

    // ─── GS Encryption ───────────────────────────────────────────
    GS_ENCRYPTION_KEY?: string;
    GS_ENCRYPTION_ALGORITHM?: string;

    // ─── GS Security Middleware ───────────────────────────────────
    GS_CORS_ORIGIN?: string;
    GS_RATE_LIMIT_WINDOW?: string;
    GS_RATE_LIMIT_MAX?: string;

    // ─── Storage (S3/R2) ─────────────────────────────────────────
    STORAGE_PROVIDER?: string;
    STORAGE_ENDPOINT?: string;
    STORAGE_REGION?: string;
    STORAGE_ACCESS_KEY_ID?: string;
    STORAGE_SECRET_ACCESS_KEY?: string;
    STORAGE_BUCKET?: string;
    STORAGE_PUBLIC_URL?: string;
    ENCRYPT_UPLOADS?: string;
  }
}
