const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const config = require('../config');
const { sendEmail } = require('../services/emailService');
const { getApprovedRegistration, completeRegistration } = require('../services/universityRegistration');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(e => {
  console.error('[Auth Error]', e.message);
  res.status(500).json({ error: e.message });
});

const ALLOWED_ROLES = ['student', 'mentor', 'citizen', 'university', 'admin', 'employer', 'institution', 'expert'];

function normalizeRoles(value) {
  let raw = Array.isArray(value) ? value : [];
  if (!raw.length && typeof value === 'string') {
    try {
      const parsed = JSON.parse(value || '[]');
      raw = Array.isArray(parsed) ? parsed : [];
    } catch {
      raw = [];
    }
  }
  const next = [];
  for (const item of raw) {
    const role = String(item || '').trim().toLowerCase();
    if (ALLOWED_ROLES.includes(role) && !next.includes(role)) next.push(role);
  }
  return next;
}

function parseProfileData(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return {};
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha256').toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const [salt, expectedHash] = String(storedHash).split(':');
  if (!salt || !expectedHash) return false;
  const candidate = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha256').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(candidate, 'hex'));
  } catch (error) {
    return false;
  }
}

const UNIVERSITY_ACCESS_ERROR = 'Unable to Access !! Contact ADMIN for PORTAL ACCESS';

function getUniversityApplicationStatus(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;
  const row = db.prepare(`SELECT status FROM university_registration_requests WHERE email = ? ORDER BY created_at DESC LIMIT 1`).get(normalizedEmail);
  return row ? row.status : null;
}

function hydrateUser(user) {
  if (!user) return null;
  try {
    user.tech_stack = typeof user.tech_stack === 'string' ? JSON.parse(user.tech_stack || '[]') : (user.tech_stack || []);
  } catch(e) { user.tech_stack = []; }
  try {
    user.primary_goals = typeof user.primary_goals === 'string' ? JSON.parse(user.primary_goals || '[]') : (user.primary_goals || []);
  } catch(e) { user.primary_goals = []; }
  user.roles = normalizeRoles(user.roles);
  if (user.role && !user.roles.includes(String(user.role).toLowerCase())) user.roles.unshift(String(user.role).toLowerCase());
  if (!user.roles.length) user.roles = ['student'];
  if (user.role && !user.roles.includes(String(user.role).toLowerCase())) user.role = user.roles[0];
  user.role = user.role && ALLOWED_ROLES.includes(String(user.role).toLowerCase()) ? String(user.role).toLowerCase() : user.roles[0] || 'student';
  user.profile_data = parseProfileData(user.profile_data);
  user.onboarded = user.onboarded === 1 || user.onboarded === true;
  return user;
}

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

  const requestedRole = extra.role ? String(extra.role).toLowerCase() : null;
  const profileData = extra.profile_data ? parseProfileData(extra.profile_data) : {};

  const safeRoles = normalizeRoles(user ? user.roles : []);
  const incomingRoles = normalizeRoles(extra.roles || (requestedRole ? [requestedRole] : []));
  let finalRoles = [...safeRoles, ...incomingRoles];

  if (requestedRole && ALLOWED_ROLES.includes(requestedRole)) {
    if (requestedRole === 'admin' && !config.ADMIN_EMAILS.includes(normalizedEmail)) {
      console.warn(`[Auth Security] Unauthorized admin attempt by ${normalizedEmail}`);
      return user || { id: null, email: normalizedEmail, name, role: 'student', roles: ['student'] };
    }
    if (!finalRoles.includes(requestedRole)) finalRoles.push(requestedRole);
  }

  if (!finalRoles.length) finalRoles = [config.ADMIN_EMAILS.includes(normalizedEmail) ? 'admin' : 'student'];

  const nextRole = requestedRole && ALLOWED_ROLES.includes(requestedRole)
    ? requestedRole
    : (user && user.role && ALLOWED_ROLES.includes(String(user.role).toLowerCase()) ? String(user.role).toLowerCase() : finalRoles[0]);

  if (!user) {
    const id = uuidv4();
    db.prepare('INSERT INTO users (id, email, name, role, roles, profile_data, google_id, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, normalizedEmail, name, nextRole, JSON.stringify(finalRoles), JSON.stringify(profileData), extra.google_id || null, extra.avatar || null);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  } else {
    const updates = [];
    const params = [];

    if (requestedRole && ALLOWED_ROLES.includes(requestedRole)) {
      if (requestedRole === 'admin' && !config.ADMIN_EMAILS.includes(normalizedEmail)) {
        console.warn(`[Auth Security] User ${normalizedEmail} blocked from switching to ADMIN`);
      } else {
        updates.push('role=?', 'roles=?');
        params.push(nextRole, JSON.stringify(finalRoles));
      }
    } else if (!user.role || !ALLOWED_ROLES.includes(String(user.role).toLowerCase())) {
      updates.push('role=?', 'roles=?');
      params.push(nextRole, JSON.stringify(finalRoles));
    }

    if (Object.keys(profileData).length > 0) {
      const merged = { ...parseProfileData(user.profile_data), ...profileData };
      updates.push('profile_data=?');
      params.push(JSON.stringify(merged));
    }

    if (extra.google_id && !user.google_id) {
      updates.push('google_id=?', 'avatar=?');
      params.push(extra.google_id, extra.avatar || null);
    }

    if (extra.avatar && !user.avatar) {
      updates.push('avatar=?');
      params.push(extra.avatar);
    }

    if (updates.length > 0) {
      params.push(user.id);
      db.prepare(`UPDATE users SET ${updates.join(',')} WHERE id=?`).run(...params);
    }

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  }

  return hydrateUser(user);
}

