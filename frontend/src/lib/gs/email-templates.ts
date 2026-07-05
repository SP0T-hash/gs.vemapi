export interface EmailTemplate {
  subject: string;
  html: (data: Record<string, any>) => string;
}

const BASE_URL = process.env.GS_APP_URL || 'http://localhost:3000';

function wrapLayout(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GS VEMAPI</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f4f6;min-width:100%;">
<tr>
<td align="center" style="padding:24px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
<tr>
<td style="background:linear-gradient(135deg,#059669,#4F46E5);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr>
<td align="center" style="vertical-align:middle;">
<div style="display:inline-block;width:48px;height:48px;background-color:#ffffff;border-radius:12px;text-align:center;line-height:48px;font-size:24px;margin-bottom:8px;">&#x1f6e1;</div>
<h1 style="margin:0;font-size:18px;font-weight:900;color:#ffffff;letter-spacing:1px;text-transform:uppercase;">GS VEMAPI</h1>
<p style="margin:4px 0 0;font-size:12px;color:#c7d2fe;font-weight:500;">Sistema de Gest&atilde;o de Certificados Digitais</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="background-color:#ffffff;padding:32px 32px 24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
${bodyContent}
</td>
</tr>
<tr>
<td style="background-color:#f9fafb;border-radius:0 0 16px 16px;padding:20px 32px;border:1px solid #e5e7eb;text-align:center;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr>
<td align="center" style="font-size:11px;color:#9ca3af;line-height:18px;">
<p style="margin:0 0 4px;"><strong style="color:#6b7280;">GS VEMAPI</strong> &mdash; Gest&atilde;o de Certificados Digitais</p>
<p style="margin:0 0 4px;">&copy; 2026 GS VEMAPI. Todos os direitos reservados.</p>
<p style="margin:0;font-size:10px;color:#9ca3af;">Este e-mail &eacute; confidencial e destina-se apenas ao(s) destinat&aacute;rio(s) indicado(s).<br>
Se voc&ecirc; recebeu esta mensagem por engano, por favor ignore-a.<br>
Em conformidade com a <strong>LGPD (Lei 13.709/2018)</strong>, tratamos seus dados com seguran&ccedil;a e transpar&ecirc;ncia.</p>
<p style="margin:8px 0 0;font-size:10px;color:#9ca3af;">
<a href="${BASE_URL}" style="color:#4F46E5;text-decoration:underline;">gsvemapi.com.br</a>
&nbsp;&bull;&nbsp;
<a href="mailto:suporte@gsvemapi.com.br" style="color:#4F46E5;text-decoration:underline;">suporte@gsvemapi.com.br</a>
</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

function h2(text: string): string {
  return `<h2 style="margin:0 0 16px;font-size:16px;font-weight:800;color:#1e293b;">${text}</h2>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:22px;color:#475569;">${text}</p>`;
}

function infoTable(rows: { label: string; value: string }[]): string {
  const trs = rows.map((r, i) => {
    const bg = i % 2 === 0 ? '#f9fafb' : '#ffffff';
    return `<tr>
      <td style="padding:8px 12px;font-size:13px;color:#64748b;font-weight:600;background-color:${bg};border-bottom:1px solid #f1f5f9;white-space:nowrap;">${r.label}</td>
      <td style="padding:8px 12px;font-size:13px;color:#1e293b;font-weight:500;background-color:${bg};border-bottom:1px solid #f1f5f9;">${r.value}</td>
    </tr>`;
  }).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
    ${trs}
  </table>`;
}

function primaryButton(url: string, text: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 8px;">
    <tr>
      <td align="center" style="background:linear-gradient(135deg,#059669,#4F46E5);border-radius:10px;padding:0;">
        <a href="${url}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${text}</a>
      </td>
    </tr>
  </table>`;
}

function spacer(size: number): string {
  return `<div style="height:${size}px;line-height:${size}px;font-size:1px;">&nbsp;</div>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">`;
}

// ─── Templates ─────────────────────────────────────────────────────────────────

export const paymentReceived: EmailTemplate = {
  subject: 'Pagamento recebido — Fatura #{fatura.numero}',
  html: (data) => {
    const fatura = data.fatura || {};
    const cliente = data.cliente || {};
    return wrapLayout(`
      ${h2('✅ Pagamento recebido com sucesso!')}
      ${p(`Ol&aacute; <strong>${cliente.nome || 'cliente'}</strong>,<br><br>
      Confirmamos o recebimento do pagamento da sua fatura. Seus certificados digitais est&atilde;o sendo processados e ser&atilde;o emitidos em breve.`)}
      ${infoTable([
        { label: 'Fatura', value: `#${fatura.numero || '---'}` },
        { label: 'Valor pago', value: `R$ ${Number(fatura.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
        { label: 'Data do pagamento', value: fatura.data_pagamento ? new Date(fatura.data_pagamento).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR') },
        { label: 'Forma de pagamento', value: fatura.meio_pagamento || 'PIX' },
        { label: 'Descri&ccedil;&atilde;o', value: fatura.descricao || '---' },
      ])}
      ${primaryButton(`${BASE_URL}/gs/faturas/${fatura.id || ''}`, 'Baixar comprovante')}
      ${p(`Se precisar de ajuda, entre em contato pelo nosso <a href="${BASE_URL}/gs/suporte" style="color:#4F46E5;font-weight:600;">suporte</a>.`)}
    `);
  },
};

export const paymentOverdue: EmailTemplate = {
  subject: 'Fatura vencida — #{fatura.numero}',
  html: (data) => {
    const fatura = data.fatura || {};
    const cliente = data.cliente || {};
    return wrapLayout(`
      ${h2('⚠️ Fatura vencida')}
      ${p(`Ol&aacute; <strong>${cliente.nome || 'cliente'}</strong>,<br><br>
      A fatura abaixo est&aacute; com o pagamento em atraso. Para evitar a suspens&atilde;o dos servi&ccedil;os, realize o pagamento o quanto antes.`)}
      ${infoTable([
        { label: 'Fatura', value: `#${fatura.numero || '---'}` },
        { label: 'Valor', value: `R$ ${Number(fatura.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
        { label: 'Vencimento original', value: fatura.data_vencimento ? new Date(fatura.data_vencimento).toLocaleDateString('pt-BR') : '---' },
        { label: 'Descri&ccedil;&atilde;o', value: fatura.descricao || '---' },
      ])}
      ${primaryButton(`${BASE_URL}/gs/faturas/${fatura.id || ''}`, 'Pagar agora')}
      ${p(`Caso j&aacute; tenha realizado o pagamento, desconsidere esta mensagem.<br>
      D&uacute;vidas? Acesse nosso <a href="${BASE_URL}/gs/suporte" style="color:#4F46E5;font-weight:600;">suporte</a>.`)}
    `);
  },
};

export const invoiceCreated: EmailTemplate = {
  subject: 'Fatura #{fatura.numero} — {cliente.nome}',
  html: (data) => {
    const fatura = data.fatura || {};
    const cliente = data.cliente || {};
    return wrapLayout(`
      ${h2('📄 Nova fatura gerada')}
      ${p(`Ol&aacute; <strong>${cliente.nome || 'cliente'}</strong>,<br><br>
      Uma nova fatura foi gerada para você. Veja os detalhes abaixo e realize o pagamento para dar continuidade ao processo.`)}
      ${infoTable([
        { label: 'Fatura', value: `#${fatura.numero || '---'}` },
        { label: 'Valor', value: `R$ ${Number(fatura.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
        { label: 'Data de vencimento', value: fatura.data_vencimento ? new Date(fatura.data_vencimento).toLocaleDateString('pt-BR') : '---' },
        { label: 'Descri&ccedil;&atilde;o', value: fatura.descricao || '---' },
        { label: 'Forma de pagamento', value: fatura.meio_pagamento || 'PIX' },
      ])}
      ${fatura.asaas_pix_code ? `<p style="margin:0 0 12px;font-size:13px;color:#475569;">Escaneie o QR code PIX abaixo ou clique no bot&atilde;o para pagar:</p>
      <div style="background:#f9fafb;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin:0 0 12px;text-align:center;font-family:monospace;font-size:11px;color:#64748b;word-break:break-all;">${fatura.asaas_pix_code}</div>` : ''}
      ${fatura.asaas_bank_slip_url ? primaryButton(fatura.asaas_bank_slip_url, 'Baixar boleto') : ''}
      ${fatura.asaas_invoice_url ? primaryButton(fatura.asaas_invoice_url, 'Pagar fatura') : ''}
      ${p(`Se j&aacute; realizou o pagamento, aguarde a confirma&ccedil;&atilde;o que enviaremos por e-mail.<br>
      Precisa de ajuda? <a href="${BASE_URL}/gs/suporte" style="color:#4F46E5;font-weight:600;">Fale conosco</a>.`)}
    `);
  },
};

export const certificateExpiring: EmailTemplate = {
  subject: 'Certificado Digital expirando em {dias} dias — {cliente.nome}',
  html: (data) => {
    const cliente = data.cliente || {};
    const cert = data.certificado || {};
    const dias = data.dias || data.daysUntilExpiry || 0;
    return wrapLayout(`
      ${h2(`🔐 Certificado Digital expirando em ${dias} dias`)}
      ${p(`Ol&aacute; <strong>${cliente.nome || 'cliente'}</strong>,<br><br>
      Seu certificado digital est&aacute; pr&oacute;ximo da data de expira&ccedil;&atilde;o. Recomendamos renov&aacute;-lo o quanto antes para evitar a interrup&ccedil;&atilde;o dos servi&ccedil;os que utilizam o certificado.`)}
      ${infoTable([
        { label: 'Cliente', value: cliente.nome || '---' },
        { label: 'Tipo de certificado', value: cert.tipo || '---' },
        { label: 'CPF/CNPJ', value: cliente.documento || '---' },
        { label: 'Data de expira&ccedil;&atilde;o', value: cert.data_expiracao ? new Date(cert.data_expiracao).toLocaleDateString('pt-BR') : '---' },
        { label: 'Dias restantes', value: `${dias} dias` },
      ])}
      ${primaryButton(`${BASE_URL}/gs/pedidos/novo?renovacao=${cert.id || ''}`, 'Renovar agora')}
      ${p(`Em caso de d&uacute;vidas, entre em contato com nosso <a href="${BASE_URL}/gs/suporte" style="color:#4F46E5;font-weight:600;">suporte</a> ou ligue para (11) 3000-0000.`)}
    `);
  },
};

export const certificateExpired: EmailTemplate = {
  subject: 'Certificado Digital EXPIRADO — {cliente.nome}',
  html: (data) => {
    const cliente = data.cliente || {};
    const cert = data.certificado || {};
    return wrapLayout(`
      ${h2('🔴 Certificado Digital Expirado')}
      ${p(`Ol&aacute; <strong>${cliente.nome || 'cliente'}</strong>,<br><br>
      Seu certificado digital expirou em <strong>${cert.data_expiracao ? new Date(cert.data_expiracao).toLocaleDateString('pt-BR') : '---'}</strong>.<br><br>
      Certificados expirados n&atilde;o podem ser utilizados para assinatura digital, autentica&ccedil;&atilde;o ou transa&ccedil;&otilde;es eletr&ocirc;nicas.<br><br>
      Para voltar a utilizar os servi&ccedil;os, ser&aacute; necess&aacute;rio solicitar um novo certificado (reemiss&atilde;o).`)}
      ${infoTable([
        { label: 'Cliente', value: cliente.nome || '---' },
        { label: 'Tipo de certificado', value: cert.tipo || '---' },
        { label: 'CPF/CNPJ', value: cliente.documento || '---' },
        { label: 'Data de expira&ccedil;&atilde;o', value: cert.data_expiracao ? new Date(cert.data_expiracao).toLocaleDateString('pt-BR') : '---' },
      ])}
      ${primaryButton(`${BASE_URL}/gs/pedidos/novo?reemissao=${cert.id || ''}`, 'Solicitar novo certificado')}
      ${p(`Precisa de ajuda? Acesse nosso <a href="${BASE_URL}/gs/suporte" style="color:#4F46E5;font-weight:600;">suporte</a> ou ligue para (11) 3000-0000.`)}
    `);
  },
};

export const welcomeAR: EmailTemplate = {
  subject: 'Bem-vindo ao GS VEMAPI, {nome}!',
  html: (data) => {
    const nome = data.nome || '';
    const arNome = data.arNome || 'sua AR';
    return wrapLayout(`
      ${h2(`Bem-vindo(a) ao GS VEMAPI, ${nome}!`)}
      ${p(`Estamos felizes em ter a <strong>${arNome}</strong> como parceira!<br><br>
      O GS VEMAPI &eacute; o sistema completo para gest&atilde;o de certificados digitais da sua AR (Autoridade de Registro). Com ele, voc&ecirc; pode gerenciar pedidos, emitir certificados, controlar financeiro e muito mais.`)}
      ${h2('🚀 Primeiros passos')}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;">
        <tr><td style="padding:4px 0;font-size:13px;color:#475569;">1. <strong>Complete seu cadastro</strong> — Acesse Configura&ccedil;&otilde;es e preencha os dados da sua AR</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#475569;">2. <strong>Configure o gateway</strong> — Integre com o Asaas para cobran&ccedil;as via PIX, boleto ou cart&atilde;o</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#475569;">3. <strong>Adicione sua equipe</strong> — Cadastre AGRs e colaboradores com n&iacute;veis de acesso</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#475569;">4. <strong>Comece a emitir</strong> — Crie pedidos e gerencie certificados digitais</td></tr>
      </table>
      ${primaryButton(BASE_URL, 'Acessar o sistema')}
      ${divider()}
      ${p(`Se tiver qualquer d&uacute;vida, nossa equipe de suporte est&aacute; pronta para ajudar:<br>
      📧 <a href="mailto:suporte@gsvemapi.com.br" style="color:#4F46E5;font-weight:600;">suporte@gsvemapi.com.br</a><br>
      📞 (11) 3000-0000<br><br>
      Bem-vindo a bordo! 🎉`)}
    `);
  },
};

export const ticketCreated: EmailTemplate = {
  subject: 'Ticket #{ticket.numero} criado — {ticket.titulo}',
  html: (data) => {
    const ticket = data.ticket || {};
    const usuario = data.usuario || {};
    return wrapLayout(`
      ${h2('🎫 Novo ticket de suporte')}
      ${p(`Ol&aacute; <strong>${usuario.nome || 'usu&aacute;rio'}</strong>,<br><br>
      Seu ticket de suporte foi criado com sucesso. Nossa equipe j&aacute; foi notificada e responder&aacute; em breve.`)}
      ${infoTable([
        { label: 'Ticket', value: `#${ticket.numero || '---'}` },
        { label: 'T&iacute;tulo', value: ticket.titulo || '---' },
        { label: 'Prioridade', value: ticket.prioridade || 'Normal' },
        { label: 'Status', value: 'Aberto' },
      ])}
      ${p(`Tempo estimado de resposta:<br>
      <strong>${ticket.prioridade === 'URGENTE' ? 'At&eacute; 2 horas' : ticket.prioridade === 'ALTA' ? 'At&eacute; 4 horas' : 'At&eacute; 24 horas'}</strong>`)}
      ${primaryButton(`${BASE_URL}/gs/suporte/${ticket.id || ''}`, 'Acompanhar ticket')}
      ${p(`Enquanto isso, voc&ecirc; pode consultar nossa <a href="${BASE_URL}/gs/suporte" style="color:#4F46E5;font-weight:600;">base de conhecimento</a> para solu&ccedil;&otilde;es r&aacute;pidas.`)}
    `);
  },
};

export const ticketResponse: EmailTemplate = {
  subject: 'Resposta ao Ticket #{ticket.numero}',
  html: (data) => {
    const ticket = data.ticket || {};
    const resposta = data.resposta || {};
    return wrapLayout(`
      ${h2('💬 Nova resposta ao seu ticket')}
      ${p(`Ol&aacute;,<br><br>
      Seu ticket <strong>#${ticket.numero || '---'}</strong> recebeu uma nova resposta da equipe de suporte.`)}
      ${infoTable([
        { label: 'Ticket', value: `#${ticket.numero || '---'}` },
        { label: 'Assunto', value: ticket.titulo || '---' },
      ])}
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:0 0 12px;">
        <p style="margin:0 0 8px;font-size:12px;color:#059669;font-weight:600;">Resposta do suporte:</p>
        <p style="margin:0;font-size:14px;line-height:22px;color:#1e293b;">${resposta.mensagem || 'Nossa equipe respondeu ao seu ticket.'}</p>
        <p style="margin:8px 0 0;font-size:11px;color:#64748b;">— ${resposta.autor || 'Equipe GS VEMAPI'}, ${resposta.data ? new Date(resposta.data).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}</p>
      </div>
      ${primaryButton(`${BASE_URL}/gs/suporte/${ticket.id || ''}`, 'Ver resposta completa')}
    `);
  },
};

export const testEmail: EmailTemplate = {
  subject: 'Teste de envio — GS VEMAPI',
  html: () => wrapLayout(`
    ${h2('🔧 Teste de envio de e-mail')}
    ${p('Este &eacute; um e-mail de teste enviado pelo sistema GS VEMAPI.')}
    ${p('Se voc&ecirc; est&aacute; recebendo esta mensagem, a configura&ccedil;&atilde;o de e-mail est&aacute; funcionando corretamente! ✅')}
    ${infoTable([
      { label: 'Sistema', value: 'GS VEMAPI' },
      { label: 'Vers&atilde;o', value: '1.0.0' },
      { label: 'Ambiente', value: process.env.NODE_ENV || 'development' },
      { label: 'Data/hora', value: new Date().toLocaleString('pt-BR') },
    ])}
    ${p(`<em>Este e-mail foi gerado automaticamente. N&atilde;o &eacute; necess&aacute;rio responder.</em>`)}
  `),
};

export const emailTemplates = {
  paymentReceived,
  paymentOverdue,
  invoiceCreated,
  certificateExpiring,
  certificateExpired,
  welcomeAR,
  ticketCreated,
  ticketResponse,
  testEmail,
};
