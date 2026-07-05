/**
 * POST /api/ac/nonce
 *
 * Gera um nonce criptográfico one-time para ações sensíveis.
 * Protegida por withAuth() — requer Bearer token no header.
 *
 * Escopos disponíveis:
 *   - AUTH:     autenticação (5min TTL)
 *   - SIGN:     assinatura digital (2min TTL)
 *   - BIOMETRY: captura biométrica (3min TTL)
 *   - EMIT:     emissão de certificado (10min TTL)
 *
 * Uso:
 *   curl -X POST http://localhost:3000/api/ac/nonce \
 *     -H "Authorization: Bearer <session_token>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"scope": "EMIT", "protocolId": "uuid-do-protocolo"}'
 *
 * Exemplo de resposta:
 * { "nonce": "abc123...def.sig", "expiresIn": 600 }
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, NonceManager, AuditLogger } from '@/lib/ac-angry';

// Escopos válidos e seus TTLs em segundos (para informação do cliente)
const SCOPE_TTL: Record<string, number> = {
  AUTH:     300,
  SIGN:     120,
  BIOMETRY: 180,
  EMIT:     600,
};

export const POST = withAuth(async (req, { session, ip }) => {
  let body: { scope?: string; protocolId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const scope = body.scope?.toUpperCase();

  if (!scope || !['AUTH', 'SIGN', 'BIOMETRY', 'EMIT'].includes(scope)) {
    return NextResponse.json(
      { error: 'Escopo inválido. Use: AUTH, SIGN, BIOMETRY ou EMIT.' },
      { status: 400 },
    );
  }

  const protocolId = body.protocolId;
  const nonce = await NonceManager.generate(
    scope as 'AUTH' | 'SIGN' | 'BIOMETRY' | 'EMIT',
    protocolId,
    session.agrId,
  );

  await AuditLogger.log({
    eventType: 'NONCE_GENERATED',
    agrId: session.agrId,
    protocolId,
    ipAddress: ip,
    payload: { scope },
    severity: 'INFO',
  });

  return NextResponse.json({
    nonce,
    scope,
    expiresIn: SCOPE_TTL[scope] ?? 300,
  });
});
