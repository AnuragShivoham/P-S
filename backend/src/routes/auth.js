const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const db = require('../db/database');
const config = require('../config');

const authAttempts = new Map();
function allowAuthAttempt(key, limit, windowMs) {
  const now = Date.now();
  const recent = (authAttempts.get(key) || []).filter(timestamp => now - timestamp < windowMs);
  if (recent.length >= limit) {
    authAttempts.set(key, recent);
    return false;
  }
  recent.push(now);
  authAttempts.set(key, recent);
  return true;
}

function rateLimitAuth(action, { emailLimit, ipLimit, windowMs }) {
  return (req, res, next) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const emailAllowed = !emailLimit || !email || allowAuthAttempt(`${action}:email:${email}`, emailLimit, windowMs);
    const ipAllowed = !ipLimit || allowAuthAttempt(`${action}:ip:${ip}`, ipLimit, windowMs);
    if (!emailAllowed || !ipAllowed) {
      return res.status(429).json({ error: 'Too many authentication attempts. Please try again later.' });
    }
    next();
  };
}

function isAdminIdentity(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return false;
  if (config.ADMIN_EMAILS.includes(normalizedEmail)) return true;
  return Boolean(db.prepare("SELECT 1 FROM users WHERE email = ? AND role = 'admin'").get(normalizedEmail));
}

const wrap = fn => (req, res, next) => fn(req, res, next).catch(e => {
  console.error('[Auth Error]', e.message);
  res.status(500).json({ error: e.message });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function upsertUser(email, name, extra = {}) {
  const normalizedEmail = String(email).toLowerCase();
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  
  // Self-service signup can only create non-privileged accounts. Mentors,
  // universities, and admins must be provisioned by an authenticated admin.
  const targetRole = ['student', 'citizen'].includes(extra.role) ? extra.role : 'student';

  if (!user) {
    const id = uuidv4();
    db.prepare('INSERT INTO users (id, email, name, role, google_id, avatar) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, normalizedEmail, name, targetRole, extra.google_id || null, extra.avatar || null);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  } else {
    const updates = [];
    const params = [];
    if (extra.google_id && !user.google_id) {
      updates.push('google_id=?', 'avatar=?');
      params.push(extra.google_id, extra.avatar || null);
    }
    if (updates.length > 0) {
      params.push(user.id);
      db.prepare(`UPDATE users SET ${updates.join(',')} WHERE id=?`).run(...params);
    }
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  }
  return user;
}

// ─── Email transporter  ───────────────────────────────────────────────────────
function getTransporter() {
  if (!config.EMAIL_USER || !config.EMAIL_PASS) {
    console.warn('[Auth] EMAIL_USER / EMAIL_PASS not set – OTP emails will fail');
  }
  return nodemailer.createTransport({
    host: config.EMAIL_HOST,
    port: config.EMAIL_PORT,
    secure: config.EMAIL_PORT === 465,
    auth: { user: config.EMAIL_USER, pass: config.EMAIL_PASS },
  });
}

// ─── POST /auth/send-otp ──────────────────────────────────────────────────────
router.post('/send-otp', rateLimitAuth('send-otp', { emailLimit: 3, ipLimit: 10, windowMs: 15 * 60 * 1000 }), wrap(async (req, res) => {
  const { email, action } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const existingUser = db.prepare('SELECT role FROM users WHERE email = ?').get(normalizedEmail);

  if (isAdminIdentity(normalizedEmail)) {
    return res.status(403).json({ error: 'Admin accounts must sign in using the Admin option and password.' });
  }

  if (action === 'login' && !existingUser) {
    return res.status(404).json({ error: 'Account not found. Please sign up first.' });
  }
  if (action === 'signup' && existingUser) {
    return res.status(409).json({ error: 'Account already exists. Please log in.' });
  }

  let otp = String(crypto.randomInt(100000, 1000000));
  if (process.env.NODE_ENV !== 'production' && normalizedEmail === 'test@example.com') {
    otp = '123456';
  }
  
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  db.prepare('INSERT INTO otp_requests (id, email, otp, expires_at) VALUES (?, ?, ?, ?)')
    .run(uuidv4(), normalizedEmail, otp, expiresAt);

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: config.EMAIL_FROM,
      to: normalizedEmail,
      subject: 'Your SOCRATES login code',
      html: `
        <div style="font-family:monospace;background:#0d0d0d;color:#e6edf3;padding:32px;border-radius:12px;max-width:480px">
          <h2 style="color:#58a6ff;margin:0 0 8px">SOCRATES</h2>
          <p style="color:#8b949e;margin:0 0 24px">Your one-time login code:</p>
          <div style="font-size:36px;font-weight:900;letter-spacing:10px;color:#3fb950;margin-bottom:24px">${otp}</div>
          <p style="color:#8b949e;font-size:12px">Expires in 10 minutes. Do not share this code.</p>
        </div>
      `,
    });
    res.json({ success: true, message: 'OTP sent to ' + normalizedEmail });
  } catch (e) {
    console.error('[Auth] Email send failed:', e.message);
    if (process.env.NODE_ENV !== 'production') {
      // In dev mode, log the OTP so the developer can see it
      console.log(`\n[DEV ONLY] OTP for ${normalizedEmail}: ${otp}\n`);
      return res.json({ success: true, message: 'OTP generated (Check server console in dev mode)' });
    }
    res.status(500).json({ error: 'Failed to send email: ' + e.message });
  }
}));

