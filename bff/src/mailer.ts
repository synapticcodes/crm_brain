import nodemailer from 'nodemailer';

export function createMailer() {
  const host = process.env.SMTP_HOST || '127.0.0.1';
  const port = Number(process.env.SMTP_PORT || '54325');
  const from = process.env.SMTP_FROM || 'no-reply@local.test';

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false
  });

  return { transporter, from };
}
