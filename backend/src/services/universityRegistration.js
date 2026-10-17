const crypto = require('crypto');
const db = require('../db/database');

function hashRegistrationToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function getApprovedRegistration(token, email) {
  if (!token) return null;
  const registration = db.prepare(`SELECT id, email, contact_name, institution_name
    FROM university_registration_requests
    WHERE token_hash = ? AND status = 'approved' AND expires_at > ?`)
    .get(hashRegistrationToken(token), new Date().toISOString());
  if (!registration) return null;
  if (email && registration.email !== String(email).trim().toLowerCase()) return null;
  return registration;
}

function completeRegistration(token, email, userId) {
  const registration = getApprovedRegistration(token, email);
  if (!registration) throw Object.assign(new Error('University registration link has already been used.'), { code: 'REGISTRATION_LINK_USED' });
  const result = db.prepare(`UPDATE university_registration_requests
    SET status = 'registered', registered_at = datetime('now'), token_hash = NULL
    WHERE id = ? AND status = 'approved'`).run(registration.id);
  if (result.changes !== 1) {
    throw Object.assign(new Error('University registration link has already been used.'), { code: 'REGISTRATION_LINK_USED' });
  }

  const existing = db.prepare('SELECT id FROM institutions WHERE owner_user_id = ?').get(userId);
  if (!existing) {
    const institutionId = `inst_${crypto.randomUUID()}`;
    const baseSlug = registration.institution_name.toLowerCase().normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'university';
    let slug = baseSlug;
    while (db.prepare('SELECT id FROM institutions WHERE slug = ?').get(slug)) {
      slug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
    }
    db.prepare('INSERT INTO institutions (id, name, slug, owner_user_id) VALUES (?, ?, ?, ?)')
      .run(institutionId, registration.institution_name, slug, userId);
    db.prepare(`INSERT INTO institution_memberships (id, institution_id, user_id, member_type, status, is_institution_admin)
      VALUES (?, ?, ?, 'university', 'active', 1)`)
      .run(crypto.randomUUID(), institutionId, userId);
    db.prepare(`INSERT INTO authorization_audit_log (id, actor_user_id, action, resource_type, resource_id, details)
      VALUES (?, ?, 'institution.created', 'institution', ?, ?)`)
      .run(crypto.randomUUID(), userId, institutionId, JSON.stringify({ institutionId, name: registration.institution_name, source: 'admin_approved_registration' }));
  }
  return true;
}

module.exports = { hashRegistrationToken, getApprovedRegistration, completeRegistration };