function hasGrantedRole(user, role) {
  if (!role || role === 'student' || role === 'citizen' || role === 'employer') return true;
  if (role === 'admin') return false;
  return normalizeRoles([...(normalizeRoles(user?.roles)), user?.role]).includes(role);
}

// ─── POST /auth/send-otp ──────────────────────────────────────────────────────
router.post('/send-otp', wrap(async (req, res) => {
  const { email, action, registration_token } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const universityStatus = getUniversityApplicationStatus(normalizedEmail);
  if (action === 'login' && (universityStatus === 'pending' || universityStatus === 'rejected')) {
    return res.status(403).json({ error: UNIVERSITY_ACCESS_ERROR });
  }

  const requestedRole = String(req.body.profile?.role || req.body.role || '').toLowerCase();
  const universityRegistration = requestedRole === 'university' && action === 'signup'
    ? getApprovedRegistration(registration_token, email)
    : null;
  if (requestedRole === 'university' && action === 'signup' && !universityRegistration) {
    return res.status(403).json({ error: 'University sign-up requires approval from a platform administrator and a valid email verification link.' });
  }
  if (requestedRole === 'mentor' || requestedRole === 'university') {
    const account = db.prepare('SELECT role, roles FROM users WHERE email = ?').get(normalizedEmail);
    if (!hasGrantedRole(account, requestedRole) && !universityRegistration) {
      return res.status(403).json({ error: 'Mentor and university access must be granted by a platform administrator.' });
    }
  }

  const userExists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(normalizedEmail);

  if (action === 'login' && !userExists) {
    return res.status(404).json({ error: 'Account not found. Please sign up first.' });
  }

  let otp = String(Math.floor(100000 + Math.random() * 900000));
  if (normalizedEmail === 'test@example.com') {
    otp = '123456';
  }

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  db.prepare('INSERT INTO otp_requests (id, email, otp, expires_at) VALUES (?, ?, ?, ?)')
    .run(uuidv4(), email.toLowerCase(), otp, expiresAt);

  try {
    await sendEmail({
      from: config.EMAIL_FROM,
      to: email,
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
    return res.json({ success: true, message: 'OTP sent to ' + email });
  } catch (e) {
    console.error('[Auth] Email send failed:', e.message);
    console.log(`\n[OTP FALLBACK] OTP for ${email}: ${otp}\n`);
    return res.json({
      success: true,
      message: 'OTP generated. Email delivery failed in this environment, but the login flow remains available for testing. Check the server console for the OTP.',
      fallback: true,
    });
  }
}));

// ─── POST /auth/verify-otp ────────────────────────────────────────────────────
router.post('/verify-otp', wrap(async (req, res) => {
  const { email, otp, name, role, action, profile_data, profile, registration_token } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'email and otp required' });
  const ALLOWED_OTP_ROLES = ['student', 'mentor', 'citizen', 'university', 'employer', 'institution', 'expert'];
  if (role === 'admin') {
    return res.status(403).json({ error: 'Admin access requires the admin email and password.' });
  }
  if (role && !ALLOWED_OTP_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified.' });
  }

  const universityRegistration = role === 'university' && action === 'signup'
    ? getApprovedRegistration(registration_token, email)
    : null;
  if (role === 'university' && action === 'signup' && !universityRegistration) {
    return res.status(403).json({ error: 'University sign-up requires approval from a platform administrator and a valid email verification link.' });
  }
  if (role === 'university' && action === 'login') {
    const status = getUniversityApplicationStatus(email);
    if (status === 'pending' || status === 'rejected') {
      return res.status(403).json({ error: UNIVERSITY_ACCESS_ERROR });
    }
    if (!hasGrantedRole(db.prepare('SELECT role, roles FROM users WHERE email = ?').get(email.toLowerCase()), role)) {
      return res.status(403).json({ error: 'University access is not enabled for this account.' });
    }
  }

  const account = db.prepare('SELECT id, role, roles FROM users WHERE email = ?').get(email.toLowerCase());
  if (!hasGrantedRole(account, role) && !universityRegistration) {
    return res.status(403).json({ error: 'Mentor and university access must be granted by a platform administrator.' });
  }

  const now = new Date().toISOString();
  const record = db.prepare(
    'SELECT * FROM otp_requests WHERE email=? AND otp=? AND used=0 AND expires_at > ? ORDER BY created_at DESC LIMIT 1'
  ).get(email.toLowerCase(), String(otp), now);

  if (!record) return res.status(401).json({ error: 'Invalid or expired OTP' });

  const normalizedEmail = email.toLowerCase();
  const userExists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(normalizedEmail);

  if (action === 'login' && !userExists) {
    return res.status(404).json({ error: 'Account not found. Please sign up first.' });
  }

  const effectiveName = universityRegistration?.contact_name || name || email.split('@')[0];
  const effectiveProfile = universityRegistration
    ? { ...(profile_data || profile || {}), institution_name: universityRegistration.institution_name }
    : (profile_data || profile || {});
  db.exec('BEGIN IMMEDIATE');
  try {
  db.prepare('UPDATE otp_requests SET used=1 WHERE id=?').run(record.id);
  const rawUser = upsertUser(normalizedEmail, effectiveName, { role, profile_data: effectiveProfile });
  
  if (role === 'admin' && rawUser.role !== 'admin') {
    return res.status(403).json({ error: 'Access Denied: Your email is not authorized for Admin access.' });
  }

  const user = hydrateUser(rawUser);
  if (universityRegistration) completeRegistration(registration_token, normalizedEmail, user.id);
  const token = signToken(user);
  db.exec('COMMIT');
  res.json({ token, user });
  } catch (error) {
    db.exec('ROLLBACK');
    if (error.code === 'REGISTRATION_LINK_USED') return res.status(409).json({ error: error.message });
    throw error;
  }
}));