function hydrateUser(user) {
  if (!user) return null;
  try {
    user.tech_stack = typeof user.tech_stack === 'string' ? JSON.parse(user.tech_stack || '[]') : (user.tech_stack || []);
  } catch(e) { user.tech_stack = []; }
  try {
    user.primary_goals = typeof user.primary_goals === 'string' ? JSON.parse(user.primary_goals || '[]') : (user.primary_goals || []);
  } catch(e) { user.primary_goals = []; }
  user.onboarded = user.onboarded === 1 || user.onboarded === true;
  return user;
}

// ─── POST /auth/verify-otp ────────────────────────────────────────────────────
router.post('/verify-otp', rateLimitAuth('verify-otp', { emailLimit: 5, ipLimit: 20, windowMs: 15 * 60 * 1000 }), wrap(async (req, res) => {
  const { email, otp, name, role, action } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'email and otp required' });
  const ALLOWED_OTP_ROLES = ['student', 'mentor', 'citizen', 'university'];
  if (role === 'admin') {
    return res.status(403).json({ error: 'Admin access requires the admin email and password.' });
  }
  if (isAdminIdentity(email)) {
    return res.status(403).json({ error: 'Admin accounts must sign in using the Admin option and password.' });
  }
  if (role && !ALLOWED_OTP_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified.' });
  }
  if (action === 'signup' && ['mentor', 'university'].includes(role)) {
    return res.status(403).json({ error: 'Mentor and university accounts must be provisioned by an administrator.' });
  }

  const now = new Date().toISOString();
  const record = db.prepare(
    'SELECT * FROM otp_requests WHERE email=? AND otp=? AND used=0 AND expires_at > ? ORDER BY created_at DESC LIMIT 1'
  ).get(email.toLowerCase(), String(otp), now);

  if (!record) return res.status(401).json({ error: 'Invalid or expired OTP' });
  db.prepare('UPDATE otp_requests SET used=1 WHERE id=?').run(record.id);

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = db.prepare('SELECT role FROM users WHERE email = ?').get(normalizedEmail);
  if (existingUser?.role === 'admin') {
    return res.status(403).json({ error: 'Admin accounts must sign in using the Admin option and password.' });
  }
  if (['mentor', 'university'].includes(role) && existingUser?.role !== role) {
    return res.status(403).json({ error: `${role} accounts must be provisioned by an administrator before sign-in.` });
  }

  const userExists = Boolean(existingUser);
  if (!userExists && ['mentor', 'university'].includes(role)) {
    return res.status(403).json({ error: 'Mentor and university accounts must be provisioned by an administrator.' });
  }

  if (action === 'login' && !userExists) {
    return res.status(404).json({ error: 'Account not found. Please sign up first.' });
  }
  if (action === 'signup' && userExists) {
    return res.status(409).json({ error: 'Account already exists. Please log in.' });
  }

  const rawUser = upsertUser(normalizedEmail, name || email.split('@')[0], { role });
  
  if (role === 'admin' && rawUser.role !== 'admin') {
    return res.status(403).json({ error: 'Access Denied: Your email is not authorized for Admin access.' });
  }

  const user = hydrateUser(rawUser);
  const token = signToken(user);
  res.json({ token, user });
}));

