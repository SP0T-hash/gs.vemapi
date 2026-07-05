/**
 * POST /api/ac/logout
 *
 * Encerra a sessão do AGR autenticado.
 * Protegida por withAuth() — requer Bearer token no header.
 *
 * Uso:
 *   curl -X POST http://localhost:3000/api/ac/logout \
 *     -H "Authorization: Bearer <session_token>"
 *
 * Exemplo de resposta:
 * { "success": true, "message": "Sessão encerrada com sucesso." }
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, SessionManager, AuditLogger } from '@/lib/ac-angry';

export const POST = withAuth(async (req, { session, ip }) => {
  await SessionManager.revoke(session.sessionToken);

  await AuditLogger.log({
    eventType: 'LOGOUT',
    agrId: session.agrId,
    ipAddress: ip,
    severity: 'INFO',
  });

  const response = NextResponse.json({
    success: true,
    message: 'Sessão encerrada com sucesso.',
  });

  // Limpa o cookie de sessão
  response.cookies.set('session_token', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return response;
});
