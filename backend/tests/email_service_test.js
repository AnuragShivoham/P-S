const test = require('node:test');
const assert = require('node:assert/strict');

process.env.RESEND_API_KEY = 'test-resend-key';
process.env.GMAIL_CLIENT_ID = 'test-client-id';
process.env.GMAIL_CLIENT_SECRET = 'test-client-secret';
process.env.GMAIL_REFRESH_TOKEN = 'test-refresh-token';
process.env.EMAIL_USER = 'mailer@example.test';
process.env.EMAIL_PASS = 'test-smtp-password';
process.env.EMAIL_FROM = 'SOCRATES <mailer@example.test>';

const { sendEmail } = require('../src/services/emailService');
const nodemailer = require('nodemailer');
const originalFetch = global.fetch;
const originalCreateTransport = nodemailer.createTransport;
const message = { to: 'recipient@example.test', subject: 'Test subject', html: '<p>Test</p>' };

test.afterEach(() => {
  global.fetch = originalFetch;
  nodemailer.createTransport = originalCreateTransport;
});

test('sends via Resend when API key is valid', async () => {
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(JSON.stringify({ id: 'resend-id' }), { status: 200 });
  };

  const result = await sendEmail(message);
  assert.equal(result.provider, 'resend');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://api.resend.com/emails');
  assert.deepEqual(JSON.parse(requests[0].options.body).to, [message.to]);
});

test('falls back to Gmail API after Resend rejects its key', async () => {
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url) === 'https://api.resend.com/emails') {
      return new Response(JSON.stringify({ message: 'API key is invalid' }), { status: 401 });
    }
    if (String(url) === 'https://oauth2.googleapis.com/token') {
      return new Response(JSON.stringify({ access_token: 'test-access-token', expires_in: 3600 }), { status: 200 });
    }
    return new Response(JSON.stringify({ id: 'gmail-id' }), { status: 200 });
  };

  const result = await sendEmail(message);
  assert.equal(result.provider, 'gmail');
  assert.equal(requests.length, 3);
  assert.equal(requests[2].url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
  const sentMime = Buffer.from(JSON.parse(requests[2].options.body).raw, 'base64url').toString('utf8');
  assert.equal(sentMime.includes('recipient@example.test'), true);
});

test('uses SMTP fallback after API providers fail', async () => {
  const requests = [];
  global.fetch = async url => {
    requests.push(String(url));
    return new Response(JSON.stringify({ message: 'provider unavailable' }), { status: 503 });
  };
  let smtpMessage;
  nodemailer.createTransport = () => ({
    sendMail: async value => { smtpMessage = value; return { messageId: 'smtp-id' }; },
    close() {},
  });

  const result = await sendEmail(message);
  assert.equal(result.provider, 'smtp');
  assert.equal(smtpMessage.to[0], message.to);
  assert.equal(requests.length, 2);
});

test('returns provider diagnostics without including configured secrets', async () => {
  global.fetch = async url => String(url) === 'https://api.resend.com/emails'
    ? new Response(JSON.stringify({ message: 'API key is invalid' }), { status: 401 })
    : new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'Token has been revoked' }), { status: 400 });
  nodemailer.createTransport = () => ({
    sendMail: async () => { throw new Error('Connection timeout'); },
    close() {},
  });

  await assert.rejects(sendEmail(message), error => {
    assert.match(error.message, /Resend: API key is invalid/);
    assert.match(error.message, /Gmail API: Token has been revoked/);
    assert.match(error.message, /SMTP: Connection timeout/);
    assert.equal(error.message.includes(process.env.GMAIL_CLIENT_SECRET), false);
    assert.equal(error.message.includes(process.env.GMAIL_REFRESH_TOKEN), false);
    assert.equal(error.message.includes(process.env.RESEND_API_KEY), false);
    return true;
  });
});
