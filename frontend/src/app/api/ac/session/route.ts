/**
 * GET /api/ac/session
 *
 * Retorna os dados da sessão atual do AGR autenticado.
 * Protegida por withAuth() — requer Bearer token no header.
 *
 * Uso:
 *   curl http://localhost:3000/api/ac/session \
 *     -H "Authorization: Bearer <session_token>"
 *
 * Exemplo de resposta:
 * {
 *   "authenticated": true,
 *   "session": {
 *     "sessionToken": "...",
 *     "agrId": "uuid",
 *     "certSerial": "...",
 *     "expiresAt": "2026-07-04T..."
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/ac-angry';

export const GET = withAuth(async (req, { session }) => {
  return NextResponse.json({
    authenticated: true,
    session: {
      sessionToken: session.sessionToken,
      agrId: session.agrId,
      certSerial: session.certSerial,
      expiresAt: session.expiresAt.toISOString(),
    },
  });
});
