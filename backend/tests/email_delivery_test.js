const assert = require('node:assert/strict');
const { sendWithFallback } = require('../src/services/emailDelivery');

async function main() {
  let smtpCalls = 0;
  let fetchCalls = 0;
  const message = { to: 'user@example.test', subject: 'Code', html: '<p>123456</p>' };

  let provider = await sendWithFallback({
    smtpTransporter: {
      async sendMail(payload) {
        smtpCalls += 1;
        assert.equal(payload.to, message.to);
        assert.equal(payload.from, 'SOCRATES <mail@example.test>');
      }
    },
    smtpFrom: 'SOCRATES <mail@example.test>',
    resendApiKey: 'test-key',
    resendFrom: 'SOCRATES <verified@example.test>',
    message,
    fetchImpl: async () => {
      fetchCalls += 1;
      return { ok: true, status: 200 };
    }
  });
  assert.equal(provider, 'smtp');
  assert.equal(smtpCalls, 1);
  assert.equal(fetchCalls, 0);
  console.log('  PASS SMTP remains the primary provider');

  let capturedRequest;
  provider = await sendWithFallback({
    smtpTransporter: {
      async sendMail() {
        throw Object.assign(new Error('SMTP unavailable'), { code: 'ENETUNREACH' });
      }
    },
    smtpFrom: 'SOCRATES <mail@example.test>',
    resendApiKey: 'test-key',
    resendFrom: 'SOCRATES <verified@example.test>',
    message,
    fetchImpl: async (url, options) => {
      capturedRequest = { url, options };
      return { ok: true, status: 200 };
    }
  });
  assert.equal(provider, 'resend');
  assert.equal(capturedRequest.url, 'https://api.resend.com/emails');
  assert.equal(capturedRequest.options.method, 'POST');
  assert.equal(capturedRequest.options.headers.Authorization, 'Bearer test-key');
  assert.deepEqual(JSON.parse(capturedRequest.options.body), {
    from: 'SOCRATES <verified@example.test>',
    ...message
  });
  console.log('  PASS SMTP failure falls back to Resend HTTPS');

  await sendWithFallback({
    resendApiKey: 'test-key',
    smtpFrom: 'SOCRATES <no-reply@socrates.app>',
    message,
    fetchImpl: async (url, options) => {
      const payload = JSON.parse(options.body);
      assert.equal(payload.from, 'SOCRATES <onboarding@resend.dev>');
      return { ok: true, status: 200 };
    }
  });
  console.log('  PASS API-key-only test mode uses Resend shared sender');

  await assert.rejects(
    sendWithFallback({
      smtpTransporter: { async sendMail() { throw new Error('SMTP unavailable'); } },
      smtpFrom: 'SOCRATES <mail@example.test>',
      message,
      fetchImpl: async () => { throw new Error('fetch must not be called without an API key'); }
    }),
    /SMTP unavailable/
  );
  console.log('  PASS SMTP error is preserved when Resend is not configured');

  await assert.rejects(
    sendWithFallback({
      resendApiKey: 'test-key',
      resendFrom: 'SOCRATES <verified@example.test>',
      message,
      fetchImpl: async () => ({ ok: false, status: 422 })
    }),
    /Resend email API returned HTTP 422/
  );
  console.log('  PASS Resend API rejections are reported');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});