const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'university-email-test-'));
process.env.DB_PATH = path.join(tempDir, 'test.sqlite');
process.env.JWT_SECRET = 'test-only-secret-for-university-email-route-tests';
process.env.RESEND_API_KEY = 'dummy-resend-secret';
process.env.GMAIL_CLIENT_ID = 'dummy-gmail-client';
process.env.GMAIL_CLIENT_SECRET = 'dummy-gmail-secret';
process.env.GMAIL_REFRESH_TOKEN = 'dummy-gmail-refresh-secret';
process.env.EMAIL_USER = 'smtp@example.test';
process.env.EMAIL_PASS = 'dummy-smtp-secret';
process.env.ADMIN_EMAILS = 'admin@example.test';

const crypto = require('node:crypto');
const db = require('../src/db/database');
const config = require('../src/config');
const app = require('express')();
app.use(require('express').json());
app.use('/api/v1/auth', require('../src/routes/auth'));
app.use('/api/v1/university-applications', require('../src/routes/universityApplications'));

const originalFetch = global.fetch;
const originalCreateTransport = nodemailer.createTransport;
const adminId = 'test-admin-user';
db.prepare('INSERT INTO users (id, email, name, role, roles) VALUES (?, ?, ?, ?, ?)')
  .run(adminId, 'admin@example.test', 'Test Admin', 'admin', '["admin"]');
const adminToken = jwt.sign({ id: adminId, email: 'admin@example.test', role: 'admin' }, config.JWT_SECRET);
let server;
let baseUrl;

function createPendingApplication(email = 'applicant@example.test') {
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO university_registration_requests
    (id, email, contact_name, institution_name, website, status)
    VALUES (?, ?, ?, ?, ?, 'pending')`)
    .run(id, email, 'Test Applicant', 'Test University', null);
  return { id };
}

function fakeProviderFailures() {
  global.fetch = async (url, options) => {
    const providerUrl = String(url);
    if (providerUrl.startsWith('http://127.0.0.1:')) return originalFetch(url, options);
    if (providerUrl === 'https://api.resend.com/emails') {
      return new Response(JSON.stringify({ message: 'Invalid test key' }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'Test refresh revoked' }), { status: 400 });
  };
  nodemailer.createTransport = () => ({
    sendMail: async () => { throw new Error('Test SMTP timeout'); },
    close() {},
  });
}

test.before(async () => {
  fakeProviderFailures();
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
});

test('approval email failure keeps approval active and does not block access', async () => {
  fakeProviderFailures();
  const application = createPendingApplication('approve@example.test');
  const response = await fetch(`${baseUrl}/university-applications/admin/${application.id}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ decision: 'approve' }),
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.status, 'approved');
  assert.equal(result.emailSent, false);
  assert.equal(result.message, 'Unable to Access !! Contact ADMIN for PORTAL ACCESS');
  assert.equal(db.prepare('SELECT status FROM university_registration_requests WHERE id = ?').get(application.id).status, 'approved');
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users WHERE email = ?').get('approve@example.test').count, 0);
});

test('rejection email failure keeps rejection active and blocks access', async () => {
  fakeProviderFailures();
  const application = createPendingApplication('reject@example.test');
  const response = await fetch(`${baseUrl}/university-applications/admin/${application.id}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ decision: 'reject' }),
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.status, 'rejected');
  assert.equal(result.emailSent, false);
  assert.equal(result.message, 'Unable to Access !! Contact ADMIN for PORTAL ACCESS');
  assert.equal(db.prepare('SELECT status FROM university_registration_requests WHERE id = ?').get(application.id).status, 'rejected');
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users WHERE email = ?').get('reject@example.test').count, 0);
});

test('pending university application is blocked with admin contact message', async () => {
  const application = createPendingApplication('pending@example.test');
  const response = await fetch(`${baseUrl}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'pending@example.test', role: 'university', action: 'login' }),
  });
  const result = await response.json();
  assert.equal(response.status, 403);
  assert.equal(result.error, 'Unable to Access !! Contact ADMIN for PORTAL ACCESS');
  assert.equal(db.prepare('SELECT status FROM university_registration_requests WHERE id = ?').get(application.id).status, 'pending');
});

test('pending university email without role still blocks before email is attempted', async () => {
  const application = createPendingApplication('pending-without-role@example.test');
  const response = await fetch(`${baseUrl}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'pending-without-role@example.test', action: 'login' }),
  });
  const result = await response.json();
  assert.equal(response.status, 403);
  assert.equal(result.error, 'Unable to Access !! Contact ADMIN for PORTAL ACCESS');
  assert.equal(db.prepare('SELECT status FROM university_registration_requests WHERE id = ?').get(application.id).status, 'pending');
});

test('otp send fallback succeeds even when email delivery fails', async () => {
  fakeProviderFailures();
  db.prepare('INSERT OR IGNORE INTO users (id, email, name, role, roles) VALUES (?, ?, ?, ?, ?)')
    .run('fallback-user', 'demo-fallback@example.com', 'Fallback User', 'student', '["student"]');

  const response = await fetch(`${baseUrl}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo-fallback@example.com', action: 'login' }),
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.success, true);
  assert.match(result.message, /otp generated|email delivery failed|server console/i);
});

test.after(() => {
  global.fetch = originalFetch;
  nodemailer.createTransport = originalCreateTransport;
  if (server) server.close();
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});