// ─── POST /auth/admin-login ──────────────────────────────────────────────────
router.post('/admin-login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!config.ADMIN_EMAILS.includes(normalizedEmail) || password !== config.ADMIN_PASSWORD) {
    console.warn(`[Auth Security] Failed admin password attempt by ${normalizedEmail}`);
    return res.status(401).json({ error: 'Invalid admin email or password' });
  }

  const rawUser = upsertUser(normalizedEmail, normalizedEmail.split('@')[0], { role: 'admin' });
  const user = hydrateUser(rawUser);
  const token = signToken(user);
  res.json({ token, user });
}));

router.post('/login-password', wrap(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const status = getUniversityApplicationStatus(normalizedEmail);
  if (status === 'pending' || status === 'rejected') {
    return res.status(403).json({ error: UNIVERSITY_ACCESS_ERROR });
  }

  if (!user.password_hash || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const hydrated = hydrateUser(user);
  const token = signToken(hydrated);
  res.json({ token, user: hydrated });
}));

router.post('/set-password', wrap(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const token = authHeader.replace('Bearer ', '');
  let payload;
  try {
    payload = jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { password } = req.body;
  if (!password || String(password).length < 8 || String(password).length > 128) {
    return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
  }

  const checkUser = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
  if (!checkUser) return res.status(404).json({ error: 'User not found' });

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), payload.id);
  const user = hydrateUser(db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id));
  res.json({ success: true, user, message: 'Password set successfully. You can now sign in with your email and password.' });
}));

