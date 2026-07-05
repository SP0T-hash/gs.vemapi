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
  }
}
