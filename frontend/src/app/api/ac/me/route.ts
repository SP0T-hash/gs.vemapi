/**
 * GET /api/ac/me
 *
 * Retorna os dados do AGR autenticado (perfil completo).
 * Protegida por withAuth() — requer Bearer token no header.
 *
 * Uso:
 *   curl http://localhost:3000/api/ac/me \
 *     -H "Authorization: Bearer <session_token>"
 *
 * Exemplo de resposta:
 * {
 *   "agr": {
 *     "id": "uuid",
 *     "cpf": "11111111111",
 *     "nome": "Carlos Silva",
 *     "email": "carlos@angry.ac.br",
 *     "role": "AGR",
 *     "isActive": true,
 *     "lastLogin": "2026-07-04T..."
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '@/lib/ac-angry';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const GET = withAuth(async (req, { session }) => {
  const { data: agr, error } = await supabase
    .from('agr_users')
    .select('id, cpf, nome, email, role, is_active, last_login, created_at')
    .eq('id', session.agrId)
    .single();

  if (error || !agr) {
    return NextResponse.json({ error: 'AGR não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ agr });
});