// ─── POST /auth/admin-login ──────────────────────────────────────────────────
router.post('/admin-login', rateLimitAuth('admin-login', { emailLimit: 5, ipLimit: 20, windowMs: 15 * 60 * 1000 }), wrap(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const provisionedAdmin = db.prepare("SELECT id FROM users WHERE email = ? AND role = 'admin'").get(normalizedEmail);
  const mayBootstrapAdmin = config.ADMIN_EMAILS.includes(normalizedEmail);
  if ((!mayBootstrapAdmin && !provisionedAdmin) || !config.ADMIN_PASSWORD || password !== config.ADMIN_PASSWORD) {
    console.warn(`[Auth Security] Failed admin password attempt by ${normalizedEmail}`);
    return res.status(401).json({ error: 'Invalid admin email or password' });
  }

  const rawUser = upsertUser(normalizedEmail, normalizedEmail.split('@')[0], { role: 'admin' });
  db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(rawUser.id);
  const adminUser = db.prepare('SELECT * FROM users WHERE id = ?').get(rawUser.id);
  const user = hydrateUser(adminUser);
  const token = signToken(user);
  res.json({ token, user });
}));

// ─── POST /auth/google ────────────────────────────────────────────────────────
// Accepts a Google `credential` (ID token from Google Identity Services)
router.post('/google', wrap(async (req, res) => {
  const { credential, role } = req.body;
  if (!credential) return res.status(400).json({ error: 'credential required' });
  if (process.env.NODE_ENV === 'production' && !config.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google sign-in is not configured for this deployment.' });
  }
  if (role === 'admin') {
    return res.status(403).json({ error: 'Admin access requires the admin email and password.' });
  }

  console.log(`[Google Auth] Attempting token verification for role: ${role || 'unspecified'}`);

  // Verify the Google ID token against Google's tokeninfo service.
  let googleRes, payload;
  try {
    const token = encodeURIComponent(credential);
    const endpoints = [
      `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`,
      `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`,
    ];
    let lastError;

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          googleRes = await fetch(endpoint, { signal: controller.signal });
        } finally {
          clearTimeout(timeout);
        }
        payload = await googleRes.json();
        break;
      } catch (e) {
        lastError = e;
      }
    }

    if (!googleRes) throw lastError;
  } catch (e) {
    console.error('[Google Auth Critical Error] Network/Fetch failed:', e.message);
    return res.status(503).json({
      error: 'Google sign-in is temporarily unavailable. Check the backend network/DNS connection and try again.',
    });
  }

  if (!googleRes.ok || payload.error) {
    const errText = payload.error || `HTTP ${googleRes.status}`;
    console.error(`[Google Auth Error] Token verification failed: ${errText}`, payload);
    return res.status(401).json({ error: 'Invalid Google token: ' + errText });
  }

  // Audience validation
  if (config.GOOGLE_CLIENT_ID && payload.aud !== config.GOOGLE_CLIENT_ID) {
    console.error('[Google Auth Error] Audience mismatch:', { got: payload.aud, expected: config.GOOGLE_CLIENT_ID });
    return res.status(401).json({ error: 'Token audience mismatch' });
  }

  if (payload.email_verified === false) {
    return res.status(401).json({ error: 'Google account email is not verified.' });
  }

  const { email, name, sub: google_id, picture: avatar } = payload;

  if (!email) {
    return res.status(401).json({ error: 'Google account missing email address.' });
  }

  console.log(`[Google Auth Success] User: ${email}`);

  // Consistently lowercase email to prevent SQLite UNIQUE collisions across case-sensitivity boundaries
  const normalizedEmail = email.toLowerCase();

  if (isAdminIdentity(normalizedEmail)) {
    return res.status(403).json({ error: 'Admin accounts must sign in using the Admin option and password.' });
  }
  
  // Check if user exists for Google login (only allow login, not signup)
  let userRecord = db.prepare('SELECT role FROM users WHERE email = ?').get(normalizedEmail);
  if (!userRecord) {
    return res.status(401).json({ error: 'Account not found. Please sign up first.' });
  }
  const rawUser = upsertUser(normalizedEmail, name || email.split('@')[0], { google_id, avatar, role });
  
  if (role === 'admin' && rawUser.role !== 'admin') {
    return res.status(403).json({ error: 'Access Denied: Your email is not authorized for Admin access.' });
  }

  const user = hydrateUser(rawUser);
  const token = signToken(user);
  res.json({ token, user });
}));

