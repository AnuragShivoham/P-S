const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const mediaService = require('../services/mediaService');
const { requireRole, requireProblemOwner } = require('../middleware/role_middleware');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(e => {
  console.error('[Problems Route Error]', e.message);
  res.status(500).json({ error: e.message });
});

/**
 * Privacy location masking helper.
 * Masks coordinates according to citizen's chosen privacy level:
 * - 'exact': returns exact coordinates and full address.
 * - 'locality': returns locality/town, district, state, country; coordinates rounded to 2 decimals (~1.1km).
 * - 'district': returns only district, state, country; coordinates omitted.
 * - 'approximate': returns state, country; coordinates omitted.
 */
function maskLocation(loc, privacyLevel, isAuthorOrAdmin = false) {
  if (!loc) return null;
  if (isAuthorOrAdmin || privacyLevel === 'exact') {
    return { ...loc };
  }
  if (privacyLevel === 'locality') {
    return {
      formatted_address: loc.formatted_address ? loc.formatted_address.split(',').slice(1).join(',').trim() : '',
      district: loc.district,
      state: loc.state,
      country: loc.country,
      latitude: loc.latitude ? Number(loc.latitude.toFixed(2)) : null,
      longitude: loc.longitude ? Number(loc.longitude.toFixed(2)) : null,
      privacy_level: privacyLevel
    };
  }
  if (privacyLevel === 'district') {
    return {
      district: loc.district,
      state: loc.state,
      country: loc.country,
      latitude: null,
      longitude: null,
      privacy_level: privacyLevel
    };
  }
  // approximate
  return {
    state: loc.state,
    country: loc.country,
    latitude: null,
    longitude: null,
    privacy_level: privacyLevel
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /my — Citizen: list my submitted problems
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my', wrap(async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

  const { page = 1, limit = 20 } = req.query;
  const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const parsedPage = Math.max(parseInt(page) || 1, 1);
  const offset = (parsedPage - 1) * parsedLimit;

  const totalRow = db.prepare(
    'SELECT COUNT(*) as total FROM societal_problems WHERE user_id = ?'
  ).get(req.user.id);

  const rows = db.prepare(`
    SELECT
      p.*,
      c.name as category_name, c.slug as category_slug, c.icon as category_icon,
      loc.district, loc.state, loc.country,
      (SELECT COUNT(*) FROM problem_media WHERE problem_id = p.id) as media_count,
      (SELECT id FROM projects WHERE problem_id = p.id LIMIT 1) as linked_project_id
    FROM societal_problems p
    LEFT JOIN problem_categories c ON p.category_id = c.id
    LEFT JOIN problem_locations loc ON loc.problem_id = p.id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, parsedLimit, offset);

  const problems = rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    problem_type: r.problem_type,
    category_name: r.category_name,
    category_slug: r.category_slug,
    category_icon: r.category_icon,
    status: r.status,
    urgency: r.urgency,
    severity: r.severity,
    people_affected: r.people_affected,
    geographic_scope: r.geographic_scope,
    location: { district: r.district, state: r.state, country: r.country },
    media_count: r.media_count || 0,
    has_adopted_project: !!r.linked_project_id,
    linked_project_id: r.linked_project_id,
    created_at: r.created_at,
    updated_at: r.updated_at
  }));

  res.json({
    problems,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total: totalRow ? totalRow.total : 0,
      pages: Math.ceil((totalRow ? totalRow.total : 0) / parsedLimit)
    }
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /my/stats — Citizen: dashboard summary statistics
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my/stats', wrap(async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

  const uid = req.user.id;

  const total = db.prepare('SELECT COUNT(*) as c FROM societal_problems WHERE user_id = ?').get(uid).c;
  const published = db.prepare("SELECT COUNT(*) as c FROM societal_problems WHERE user_id = ? AND status = 'PUBLISHED'").get(uid).c;
  const adopted = db.prepare('SELECT COUNT(*) as c FROM societal_problems sp JOIN projects pr ON pr.problem_id = sp.id WHERE sp.user_id = ?').get(uid).c;
  const underReview = db.prepare("SELECT COUNT(*) as c FROM societal_problems WHERE user_id = ? AND status IN ('SUBMITTED','REVIEW_REQUIRED','APPROVED')").get(uid).c;

  res.json({ total, published, adopted, under_review: underReview });
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /categories — List all active problem categories
// ─────────────────────────────────────────────────────────────────────────────
router.get('/categories', wrap(async (req, res) => {
  const categories = db.prepare('SELECT * FROM problem_categories WHERE is_active = 1 ORDER BY name ASC').all();
  res.json({ categories });
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET / — List published / discoverable societal problems
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', wrap(async (req, res) => {
  const {
    category,
    problem_type,
    district,
    urgency,
    severity,
    status = 'PUBLISHED',
    search = '',
    sort = 'newest',
    page = 1,
    limit = 20
  } = req.query;

  const conditions = [];
  const params = [];

  // Filter by status (default is PUBLISHED for public marketplace)
  if (status === 'all') {
    // Admin or mentor browsing all non-archived
    conditions.push("p.status != 'ARCHIVED'");
  } else if (status) {
    conditions.push("p.status = ?");
    params.push(status);
  }

  if (category) {
    conditions.push("(p.category_id = ? OR c.slug = ?)");
    params.push(category, category);
  }

  if (problem_type) {
    conditions.push("p.problem_type = ?");
    params.push(problem_type);
  }

  if (urgency) {
    conditions.push("p.urgency = ?");
    params.push(urgency);
  }

  if (severity) {
    conditions.push("p.severity = ?");
    params.push(severity);
  }

  if (district) {
    conditions.push("loc.district LIKE ?");
    params.push(`%${district}%`);
  }

  if (search && search.trim()) {
    conditions.push("(p.title LIKE ? OR p.description LIKE ? OR p.problem_type LIKE ?)");
    const queryTerm = `%${search.trim()}%`;
    params.push(queryTerm, queryTerm, queryTerm);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  let orderBy = 'p.created_at DESC';
  if (sort === 'urgency') {
    orderBy = "CASE p.urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END ASC, p.created_at DESC";
  } else if (sort === 'severity') {
    orderBy = "CASE p.severity WHEN 'catastrophic' THEN 1 WHEN 'severe' THEN 2 WHEN 'moderate' THEN 3 ELSE 4 END ASC, p.created_at DESC";
  } else if (sort === 'oldest') {
    orderBy = 'p.created_at ASC';
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const parsedPage = Math.max(parseInt(page) || 1, 1);
  const offset = (parsedPage - 1) * parsedLimit;

  const totalRow = db.prepare(`
    SELECT COUNT(DISTINCT p.id) as total
    FROM societal_problems p
    LEFT JOIN problem_categories c ON p.category_id = c.id
    LEFT JOIN problem_locations loc ON loc.problem_id = p.id
    ${whereClause}
  `).get(...params);

  const total = totalRow ? totalRow.total : 0;

  const rows = db.prepare(`
    SELECT 
      p.*,
      c.name as category_name,
      c.slug as category_slug,
      c.icon as category_icon,
      u.name as submitter_name,
      u.role as submitter_role,
      loc.district,
      loc.state,
      loc.country,
      (SELECT COUNT(*) FROM problem_media WHERE problem_id = p.id) as media_count,
      (SELECT storage_path FROM problem_media WHERE problem_id = p.id AND media_type = 'image' LIMIT 1) as thumbnail_path,
      (SELECT confidence FROM problem_ai_analysis WHERE problem_id = p.id) as ai_confidence,
      (SELECT required_skills FROM problem_ai_analysis WHERE problem_id = p.id) as required_skills,
      (SELECT id FROM projects WHERE problem_id = p.id LIMIT 1) as linked_project_id
    FROM societal_problems p
    LEFT JOIN problem_categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN problem_locations loc ON loc.problem_id = p.id
    ${whereClause}
    GROUP BY p.id
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, parsedLimit, offset);

  const problems = rows.map(r => {
    let parsedSkills = [];
    try {
      parsedSkills = typeof r.required_skills === 'string' ? JSON.parse(r.required_skills) : (r.required_skills || []);
    } catch (e) {
      parsedSkills = [];
    }

    return {
      id: r.id,
      title: r.title,
      description: r.description,
      problem_type: r.problem_type,
      category_id: r.category_id,
      category_name: r.category_name,
      category_slug: r.category_slug,
      category_icon: r.category_icon,
      status: r.status,
      urgency: r.urgency,
      severity: r.severity,
      people_affected: r.people_affected,
      geographic_scope: r.geographic_scope,
      expected_impact: r.expected_impact,
      location: {
        district: r.district,
        state: r.state,
        country: r.country
      },
      submitter: {
        name: r.submitter_name,
        role: r.submitter_role
      },
      media_count: r.media_count,
      thumbnail_path: r.thumbnail_path,
      ai_confidence: r.ai_confidence || 0.0,
      required_skills: parsedSkills,
      has_adopted_project: !!r.linked_project_id,
      linked_project_id: r.linked_project_id,
      created_at: r.created_at,
      updated_at: r.updated_at
    };
  });

  res.json({
    problems,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      pages: Math.ceil(total / parsedLimit)
    }
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST / — Submit a new societal problem (Citizen only; admin bypass)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requireRole('citizen', 'admin'), wrap(async (req, res) => {
  const {
    title,
    description,
    problem_type,
    category_id,
    urgency = 'medium',
    severity = 'medium',
    people_affected = '',
    geographic_scope = 'local',
    privacy_level = 'locality',
    expected_impact = '',
    structured_impact = {},
    location = null,
    media = []
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Problem title is required.' });
  }
  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'Problem description is required.' });
  }
  if (!problem_type || !problem_type.trim()) {
    return res.status(400).json({ error: 'Problem type is required.' });
  }

  // Ensure category_id exists or map by slug/type
  let resolvedCatId = category_id;
  if (!resolvedCatId) {
    const matchCat = db.prepare('SELECT id FROM problem_categories WHERE name LIKE ? OR slug LIKE ? LIMIT 1')
      .get(`%${problem_type}%`, `%${problem_type.toLowerCase()}%`);
    resolvedCatId = matchCat ? matchCat.id : 'cat_other';
  }

  const problemId = `prob_${uuidv4()}`;
  const userId = req.user ? req.user.id : 'anon_citizen';

  db.prepare(`
    INSERT INTO societal_problems (
      id, user_id, title, description, problem_type, category_id,
      status, urgency, severity, people_affected, geographic_scope,
      privacy_level, expected_impact, structured_impact, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    problemId,
    userId,
    title.trim(),
    description.trim(),
    problem_type.trim(),
    resolvedCatId,
    'SUBMITTED',
    urgency,
    severity,
    people_affected,
    geographic_scope,
    privacy_level,
    expected_impact,
    JSON.stringify(structured_impact || {})
  );

  // Insert location record if provided
  if (location && typeof location === 'object') {
    db.prepare(`
      INSERT INTO problem_locations (
        id, problem_id, latitude, longitude, formatted_address,
        district, state, country, privacy_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `loc_${uuidv4()}`,
      problemId,
      location.latitude || null,
      location.longitude || null,
      location.formatted_address || location.address || '',
      location.district || '',
      location.state || '',
      location.country || 'India',
      privacy_level
    );
  }

  // Insert media references if provided
  if (Array.isArray(media) && media.length > 0) {
    const insertMediaStmt = db.prepare(`
      INSERT INTO problem_media (
        id, problem_id, media_type, file_name, original_name,
        mime_type, size_bytes, storage_path, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    for (const m of media) {
      if (!m) continue;
      let fileName = m.file_name || 'attachment.jpg';
      let originalName = m.original_name || m.file_name || m.caption || 'upload';
      let mimeType = m.mime_type || (m.type === 'video' ? 'video/mp4' : 'image/jpeg');
      let sizeBytes = m.size_bytes || 0;
      let storagePath = m.storage_path || fileName;

      const rawPayload = m.data_base64 || m.dataBase64 || m.data_url || m.dataUrl;
      if (rawPayload) {
        let base64Data = rawPayload;
        if (typeof rawPayload === 'string' && rawPayload.includes(',')) {
          const parts = rawPayload.split(',');
          const match = parts[0].match(/:(.*?);/);
          if (match) mimeType = match[1];
          base64Data = parts[1];
        }

        try {
          const saved = mediaService.saveMedia({
            originalName,
            mimeType,
            dataBase64: base64Data,
            mediaType: m.media_type || m.type
          });
          fileName = saved.fileName;
          originalName = saved.originalName;
          mimeType = saved.mimeType;
          sizeBytes = saved.sizeBytes;
          storagePath = saved.storagePath;
        } catch (err) {
          console.warn('[Problems] Media save skipped:', err.message);
          continue;
        }
      }

      insertMediaStmt.run(
        `med_${uuidv4()}`,
        problemId,
        m.media_type || (mimeType.startsWith('video/') ? 'video' : 'image'),
        fileName,
        originalName,
        mimeType,
        sizeBytes,
        storagePath
      );
    }
  }

  // Fetch newly created record
  const created = db.prepare('SELECT * FROM societal_problems WHERE id = ?').get(problemId);
  const locRecord = db.prepare('SELECT * FROM problem_locations WHERE problem_id = ?').get(problemId);
  const mediaRecords = db.prepare('SELECT * FROM problem_media WHERE problem_id = ?').all(problemId);

  res.status(201).json({
    message: 'Societal problem submitted successfully.',
    problem: {
      ...created,
      location: locRecord,
      media: mediaRecords
    }
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /:id — Get problem details
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', wrap(async (req, res) => {
  const problemId = req.params.id;
  const problem = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug, c.icon as category_icon,
           u.name as submitter_name, u.role as submitter_role
    FROM societal_problems p
    LEFT JOIN problem_categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `).get(problemId);

  if (!problem) {
    return res.status(404).json({ error: 'Problem not found.' });
  }

  const isAuthor = req.user && req.user.id === problem.user_id;
  const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'mentor');

  // Location with privacy filtering
  const rawLoc = db.prepare('SELECT * FROM problem_locations WHERE problem_id = ?').get(problemId);
  const location = maskLocation(rawLoc, problem.privacy_level, isAuthor || isAdmin);

  // Media
  const media = db.prepare('SELECT id, media_type, file_name, original_name, mime_type, size_bytes, created_at FROM problem_media WHERE problem_id = ?').all(problemId);

  // AI Analysis
  const aiAnalysis = db.prepare('SELECT * FROM problem_ai_analysis WHERE problem_id = ?').get(problemId);
  let parsedAi = null;
  if (aiAnalysis) {
    parsedAi = {
      ...aiAnalysis,
      secondary_categories: JSON.parse(aiAnalysis.secondary_categories || '[]'),
      affected_stakeholders: JSON.parse(aiAnalysis.affected_stakeholders || '[]'),
      root_causes: JSON.parse(aiAnalysis.root_causes || '[]'),
      key_requirements: JSON.parse(aiAnalysis.key_requirements || '[]'),
      constraints: JSON.parse(aiAnalysis.constraints || '[]'),
      potential_solution_domains: JSON.parse(aiAnalysis.potential_solution_domains || '[]'),
      required_skills: JSON.parse(aiAnalysis.required_skills || '[]'),
      recommended_team_roles: JSON.parse(aiAnalysis.recommended_team_roles || '[]'),
      technology_domains: JSON.parse(aiAnalysis.technology_domains || '[]')
    };
  }

  // Linked Project
  const linkedProject = db.prepare('SELECT id, title, status, created_at FROM projects WHERE problem_id = ? LIMIT 1').get(problemId);

  // Student Interests
  const interestsCount = db.prepare('SELECT COUNT(*) as c FROM problem_interests WHERE problem_id = ?').get(problemId).c;
  const userHasExpressedInterest = req.user ? !!db.prepare('SELECT id FROM problem_interests WHERE problem_id = ? AND user_id = ?').get(problemId, req.user.id) : false;

  // Duplicates (only shown to admin or mentor reviewers)
  let duplicates = [];
  if (isAdmin) {
    duplicates = db.prepare(`
      SELECT d.*, p.title as matched_title, p.status as matched_status
      FROM problem_duplicates d
      JOIN societal_problems p ON d.matched_problem_id = p.id
      WHERE d.problem_id = ?
    `).all(problemId);
  }

  res.json({
    problem: {
      ...problem,
      structured_impact: JSON.parse(problem.structured_impact || '{}'),
      location,
      media,
      ai_analysis: parsedAi,
      linked_project: linkedProject || null,
      interests_count: interestsCount,
      user_has_expressed_interest: userHasExpressedInterest,
      duplicates
    }
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /:id — Update problem (owner or admin)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id', requireRole('citizen', 'admin', 'mentor', 'university'), wrap(async (req, res) => {
  const problemId = req.params.id;
  const problem = db.prepare('SELECT * FROM societal_problems WHERE id = ?').get(problemId);
  if (!problem) return res.status(404).json({ error: 'Problem not found.' });

  const isAuthor = req.user && req.user.id === problem.user_id;
  const isAdmin = req.user && req.user.role === 'admin';

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({ error: 'Not authorized to edit this problem.' });
  }

  // Citizens cannot edit problems that have been published or adopted
  if (isAuthor && !isAdmin) {
    const LOCKED_STATUSES = ['PUBLISHED', 'ADOPTED'];
    if (LOCKED_STATUSES.includes(problem.status)) {
      return res.status(403).json({ error: 'This problem is published and can no longer be edited by the submitter.' });
    }
    const linkedProject = db.prepare('SELECT id FROM projects WHERE problem_id = ? LIMIT 1').get(problemId);
    if (linkedProject) {
      return res.status(403).json({ error: 'This problem has been adopted into an active project and can no longer be edited.' });
    }
  }

  const {
    title = problem.title,
    description = problem.description,
    problem_type = problem.problem_type,
    category_id = problem.category_id,
    urgency = problem.urgency,
    severity = problem.severity,
    people_affected = problem.people_affected,
    geographic_scope = problem.geographic_scope,
    privacy_level = problem.privacy_level,
    expected_impact = problem.expected_impact,
    status = problem.status
  } = req.body;

  db.prepare(`
    UPDATE societal_problems SET
      title = ?, description = ?, problem_type = ?, category_id = ?,
      urgency = ?, severity = ?, people_affected = ?, geographic_scope = ?,
      privacy_level = ?, expected_impact = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title, description, problem_type, category_id,
    urgency, severity, people_affected, geographic_scope,
    privacy_level, expected_impact, status, problemId
  );

  const updated = db.prepare('SELECT * FROM societal_problems WHERE id = ?').get(problemId);
  res.json({ problem: updated });
}));

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /:id — Delete problem (owner or admin)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', requireRole('citizen', 'admin'), wrap(async (req, res) => {
  const problemId = req.params.id;
  const problem = db.prepare('SELECT * FROM societal_problems WHERE id = ?').get(problemId);
  if (!problem) return res.status(404).json({ error: 'Problem not found.' });

  const isAuthor = req.user && req.user.id === problem.user_id;
  const isAdmin = req.user && req.user.role === 'admin';

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({ error: 'Not authorized to delete this problem.' });
  }

  // Citizens cannot delete problems that have been published or adopted
  if (isAuthor && !isAdmin) {
    const linkedProject = db.prepare('SELECT id FROM projects WHERE problem_id = ? LIMIT 1').get(problemId);
    if (linkedProject || ['PUBLISHED', 'ADOPTED'].includes(problem.status)) {
      return res.status(403).json({ error: 'Published or adopted problems cannot be deleted by the submitter.' });
    }
  }

  db.prepare('DELETE FROM societal_problems WHERE id = ?').run(problemId);
  res.json({ success: true, message: 'Problem deleted successfully.' });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /:id/analyze — Trigger or re-run AI problem intelligence
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/analyze', wrap(async (req, res) => {
  const problemIntelligence = require('../engines/problemIntelligence');
  const result = await problemIntelligence.analyzeProblem(req.params.id);
  res.json({
    message: 'Problem analyzed successfully',
    ...result
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /:id/review — Review problem (Admin or Mentor)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/review', wrap(async (req, res) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'mentor')) {
    return res.status(403).json({ error: 'Review permission required.' });
  }

  const { verdict, notes = '' } = req.body;
  if (!verdict || !['approved', 'rejected', 'needs_clarification'].includes(verdict)) {
    return res.status(400).json({ error: 'Verdict must be approved, rejected, or needs_clarification.' });
  }

  const problemId = req.params.id;
  const problem = db.prepare('SELECT * FROM societal_problems WHERE id = ?').get(problemId);
  if (!problem) return res.status(404).json({ error: 'Problem not found' });

  let nextStatus = 'REVIEW_REQUIRED';
  if (verdict === 'approved') nextStatus = 'APPROVED';
  else if (verdict === 'rejected') nextStatus = 'REJECTED';
  else if (verdict === 'needs_clarification') nextStatus = 'NEEDS_CLARIFICATION';

  db.prepare(`
    INSERT INTO problem_reviews (id, problem_id, reviewer_id, verdict, review_notes, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(`rev_${uuidv4()}`, problemId, req.user.id, verdict, notes);

  db.prepare("UPDATE societal_problems SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(nextStatus, problemId);

  res.json({
    success: true,
    message: `Problem review saved: ${verdict}`,
    status: nextStatus
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /:id/publish — Publish approved problem to marketplace
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/publish', wrap(async (req, res) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'mentor')) {
    return res.status(403).json({ error: 'Publish permission required.' });
  }

  const problemId = req.params.id;
  const problem = db.prepare('SELECT * FROM societal_problems WHERE id = ?').get(problemId);
  if (!problem) return res.status(404).json({ error: 'Problem not found' });

  db.prepare("UPDATE societal_problems SET status = 'PUBLISHED', updated_at = datetime('now') WHERE id = ?")
    .run(problemId);

  res.json({
    success: true,
    message: 'Problem published to marketplace successfully',
    status: 'PUBLISHED'
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /:id/interest — Student expresses interest in working on problem
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/interest', wrap(async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  const problemId = req.params.id;
  const { role_preference = 'developer', note = '' } = req.body;

  const existing = db.prepare('SELECT id FROM problem_interests WHERE problem_id = ? AND user_id = ?')
    .get(problemId, req.user.id);

  if (existing) {
    db.prepare('UPDATE problem_interests SET role_preference = ?, note = ?, updated_at = datetime("now") WHERE id = ?')
      .run(role_preference, note, existing.id);
  } else {
    db.prepare(`
      INSERT INTO problem_interests (id, problem_id, user_id, role_preference, note, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).run(`int_${uuidv4()}`, problemId, req.user.id, role_preference, note);
  }

  res.json({ success: true, message: 'Interest registered successfully' });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /:id/adopt — Record adoption intent (Milestone R5a)
// Separate from /create-project: adoption does NOT auto-create a project.
// Only mentor / university / admin may adopt.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/adopt', requireRole('mentor', 'university', 'admin'), wrap(async (req, res) => {
  const problemId = req.params.id;
  const problem = db.prepare('SELECT * FROM societal_problems WHERE id = ?').get(problemId);
  if (!problem) return res.status(404).json({ error: 'Problem not found.' });

  // Prevent re-adoption by the same user
  const existing = db.prepare(
    'SELECT id FROM problem_adoptions WHERE problem_id = ? AND user_id = ?'
  ).get(problemId, req.user.id);
  if (existing) {
    return res.json({ message: 'You have already adopted this problem.', adoptionId: existing.id, alreadyAdopted: true });
  }

  const adoptionId = db.prepare(`
    INSERT INTO problem_adoptions (problem_id, user_id, role, status, created_at)
    VALUES (?, ?, ?, 'pending', datetime('now'))
  `).run(problemId, req.user.id, req.user.role);

  // Update problem status to ADOPTED if not already
  if (!['ADOPTED', 'PUBLISHED'].includes(problem.status)) {
    db.prepare("UPDATE societal_problems SET adopted_by = ?, status = 'ADOPTED', updated_at = datetime('now') WHERE id = ?")
      .run(req.user.id, problemId);
  }

  res.status(201).json({
    message: 'Problem adoption recorded. Use /create-project to start the engineering workflow.',
    adoptionId: adoptionId.lastInsertRowid,
    problemId
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /:id/adoptions — List adoption records for a problem (mentor/admin view)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/adoptions', requireRole('mentor', 'university', 'admin'), wrap(async (req, res) => {
  const problemId = req.params.id;
  const adoptions = db.prepare(`
    SELECT pa.*, u.name as adopter_name, u.email as adopter_email
    FROM problem_adoptions pa
    JOIN users u ON pa.user_id = u.id
    WHERE pa.problem_id = ?
    ORDER BY pa.created_at DESC
  `).all(problemId);
  res.json({ adoptions });
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /:id/ai-categories — List AI category suggestions for a problem
// Visible to mentor/university/admin for review
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/ai-categories', requireRole('mentor', 'university', 'admin'), wrap(async (req, res) => {
  const problemId = req.params.id;
  const suggestions = db.prepare(`
    SELECT pac.*, pc.name as canonical_category_name
    FROM problem_ai_categories pac
    LEFT JOIN problem_categories pc ON pac.category_id = pc.id
    WHERE pac.problem_id = ?
    ORDER BY pac.rank ASC, pac.confidence DESC
  `).all(problemId);
  res.json({ suggestions });
}));

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /:id/ai-categories/:catId — Accept or reject an AI category suggestion
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/ai-categories/:catId', requireRole('mentor', 'university', 'admin'), wrap(async (req, res) => {
  const { catId } = req.params;
  const { status, category_id } = req.body; // status: APPROVED | REJECTED
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'status must be APPROVED or REJECTED.' });
  }
  const updateFields = ['status = ?', 'reviewed_at = datetime(\'now\')', 'reviewed_by = ?'];
  const params = [status, req.user.id];
  if (status === 'APPROVED' && category_id) {
    updateFields.push('category_id = ?');
    params.push(category_id);
  }
  params.push(catId);
  db.prepare(`UPDATE problem_ai_categories SET ${updateFields.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true, status });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /:id/create-project — Convert Problem to P-S Project (Milestone R5b)
// Separate state from /adopt — creates the actual engineering project.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/create-project', requireRole('mentor', 'university', 'admin'), wrap(async (req, res) => {
  // Role check is enforced by requireRole above.

  const problemId = req.params.id;
  const problem = db.prepare('SELECT * FROM societal_problems WHERE id = ?').get(problemId);
  if (!problem) return res.status(404).json({ error: 'Problem not found' });

  // Check if already converted
  const existingProj = db.prepare('SELECT * FROM projects WHERE problem_id = ? LIMIT 1').get(problemId);
  if (existingProj) {
    return res.json({
      message: 'A project for this problem already exists.',
      project: existingProj,
      alreadyExists: true
    });
  }

  // Ensure AI analysis is available or run it
  let analysis = db.prepare('SELECT * FROM problem_ai_analysis WHERE problem_id = ?').get(problemId);
  if (!analysis) {
    const problemIntelligence = require('../engines/problemIntelligence');
    const analyzeResult = await problemIntelligence.analyzeProblem(problemId);
    analysis = db.prepare('SELECT * FROM problem_ai_analysis WHERE problem_id = ?').get(problemId);
  }

  let skills = [];
  let reqs = [];
  try {
    skills = JSON.parse(analysis?.required_skills || '[]');
    reqs = JSON.parse(analysis?.key_requirements || '[]');
  } catch (e) {}

  if (!skills.length) skills = ['Node.js', 'React', 'REST APIs'];
  if (!reqs.length) reqs = [`Build core solution for ${problem.title}`];

  const projectId = uuidv4();
  const rawGoal = analysis?.problem_statement || problem.description;
  const title = problem.title;
  const scope = analysis?.estimated_scope || problem.geographic_scope || 'local';

  // Create P-S Project record linked to societal problem
  db.prepare(`
    INSERT INTO projects (
      id, user_id, raw_goal, title, tech_stack, scope, deadline_days,
      skill_level, deliverables, status, problem_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'planning', ?, datetime('now'), datetime('now'))
  `).run(
    projectId,
    req.user.id,
    rawGoal,
    title,
    JSON.stringify(skills),
    scope,
    14,
    'intermediate',
    JSON.stringify(reqs),
    problemId
  );

  // Mark societal problem as adopted
  db.prepare("UPDATE societal_problems SET adopted_by = ?, updated_at = datetime('now') WHERE id = ?")
    .run(req.user.id, problemId);

  // Set user active project
  db.prepare("UPDATE users SET active_project_id = ? WHERE id = ?").run(projectId, req.user.id);

  // Initialize requirements table for traceability
  const insertReqStmt = db.prepare(`
    INSERT INTO requirements (id, project_id, problem_id, source_type, title, description, priority, status)
    VALUES (?, ?, ?, 'problem_requirement', ?, ?, 'must', 'pending')
  `);

  reqs.forEach((rText, idx) => {
    insertReqStmt.run(
      `req_${uuidv4()}`,
      projectId,
      problemId,
      typeof rText === 'string' ? rText : `Requirement ${idx + 1}`,
      `Traceable requirement extracted from: ${problem.title}`
    );
  });

  const createdProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);

  res.status(201).json({
    action: 'project_created',
    message: `Project created from societal problem: ${problem.title}`,
    project: createdProject,
    problem
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /:id/create-course — Create a Project Course linked to problem (Milestone R7)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/create-course', wrap(async (req, res) => {
  if (!req.user || (req.user.role !== 'mentor' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Only mentors or admins can create project courses.' });
  }

  const problemId = req.params.id;
  const problem = db.prepare('SELECT * FROM societal_problems WHERE id = ?').get(problemId);
  if (!problem) return res.status(404).json({ error: 'Problem not found' });

  let analysis = db.prepare('SELECT * FROM problem_ai_analysis WHERE problem_id = ?').get(problemId);
  const courseId = `course_${uuidv4()}`;
  const title = `Project Course: ${problem.title}`;
  const desc = `Learn by building: Develop a deployable engineering solution for "${problem.title}". Covers practical system design, development, and validation.`;
  const skills = analysis?.required_skills || '["Fullstack", "REST APIs"]';

  db.prepare(`
    INSERT INTO courses (
      id, title, description, difficulty, tech_stack, estimated_hours,
      badge, source, creator_id, learning_outcome, status, problem_id, created_at
    ) VALUES (?, ?, ?, 'intermediate', ?, 20, 'societal', 'community', ?, ?, 'published', ?, datetime('now'))
  `).run(
    courseId,
    title,
    desc,
    skills,
    req.user.id,
    analysis?.expected_impact || problem.expected_impact || 'Deploy a working prototype addressing this community challenge.',
    problemId
  );

  // Pre-populate core course milestones
  const m1Id = `cm_${uuidv4()}`;
  const m2Id = `cm_${uuidv4()}`;
  const m3Id = `cm_${uuidv4()}`;

  db.prepare(`
    INSERT INTO course_milestones (id, course_id, title, position, description, duration_days)
    VALUES
      (?, ?, 'Phase 1: Understanding & Field Requirements', 0, 'Deep dive into stakeholder needs, root causes, and project constraints.', 3),
      (?, ?, 'Phase 2: Architecture & Core Prototype', 1, 'Design system components, APIs, and implement core data ingestion.', 5),
      (?, ?, 'Phase 3: Integration, Testing & QA Validation', 2, 'Build user interface, connect backend, and verify against problem requirements.', 6)
  `).run(m1Id, courseId, m2Id, courseId, m3Id, courseId);

  // Pre-populate initial tasks
  db.prepare(`
    INSERT INTO course_tasks (id, course_id, milestone_id, title, description, position, file_path, starter_template)
    VALUES
      (?, ?, ?, 'Review Problem Context & Requirements Specification', 'Study the citizen problem report and define the system interfaces.', 0, 'REQUIREMENTS.md', '# Problem Requirements\n- Analyze stakeholder needs\n- Specify data validation rules'),
      (?, ?, ?, 'Bootstrap Core Solution Workspace', 'Initialize backend service and configure connection endpoints.', 1, 'server.js', '// SOCRATES Societal Solution Entrypoint\nconst express = require("express");\nconst app = express();\napp.listen(3000);')
  `).run(`ct_${uuidv4()}`, courseId, m1Id, `ct_${uuidv4()}`, courseId, m2Id);

  const createdCourse = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);

  res.status(201).json({
    message: 'Project course created successfully',
    course: createdCourse
  });
}));

module.exports = router;

