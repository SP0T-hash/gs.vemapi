import { NextRequest, NextResponse } from 'next/server';
import { sendTemplateEmail, emailTemplates } from '@/lib/gs/email';

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  if (!body.email || typeof body.email !== 'string') {
    return NextResponse.json({ error: 'Campo obrigatório: email' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email.trim())) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  }

  try {
    const result = await sendTemplateEmail(
      emailTemplates.testEmail,
      {},
      body.email.trim()
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Falha ao enviar e-mail de teste. Verifique as configurações de e-mail.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { error: 'Erro interno ao enviar e-mail de teste.' },
      { status: 500 }
    );
  }
}