// ─── PUT /auth/role ───────────────────────────────────────────────────────────
router.put('/role', wrap(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authorization required' });

  const token = authHeader.replace('Bearer ', '');
  let payload;
  try { payload = jwt.verify(token, config.JWT_SECRET); }
  catch (e) { return res.status(401).json({ error: 'Invalid token' }); }

  const { role } = req.body;
  if (!['student', 'citizen'].includes(role)) {
    return res.status(403).json({ error: 'Privileged roles must be assigned by an administrator.' });
  }

  const currentUser = db.prepare('SELECT * FROM users WHERE id=?').get(payload.id);
  if (!currentUser) return res.status(401).json({ error: 'User not found.' });
  if (!['student', 'citizen'].includes(currentUser.role)) {
    return res.status(403).json({ error: 'You cannot change a provisioned account role.' });
  }

  db.prepare('UPDATE users SET role=? WHERE id=?').run(role, currentUser.id);
  const user = hydrateUser(db.prepare('SELECT * FROM users WHERE id=?').get(currentUser.id));
  const newToken = signToken(user);
  res.json({ token: newToken, user });
}));

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
router.get('/me', wrap(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authorization required' });

  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    const user = hydrateUser(db.prepare('SELECT * FROM users WHERE id=?').get(payload.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}));

// ─── POST /auth/onboard ──────────────────────────────────────────────────────
// Called after signup/login to persist onboarding survey answers.
// Admins and mentors are excluded — they bypass onboarding entirely.
router.post('/onboard', wrap(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authorization required' });

  const token = authHeader.replace('Bearer ', '');
  let payload;
  try { payload = jwt.verify(token, config.JWT_SECRET); }
  catch (e) { return res.status(401).json({ error: 'Invalid token' }); }

  // Admins and mentors don't do onboarding
  if (payload.role === 'admin' || payload.role === 'mentor') {
    return res.status(403).json({ error: 'Onboarding does not apply to admin or mentor accounts.' });
  }

  const { use_case, profession, team_size, primary_goals, referral_source } = req.body;

  db.prepare(`
    UPDATE users SET
      onboarded = 1,
      use_case = ?,
      profession = ?,
      team_size = ?,
      primary_goals = ?,
      referral_source = ?
    WHERE id = ?
  `).run(
    use_case || null,
    profession || null,
    team_size || null,
    JSON.stringify(primary_goals || []),
    referral_source || null,
    payload.id
  );

  const user = hydrateUser(db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id));
  const newToken = signToken(user);
  res.json({ success: true, token: newToken, user });
}));

module.exports = router;
