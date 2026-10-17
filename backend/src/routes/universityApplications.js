const express = require('express');
const crypto = require('crypto');
const db = require('../db/database');
const config = require('../config');
const { sendEmail } = require('../services/emailService');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/role_middleware');
const { hashRegistrationToken } = require('../services/universityRegistration');

const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(error => {
  console.error('[University Application Error]', error.message);
  res.status(500).json({ error: 'University registration request failed.' });
});

router.post('/', wrap(async (req, res) => {
  const contactName = String(req.body.contact_name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const institutionName = String(req.body.institution_name || '').trim();
  const website = String(req.body.website || '').trim();
  if (contactName.length < 2 || contactName.length > 120) {
    return res.status(400).json({ error: 'Contact name must be between 2 and 120 characters.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid institutional email address.' });
  }
  if (institutionName.length < 2 || institutionName.length > 160) {
    return res.status(400).json({ error: 'Institution name must be between 2 and 160 characters.' });
  }
  if (website.length > 240) return res.status(400).json({ error: 'Website URL is too long.' });

  const existing = db.prepare(`SELECT status FROM university_registration_requests
    WHERE email = ? AND status IN ('pending', 'approved', 'registered') ORDER BY created_at DESC LIMIT 1`).get(email);
  if (existing) return res.status(409).json({ error: 'An application for this email is already pending or approved.' });

  db.prepare(`INSERT INTO university_registration_requests
    (id, email, contact_name, institution_name, website, status)
    VALUES (?, ?, ?, ?, ?, 'pending')`)
    .run(crypto.randomUUID(), email, contactName, institutionName, website || null);
  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  let adminNotificationSent = false;
  try {
    if (!config.ADMIN_EMAILS.length) throw new Error('No administrator email recipients are configured.');
    await sendEmail({
      from: config.EMAIL_FROM,
      to: config.ADMIN_EMAILS,
      subject: `University registration request: ${institutionName}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#e6edf3;background:#0d1117;border-radius:12px"><h1 style="color:#58a6ff">SOCRATES</h1><h2>New university registration request</h2><p>A university request is waiting for your review.</p><p><strong>Institution:</strong> ${escapeHtml(institutionName)}<br><strong>Contact:</strong> ${escapeHtml(contactName)}<br><strong>Email:</strong> ${escapeHtml(email)}${website ? `<br><strong>Website:</strong> ${escapeHtml(website)}` : ''}</p><p>Open the Platform Admin → University Applications panel to approve or reject this request.</p></div>`,
    });
    adminNotificationSent = true;
  } catch (error) {
    console.error('[University Application Admin Notification Error]', error.message);
  }
  res.status(201).json({
    success: true,
    adminNotificationSent,
    message: adminNotificationSent
      ? 'Application submitted and the platform administrators have been notified. Your application remains pending until they review it.'
      : 'Application saved as pending. Admin email notification could not be delivered; administrators can still review it in the admin panel.',
  });
}));

router.get('/registration/:token', wrap(async (req, res) => {
  const registration = db.prepare(`SELECT email, contact_name, institution_name
    FROM university_registration_requests
    WHERE token_hash = ? AND status = 'approved' AND expires_at > ?`)
    .get(hashRegistrationToken(req.params.token), new Date().toISOString());
  if (!registration) return res.status(404).json({ error: 'This university sign-up link is invalid, expired, or already used.' });
  res.json({ registration });
}));

router.use('/admin', authMiddleware, requireRole('admin'));

router.get('/admin', wrap(async (req, res) => {
  const applications = db.prepare(`SELECT id, email, contact_name, institution_name, website, status, created_at
    FROM university_registration_requests ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC LIMIT 200`).all();
  res.json({ applications });
}));

router.post('/admin/:id/decision', wrap(async (req, res) => {
  const decision = String(req.body.decision || '').toLowerCase();
  if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ error: 'Decision must be approve or reject.' });
  const application = db.prepare(`SELECT * FROM university_registration_requests WHERE id = ?`).get(req.params.id);
  if (!application) return res.status(404).json({ error: 'Application not found.' });
  if (application.status !== 'pending') return res.status(409).json({ error: 'This application has already been reviewed.' });

  const auditDecision = status => db.prepare(`INSERT INTO authorization_audit_log (id, actor_user_id, action, resource_type, resource_id, details)
    VALUES (?, ?, ?, 'university_registration', ?, ?)`)
    .run(crypto.randomUUID(), req.user.id, `university.registration_${status}`, application.id, JSON.stringify({ email: application.email, institutionName: application.institution_name }));

  if (decision === 'reject') {
    const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    db.exec('BEGIN IMMEDIATE');
    try {
      const reserved = db.prepare(`UPDATE university_registration_requests SET status = 'rejected', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ? AND status = 'pending'`)
        .run(req.user.id, application.id);
      if (reserved.changes !== 1) {
        db.exec('ROLLBACK');
        return res.status(409).json({ error: 'This application has already been reviewed.' });
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    try {
      await sendEmail({
        from: config.EMAIL_FROM,
        to: application.email,
        subject: `Update on your ${application.institution_name} university registration request`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#e6edf3;background:#0d1117;border-radius:12px"><h1 style="color:#58a6ff">SOCRATES</h1><h2>University registration request update</h2><p>Hello ${escapeHtml(application.contact_name)},</p><p>Thank you for your interest in registering <strong>${escapeHtml(application.institution_name)}</strong> with SOCRATES.</p><p>After review, we are unable to approve this request at this time. No university account or institution workspace has been created.</p><p>If you believe this decision was made in error, please contact the platform administrator.</p></div>`,
      });
      auditDecision('rejected');
      return res.json({ success: true, status: 'rejected', emailSent: true, message: 'Application rejected and notification emailed to the applicant.' });
    } catch (error) {
      console.error('[University Rejection Email Error]', error.message);
      auditDecision('rejected');
      return res.json({
        success: true,
        status: 'rejected',
        emailSent: false,
        message: 'Unable to Access !! Contact ADMIN for PORTAL ACCESS',
      });
    }
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const appUrl = String(config.APP_URL || config.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const signupUrl = `${appUrl}/signup?university_token=${encodeURIComponent(token)}`;
  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  db.exec('BEGIN IMMEDIATE');
  try {
    const reserved = db.prepare(`UPDATE university_registration_requests
      SET status = 'approved', token_hash = ?, expires_at = ?, reviewed_by = ?, reviewed_at = datetime('now')
      WHERE id = ? AND status = 'pending'`)
      .run(hashRegistrationToken(token), expiresAt, req.user.id, application.id);
    if (reserved.changes !== 1) {
      db.exec('ROLLBACK');
      return res.status(409).json({ error: 'This application has already been reviewed.' });
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  try {
    await sendEmail({
      from: config.EMAIL_FROM,
      to: application.email,
      subject: `Your ${application.institution_name} university account is approved`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#e6edf3;background:#0d1117;border-radius:12px"><h1 style="color:#58a6ff">SOCRATES</h1><h2>University registration approved</h2><p>Hello ${escapeHtml(application.contact_name)},</p><p>Your request for <strong>${escapeHtml(application.institution_name)}</strong> has been approved by a platform administrator.</p><p>Use the secure link below to complete registration. This link expires in 7 days and can only be used with ${escapeHtml(application.email)}.</p><p><a href="${escapeHtml(signupUrl)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#3fb950;color:#06120a;text-decoration:none;font-weight:bold">Complete university sign-up</a></p><p style="font-size:12px;color:#8b949e">After registration, use Google sign-in or email OTP to access your account.</p></div>`,
    });
    auditDecision('approved');
    return res.json({ success: true, status: 'approved', emailSent: true, message: `Approval link emailed to ${application.email}.` });
  } catch (error) {
    console.error('[University Application Email Error]', error.message);
    auditDecision('approved');
    return res.json({
      success: true,
      status: 'approved',
      emailSent: false,
      message: 'Unable to Access !! Contact ADMIN for PORTAL ACCESS',
    });
  }
}));

module.exports = router;
