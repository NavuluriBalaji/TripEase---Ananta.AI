import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

export type MailResult = {
  success: boolean;
  transport: 'smtp' | 'file';
  id?: string;
  filePath?: string;
  error?: string;
};

export async function sendBookingEmail(to: string, subject: string, html: string, text?: string): Promise<MailResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM || user || 'no-reply@tripease.local';

  if (host && user && pass) {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      const info = await transporter.sendMail({ from, to, subject, html, text });
      return { success: true, transport: 'smtp', id: info.messageId };
    } catch (e: any) {
      console.warn('SMTP send failed, falling back to file outbox.', e?.message || e);
      // Fall through to file outbox
    }
  }

  try {
    const outDir = path.resolve(process.cwd(), 'outbox');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const fileBase = subject.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60) + '_' + Date.now();
    const filePath = path.join(outDir, fileBase + '.eml');
    const content = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      html,
      '',
      '<!-- Text alternative -->',
      '<pre style="white-space:pre-wrap">' + (text || '') + '</pre>',
    ].join('\r\n');
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, transport: 'file', filePath };
  } catch (err: any) {
    return { success: false, transport: 'file', error: err?.message || String(err) };
  }
}
