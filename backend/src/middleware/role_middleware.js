/**
 * role_middleware.js
 *
 * Authorization middleware — runs AFTER auth.js has populated req.user.
 * Never replaces or modifies auth.js.
 *
 * Provided guards:
 *   requireRole(...roles)        — 401 if not authenticated, 403 if wrong role
 *   requireProblemOwner(db)      — 401/403/404 checks on societal_problems.user_id
 *   requireAdoptionOwner(db)     — 403 if user did not create the adoption record
 */

const db = require('../db/database');

/**
 * requireRole(...allowed)
 * Accepts any number of role strings, e.g. requireRole('mentor','university').
 * Returns Express middleware that enforces:
 *   - 401 if req.user is absent (not authenticated)
 *   - 403 if req.user.role is not in the allowed list
 *
 * Roles are compared lowercase to be resilient against mixed-case values in DB.
 */
function requireRole(...allowed) {
  const allowedLower = allowed.map(r => r.toLowerCase());
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const userRole = (req.user.role || '').toLowerCase();
    if (!allowedLower.includes(userRole)) {
      return res.status(403).json({
        error: `Forbidden. Required role: ${allowed.join(' or ')}.`
      });
    }
    return next();
  };
}

/**
 * requireProblemOwner
 * Verifies that the authenticated user is the submitter of a societal problem.
 * Reads problem id from req.params.id — NEVER from req.body.
 *
 * - 401 if not authenticated
 * - 404 if problem not found
 * - 403 if problem belongs to a different user
 */
function requireProblemOwner(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const problemId = req.params.id;
  if (!problemId) {
    return res.status(400).json({ error: 'Missing problem id in URL params.' });
  }
  const row = db.prepare('SELECT user_id FROM societal_problems WHERE id = ?').get(problemId);
  if (!row) {
    return res.status(404).json({ error: 'Problem not found.' });
  }
  if (row.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: you are not the owner of this problem.' });
  }
  return next();
}

/**
 * requireAdoptionOwner
 * Verifies that the authenticated user created the adoption record.
 * Reads adoption id from req.params.adoptionId.
 */
function requireAdoptionOwner(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const adoptionId = req.params.adoptionId;
  if (!adoptionId) {
    return res.status(400).json({ error: 'Missing adoptionId in URL params.' });
  }
  const row = db.prepare('SELECT user_id FROM problem_adoptions WHERE id = ?').get(adoptionId);
  if (!row) {
    return res.status(404).json({ error: 'Adoption record not found.' });
  }
  if (row.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: you did not create this adoption record.' });
  }
  return next();
}

module.exports = { requireRole, requireProblemOwner, requireAdoptionOwner };
