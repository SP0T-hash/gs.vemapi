import nodemailer from 'nodemailer';
import { emailTemplates, type EmailTemplate } from './email-templates';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string[];
  bcc?: string[];
  attachments?: { filename: string; content: Buffer | string }[];
}

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'smtp';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@gsvemapi.com.br';
const IS_DEV = process.env.NODE_ENV === 'development';

function normalizeRecipients(to: string | string[]): string[] {
  return Array.isArray(to) ? to : [to];
}

function getResendTransport() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY não configurada');
  }
  return apiKey;
}

function getSmtpTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP_HOST, SMTP_USER e SMTP_PASS devem estar configurados');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; id?: string }> {
  const recipients = normalizeRecipients(options.to);

  if (IS_DEV) {
    console.log('--- 📧 EMAIL (DEV MODE) ---');
    console.log('To:', recipients.join(', '));
    console.log('Subject:', options.subject);
    if (options.cc?.length) console.log('CC:', options.cc.join(', '));
    if (options.bcc?.length) console.log('BCC:', options.bcc.join(', '));
    console.log('--- HTML (first 500 chars) ---');
    console.log(options.html.slice(0, 500));
    console.log('--- END EMAIL ---');
    return { success: true, id: 'dev-mode' };
  }

  try {
    if (EMAIL_PROVIDER === 'resend') {
      const apiKey = getResendTransport();
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: recipients,
          cc: options.cc,
          bcc: options.bcc,
          subject: options.subject,
          html: options.html,
          attachments: options.attachments?.map(a => ({
            filename: a.filename,
            content: a.content instanceof Buffer ? a.content.toString('base64') : a.content,
          })),
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Resend error ${response.status}: ${err}`);
      }

      const data = await response.json();
      return { success: true, id: data.id };
    }

    const transporter = getSmtpTransport();
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: recipients,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });

    return { success: true, id: info.messageId };
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false };
  }
}

export async function sendTemplateEmail(
  template: EmailTemplate,
  data: Record<string, any>,
  to: string
): Promise<{ success: boolean; id?: string }> {
  const subject = template.subject.replace(/\{(\w+)\}/g, (_, key) => {
    const keys = key.split('.');
    let val: any = data;
    for (const k of keys) {
      val = val?.[k];
    }
    return val ?? `{${key}}`;
  });

  const html = template.html(data);

  return sendEmail({
    to,
    subject,
    html,
  });
}

export { emailTemplates };
export type { EmailTemplate, EmailOptions };