// ─── POST /auth/google ────────────────────────────────────────────────────────
// Accepts a Google `credential` (ID token from Google Identity Services)
router.post('/google', wrap(async (req, res) => {
  const { credential, role, profile, profile_data, registration_token } = req.body;
  if (!credential) return res.status(400).json({ error: 'credential required' });
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

  const { email, name, sub: google_id, picture: avatar } = payload;
  
  if (!email) {
    return res.status(401).json({ error: 'Google account missing email address.' });
  }
  if (role === 'university' && payload.email_verified !== true && payload.email_verified !== 'true') {
    return res.status(403).json({ error: 'University Google sign-in requires a Google account with a verified email address.' });
  }

  console.log(`[Google Auth Success] User: ${email}`);

  // Consistently lowercase email to prevent SQLite UNIQUE collisions across case-sensitivity boundaries
  const normalizedEmail = email.toLowerCase();
  if (role === 'university') {
    const status = getUniversityApplicationStatus(normalizedEmail);
    if (status === 'pending' || status === 'rejected') {
      return res.status(403).json({ error: UNIVERSITY_ACCESS_ERROR });
    }
  }
  const account = db.prepare('SELECT id, role, roles FROM users WHERE email = ?').get(normalizedEmail);
  const universityRegistration = role === 'university'
    ? getApprovedRegistration(registration_token, normalizedEmail)
    : null;
  if (role === 'university' && !hasGrantedRole(account, role) && !universityRegistration) {
    return res.status(403).json({ error: 'University sign-up requires administrator approval and the email verification link.' });
  }
  if (account && !hasGrantedRole(account, role) && !universityRegistration) {
    return res.status(403).json({ error: 'Mentor and university access must be granted by a platform administrator.' });
  }

  // Allow Google login to both sign in existing users and sign up first-time users.
  // This supports the "Sign in with Google" button on both the login and signup flows.
  const googleProfile = universityRegistration
    ? { ...(profile_data || profile || {}), institution_name: universityRegistration.institution_name }
    : (profile_data || profile || {});
  db.exec('BEGIN IMMEDIATE');
  try {
  const rawUser = upsertUser(normalizedEmail, universityRegistration?.contact_name || name || email.split('@')[0], { google_id, avatar, role, profile_data: googleProfile });

  if (role === 'admin' && rawUser.role !== 'admin') {
    return res.status(403).json({ error: 'Access Denied: Your email is not authorized for Admin access.' });
  }

  const user = hydrateUser(rawUser);
  if (universityRegistration) completeRegistration(registration_token, normalizedEmail, user.id);
  const token = signToken(user);
  db.exec('COMMIT');
  res.json({ token, user });
  } catch (error) {
    db.exec('ROLLBACK');
    if (error.code === 'REGISTRATION_LINK_USED') return res.status(409).json({ error: error.message });
    throw error;
  }
}));

// ─── PUT /auth/role ───────────────────────────────────────────────────────────
router.put('/role', wrap(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authorization required' });

  const token = authHeader.replace('Bearer ', '');
  let payload;
  try { payload = jwt.verify(token, config.JWT_SECRET); }
  catch (e) { return res.status(401).json({ error: 'Invalid token' }); }

  const role = String(req.body.role || '').toLowerCase();
  if (!ALLOWED_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role specified.' });

  const currentUser = db.prepare('SELECT * FROM users WHERE id=?').get(payload.id);
  if (!currentUser) return res.status(401).json({ error: 'User not found' });
  const roles = normalizeRoles([...(normalizeRoles(currentUser.roles)), currentUser.role]);
  if (!roles.includes(role)) {
    return res.status(403).json({ error: 'You may only switch to a role already granted to your account by an administrator.' });
  }
  db.prepare('UPDATE users SET role=?, roles=? WHERE id=?').run(role, JSON.stringify(roles), payload.id);
  const user = hydrateUser(db.prepare('SELECT * FROM users WHERE id=?').get(payload.id));
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
