const nodemailer = require('nodemailer');
const config = require('../config');

function normalizeRecipients(to) {
  return (Array.isArray(to) ? to : [to]).map(value => String(value || '').trim()).filter(Boolean);
}

function compactError(value) {
  return String(value || 'Unknown provider error').replace(/[\r\n\t]+/g, ' ').slice(0, 220);
}

function gmailFromHeader() {
  const displayName = String(config.EMAIL_FROM || '').match(/^\s*([^<]+)\s*</)?.[1]?.trim();
  const account = String(config.EMAIL_USER || '').trim();
  if (!account) return config.EMAIL_FROM;
  return displayName ? `${displayName} <${account}>` : account;
}

async function sendWithResend(message, recipients) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: message.from || config.EMAIL_FROM,
      to: recipients,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = result.message || result.error || `HTTP ${response.status}`;
    throw new Error(compactError(detail));
  }
  return { provider: 'resend', id: result.id };
}

async function sendWithGmail(message, recipients) {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.GMAIL_CLIENT_ID,
      client_secret: config.GMAIL_CLIENT_SECRET,
      refresh_token: config.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(15000),
  });
  const tokenResult = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenResult.access_token) {
    throw new Error(compactError(tokenResult.error_description || tokenResult.error || `HTTP ${tokenResponse.status}`));
  }

  const subject = Buffer.from(String(message.subject || ''), 'utf8').toString('base64');
  const html = Buffer.from(String(message.html || ''), 'utf8').toString('base64');
  const mime = [
    `From: ${gmailFromHeader()}`,
    `To: ${recipients.join(', ')}`,
    `Subject: =?UTF-8?B?${subject}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    html,
  ].join('\r\n');
  const raw = Buffer.from(mime, 'utf8').toString('base64url');
  const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenResult.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
    signal: AbortSignal.timeout(15000),
  });
  const sendResult = await sendResponse.json().catch(() => ({}));
  if (!sendResponse.ok) {
    throw new Error(compactError(sendResult.error?.message || `HTTP ${sendResponse.status}`));
  }
  return { provider: 'gmail', id: sendResult.id };
}

async function sendWithSmtp(message, recipients) {
  if (!config.EMAIL_USER || !config.EMAIL_PASS) throw new Error('SMTP credentials are not configured.');
  const transporter = nodemailer.createTransport({
    host: config.EMAIL_HOST,
    port: config.EMAIL_PORT,
    secure: config.EMAIL_PORT === 465,
    auth: { user: config.EMAIL_USER, pass: config.EMAIL_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  try {
    await transporter.sendMail({ ...message, from: message.from || config.EMAIL_FROM, to: recipients });
  } finally {
    transporter.close();
  }
  return { provider: 'smtp' };
}

async function sendEmail(message) {
  const recipients = normalizeRecipients(message.to);
  if (!recipients.length) throw new Error('No email recipients were provided.');

  const attempts = [];
  const providers = [];
  if (config.RESEND_API_KEY) providers.push(['Resend', sendWithResend]);
  if (config.GMAIL_CLIENT_ID && config.GMAIL_CLIENT_SECRET && config.GMAIL_REFRESH_TOKEN) {
    providers.push(['Gmail API', sendWithGmail]);
  }
  if (config.EMAIL_USER && config.EMAIL_PASS) providers.push(['SMTP', sendWithSmtp]);
  if (!providers.length) throw new Error('No email provider is configured. Configure RESEND_API_KEY, Gmail OAuth credentials, or SMTP credentials.');

  for (const [name, send] of providers) {
    try {
      const result = await send(message, recipients);
      console.info(`[Email] Delivered via ${result.provider} to ${recipients.length} recipient(s).`);
      return result;
    } catch (error) {
      const detail = compactError(error.message);
      attempts.push(`${name}: ${detail}`);
      console.error(`[Email] ${name} delivery failed: ${detail}`);
    }
  }
  throw new Error(`Email delivery failed. ${attempts.join(' | ')}`);
}

module.exports = { sendEmail };
