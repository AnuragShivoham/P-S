const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { requireRole } = require('../middleware/role_middleware');
const { requireProjectPermission } = require('../middleware/projectAccess');

const router = express.Router();

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(error => {
  console.error('[Institution Route Error]', error.message);
  res.status(500).json({ error: 'Institution request failed.' });
});

function audit(actorId, action, resourceType, resourceId, details = {}) {
  db.prepare(`INSERT INTO authorization_audit_log (id, actor_user_id, action, resource_type, resource_id, details)
    VALUES (?, ?, ?, ?, ?, ?)`).run(uuidv4(), actorId, action, resourceType, resourceId || null, JSON.stringify(details));
}

function canManageProject(req, projectId) {
  const permission = requireProjectPermission(req.user, projectId, true);
  if (!permission.allowed) return { error: permission.project ? 'Project owner has not granted write access to this account.' : 'Project not found.' };
  return { project: permission.project };
}

function getMembership(institutionId, userId) {
  return db.prepare(`SELECT m.*, i.name AS institution_name, i.slug AS institution_slug, i.owner_user_id
    FROM institution_memberships m JOIN institutions i ON i.id = m.institution_id
    WHERE m.institution_id = ? AND m.user_id = ?`).get(institutionId, userId);
}

function requireInstitutionAdmin(req, res, institutionId) {
  const institution = db.prepare('SELECT owner_user_id FROM institutions WHERE id = ?').get(institutionId);
  if (!institution) {
    res.status(404).json({ error: 'Institution not found.' });
    return false;
  }
  if (institution.owner_user_id === req.user.id) return true;
  const membership = getMembership(institutionId, req.user.id);
  if (!membership || membership.status !== 'active' || membership.member_type !== 'university') {
    res.status(403).json({ error: 'Active university membership is required.' });
    return false;
  }
  return true;
}

function getInstitutionForUser(userId) {
  return db.prepare(`SELECT i.*, m.member_type, m.status AS membership_status, m.department_id
    FROM institutions i JOIN institution_memberships m ON m.institution_id = i.id
    WHERE m.user_id = ? AND m.status = 'active' ORDER BY i.created_at LIMIT 1`).get(userId);
}

router.post('/', requireRole('university'), wrap((req, res) => {
  const name = String(req.body.name || '').trim();
  const requestedSlug = String(req.body.slug || name).trim().toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
  if (name.length < 2 || name.length > 160 || !requestedSlug) {
    return res.status(400).json({ error: 'Institution name must be between 2 and 160 characters.' });
  }
  if (db.prepare('SELECT id FROM institutions WHERE owner_user_id = ?').get(req.user.id)) {
    return res.status(409).json({ error: 'Your account already owns an institution.' });
  }
  const id = `inst_${uuidv4()}`;
  try {
    db.prepare('INSERT INTO institutions (id, name, slug, owner_user_id) VALUES (?, ?, ?, ?)')
      .run(id, name, requestedSlug, req.user.id);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) return res.status(409).json({ error: 'That institution URL is already in use.' });
    throw error;
  }
  db.prepare(`INSERT INTO institution_memberships (id, institution_id, user_id, member_type, status, is_institution_admin)
    VALUES (?, ?, ?, 'university', 'active', 1)`).run(uuidv4(), id, req.user.id);
  db.prepare(`INSERT INTO authorization_audit_log (id, actor_user_id, action, resource_type, resource_id, details)
    VALUES (?, ?, 'institution.created', 'institution', ?, ?)`).run(uuidv4(), req.user.id, id, JSON.stringify({ institutionId: id, name }));
  res.status(201).json({ institution: db.prepare('SELECT * FROM institutions WHERE id = ?').get(id) });
}));

router.get('/me', requireRole('university'), wrap((req, res) => {
  const institution = getInstitutionForUser(req.user.id);
  res.json({ institution: institution || null });
}));

router.patch('/:id', requireRole('university', 'admin'), wrap((req, res) => {
  if (!requireInstitutionAdmin(req, res, req.params.id)) return;
  const current = db.prepare('SELECT * FROM institutions WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Institution not found.' });
  const name = String(req.body.name ?? current.name).trim();
  if (name.length < 2 || name.length > 160) return res.status(400).json({ error: 'Institution name must be between 2 and 160 characters.' });
  db.prepare("UPDATE institutions SET name = ?, updated_at = datetime('now') WHERE id = ?").run(name, current.id);
  audit(req.user.id, 'institution.updated', 'institution', current.id, { institutionId: current.id, name });
  res.json({ institution: db.prepare('SELECT * FROM institutions WHERE id = ?').get(current.id) });
}));

router.post('/join', requireRole('student', 'mentor'), wrap((req, res) => {
  const slug = String(req.body.slug || '').trim().toLowerCase();
  const institution = db.prepare("SELECT id, name, slug FROM institutions WHERE slug = ? AND status = 'active'").get(slug);
  if (!institution) return res.status(404).json({ error: 'Active institution not found.' });
  const existing = getMembership(institution.id, req.user.id);
  if (existing?.status === 'active' || existing?.status === 'pending') return res.json({ membership: existing, alreadyRequested: true });
  const memberType = req.user.role === 'mentor' ? 'faculty' : 'student';
  const id = uuidv4();
  if (existing) {
    db.prepare("UPDATE institution_memberships SET member_type = ?, status = 'pending', updated_at = datetime('now') WHERE id = ?")
      .run(memberType, existing.id);
  } else {
    db.prepare(`INSERT INTO institution_memberships (id, institution_id, user_id, member_type, status)
      VALUES (?, ?, ?, ?, 'pending')`).run(id, institution.id, req.user.id, memberType);
  }
  const membershipId = existing?.id || id;
  audit(req.user.id, 'institution.membership_requested', 'membership', membershipId, { institutionId: institution.id });
  res.status(201).json({ membership: getMembership(institution.id, req.user.id) });
}));

router.get('/membership/me', wrap((req, res) => {
  const memberships = db.prepare(`SELECT m.id, m.institution_id, m.member_type, m.status, m.created_at,
      i.name AS institution_name, i.slug AS institution_slug
    FROM institution_memberships m JOIN institutions i ON i.id = m.institution_id
    WHERE m.user_id = ? ORDER BY m.created_at DESC`).all(req.user.id);
  res.json({ memberships });
}));

router.get('/:id/dashboard', requireRole('university'), wrap((req, res) => {
  const institution = db.prepare('SELECT * FROM institutions WHERE id = ?').get(req.params.id);
  if (!institution) return res.status(404).json({ error: 'Institution not found.' });
  const membership = getMembership(institution.id, req.user.id);
  if (!membership || membership.status !== 'active' || membership.member_type !== 'university' ||
      (institution.owner_user_id !== req.user.id && membership.is_institution_admin !== 1)) {
    return res.status(403).json({ error: 'Active university administrator membership is required.' });
  }

  const members = db.prepare(`SELECT m.id, m.user_id, m.member_type, m.status, m.department_id, m.created_at,
      u.name, u.avatar, u.skill_level, u.created_at AS account_created_at,
      (SELECT COUNT(*) FROM projects p WHERE p.user_id = u.id
        AND EXISTS (SELECT 1 FROM project_access_policies ap WHERE ap.project_id = p.id AND ap.institution_id = ? AND ap.access_mode = 'institution')) AS project_count,
      d.name AS department_name
    FROM institution_memberships m JOIN users u ON u.id = m.user_id
      LEFT JOIN institution_departments d ON d.id = m.department_id AND d.institution_id = m.institution_id
    WHERE m.institution_id = ? AND m.status = 'active' ORDER BY m.member_type, u.name`).all(institution.id, institution.id);
  const students = members.filter(member => member.member_type === 'student');
  const faculty = members.filter(member => ['faculty', 'mentor', 'university'].includes(member.member_type));
  const projects = db.prepare(`SELECT p.id, p.title, p.status, p.created_at, p.updated_at,
      p.progress_pct, p.completed_tasks, p.total_tasks, p.user_id,
      u.name AS owner_name, ap.access_mode, ap.approval_required,
      (SELECT COUNT(*) FROM project_student_applications a WHERE a.project_id = p.id AND a.status = 'pending') AS pending_applications
    FROM project_access_policies ap JOIN projects p ON p.id = ap.project_id
    JOIN users u ON u.id = p.user_id
    WHERE ap.institution_id = ? AND ap.access_mode = 'institution' ORDER BY p.updated_at DESC LIMIT 250`).all(institution.id);
  const myProjectsToShare = req.user.role === 'admin' ? [] : db.prepare(`SELECT p.id, p.title, p.status, p.updated_at,
      CASE WHEN ap.institution_id = ? AND ap.access_mode = 'institution' THEN ap.institution_id ELSE NULL END AS shared_institution_id
    FROM projects p LEFT JOIN project_access_policies ap ON ap.project_id = p.id
    WHERE p.user_id = ? ORDER BY p.updated_at DESC LIMIT 100`).all(institution.id, req.user.id);
  const departments = db.prepare('SELECT * FROM institution_departments WHERE institution_id = ? ORDER BY name').all(institution.id);
  const projectIds = projects.map(project => project.id);
  let verifiedSkills = [];
  if (students.length) {
    const studentIds = students.map(student => student.user_id);
    const placeholders = studentIds.map(() => '?').join(',');
    verifiedSkills = db.prepare(`SELECT s.id AS skill_id, s.name AS skill_name, s.category,
        COUNT(DISTINCT cp.student_id) AS verified_students
      FROM student_competency_profiles cp JOIN skills_ontology s ON s.id = cp.skill_id
      WHERE cp.status = 'VERIFIED' AND cp.student_id IN (${placeholders})
      GROUP BY s.id, s.name, s.category ORDER BY verified_students DESC, s.name LIMIT 50`).all(...studentIds);
  }
  const applications = projectIds.length && membership && membership.is_institution_admin === 1
    ? db.prepare(`SELECT a.id, a.project_id, a.student_id, a.status, a.message, a.created_at,
        u.name AS student_name, p.title AS project_title
      FROM project_student_applications a JOIN users u ON u.id = a.student_id
      JOIN projects p ON p.id = a.project_id
      JOIN project_access_policies ap ON ap.project_id = p.id
      WHERE ap.institution_id = ? AND ap.access_mode = 'institution' ORDER BY a.created_at DESC LIMIT 100`).all(institution.id)
    : [];
  const challengeRows = db.prepare(`SELECT p.id, p.title, p.description, p.status, p.urgency, p.created_at,
      (SELECT id FROM projects pr WHERE pr.problem_id = p.id LIMIT 1) AS linked_project_id
    FROM societal_problems p WHERE p.status = 'PUBLISHED' ORDER BY p.created_at DESC LIMIT 50`).all();
  const adoptionRows = db.prepare(`SELECT pa.id, pa.problem_id, pa.status, pa.created_at, p.title,
      u.name AS adopter_name, (SELECT id FROM projects pr WHERE pr.problem_id = p.id LIMIT 1) AS project_id
    FROM problem_adoptions pa JOIN societal_problems p ON p.id = pa.problem_id
    JOIN users u ON u.id = pa.user_id WHERE pa.user_id = ? ORDER BY pa.created_at DESC LIMIT 50`).all(req.user.id);
  const activeStudents = db.prepare("SELECT user_id FROM institution_memberships WHERE institution_id = ? AND status = 'active' AND member_type = 'student'").all(institution.id);
  let verifiedSkillCount = 0;
  if (activeStudents.length) {
    const ids = activeStudents.map(student => student.user_id);
    const placeholders = ids.map(() => '?').join(',');
    verifiedSkillCount = db.prepare(`SELECT COUNT(*) AS count FROM student_competency_profiles
      WHERE status = 'VERIFIED' AND student_id IN (${placeholders})`).get(...ids).count;
  }
  const averageRow = db.prepare(`SELECT ROUND(AVG(COALESCE(p.progress_pct, 0))) AS average_progress
    FROM projects p JOIN project_access_policies ap ON ap.project_id = p.id
    WHERE ap.institution_id = ? AND ap.access_mode = 'institution'`).get(institution.id);
  const projectAverage = averageRow.average_progress == null ? null : Number(averageRow.average_progress);

  res.json({
    institution: { id: institution.id, name: institution.name, slug: institution.slug, created_at: institution.created_at },
    metrics: {
      active_students: students.length,
      pending_memberships: db.prepare("SELECT COUNT(*) AS count FROM institution_memberships WHERE institution_id = ? AND status = 'pending'").get(institution.id).count,
      faculty: faculty.length,
      shared_projects: db.prepare("SELECT COUNT(*) AS count FROM project_access_policies WHERE institution_id = ? AND access_mode = 'institution'").get(institution.id).count,
      pending_applications: db.prepare(`SELECT COUNT(*) AS count FROM project_student_applications a
        JOIN project_access_policies ap ON ap.project_id = a.project_id
        WHERE ap.institution_id = ? AND ap.access_mode = 'institution' AND a.status = 'pending'`).get(institution.id).count,
      average_shared_project_progress: projectAverage,
      verified_skill_records: verifiedSkillCount,
    },
    students,
    faculty,
    departments,
    projects,
    my_projects_to_share: myProjectsToShare,
    applications,
    challenges: challengeRows,
    adoptions: adoptionRows,
    verified_skills: verifiedSkills,
    data_scope: 'Institution memberships and projects explicitly shared with this institution; challenges are published public records.',
  });
}));

router.get('/:id/projects/:projectId/grants', requireRole('university'), wrap((req, res) => {
  const institution = db.prepare('SELECT * FROM institutions WHERE id = ?').get(req.params.id);
  const membership = getMembership(req.params.id, req.user.id);
  if (!institution || !membership || membership.status !== 'active' || membership.member_type !== 'university' ||
      (institution.owner_user_id !== req.user.id && membership.is_institution_admin !== 1)) {
    return res.status(institution ? 403 : 404).json({ error: institution ? 'Institution admin access required.' : 'Institution not found.' });
  }
  const permission = canManageProject(req, req.params.projectId);
  if (permission.error) return res.status(403).json({ error: permission.error });
  const grants = db.prepare(`SELECT g.id, g.user_id, g.access_level, g.created_at, u.name
    FROM project_access_grants g JOIN users u ON u.id = g.user_id
    WHERE g.project_id = ? ORDER BY u.name`).all(req.params.projectId);
  res.json({ grants });
}));

router.put('/:id/projects/:projectId/grants/:userId', requireRole('university'), wrap((req, res) => {
  const institution = db.prepare('SELECT * FROM institutions WHERE id = ?').get(req.params.id);
  const membershipAdmin = getMembership(req.params.id, req.user.id);
  if (!institution || !membershipAdmin || membershipAdmin.status !== 'active' || membershipAdmin.member_type !== 'university' ||
      (institution.owner_user_id !== req.user.id && membershipAdmin.is_institution_admin !== 1)) {
    return res.status(institution ? 403 : 404).json({ error: institution ? 'Institution admin access required.' : 'Institution not found.' });
  }
  const permission = canManageProject(req, req.params.projectId);
  if (permission.error) return res.status(403).json({ error: permission.error });
  const accessLevel = req.body.access_level;
  if (!['read', 'write'].includes(accessLevel)) return res.status(400).json({ error: 'access_level must be read or write.' });
  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  const membership = db.prepare("SELECT id FROM institution_memberships WHERE institution_id = ? AND user_id = ? AND status = 'active'")
    .get(req.params.id, target.id);
  if (!membership) return res.status(403).json({ error: 'Collaborator must be an active member of this institution.' });
  const grantId = `grant_${uuidv4()}`;
  db.prepare(`INSERT INTO project_access_grants (id, project_id, user_id, access_level, granted_by)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(project_id, user_id) DO UPDATE SET access_level = excluded.access_level, granted_by = excluded.granted_by, updated_at = datetime('now')`)
    .run(grantId, req.params.projectId, target.id, accessLevel, req.user.id);
  audit(req.user.id, 'project.access_granted', 'project', req.params.projectId, { institutionId: req.params.id, userId: target.id, accessLevel });
  res.json({ success: true, userId: target.id, access_level: accessLevel });
}));

router.delete('/:id/projects/:projectId/grants/:userId', requireRole('university'), wrap((req, res) => {
  const institution = db.prepare('SELECT * FROM institutions WHERE id = ?').get(req.params.id);
  const membershipAdmin = getMembership(req.params.id, req.user.id);
  if (!institution || !membershipAdmin || membershipAdmin.status !== 'active' || membershipAdmin.member_type !== 'university' ||
      (institution.owner_user_id !== req.user.id && membershipAdmin.is_institution_admin !== 1)) {
    return res.status(institution ? 403 : 404).json({ error: institution ? 'Institution admin access required.' : 'Institution not found.' });
  }
  const permission = canManageProject(req, req.params.projectId);
  if (permission.error) return res.status(403).json({ error: permission.error });
  const result = db.prepare('DELETE FROM project_access_grants WHERE project_id = ? AND user_id = ?')
    .run(req.params.projectId, req.params.userId);
  if (!result.changes) return res.status(404).json({ error: 'Project access grant not found.' });
  audit(req.user.id, 'project.access_revoked', 'project', req.params.projectId, { institutionId: req.params.id, userId: req.params.userId });
  res.json({ success: true });
}));

router.put('/:id/projects/:projectId/share', requireRole('university'), wrap((req, res) => {
  if (!requireInstitutionAdmin(req, res, req.params.id)) return;
  const project = db.prepare('SELECT id, user_id FROM projects WHERE id = ?').get(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (project.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the project owner can share it with an institution.' });
  }
  const existingPolicy = db.prepare('SELECT institution_id, access_mode FROM project_access_policies WHERE project_id = ?').get(project.id);
  if (existingPolicy?.access_mode === 'institution' && existingPolicy.institution_id !== req.params.id) {
    return res.status(409).json({ error: 'This project is already shared with another institution. Revoke that share before moving it.' });
  }
  const approvalRequired = req.body.approval_required === false ? 0 : 1;
  db.prepare(`INSERT INTO project_access_policies (project_id, access_mode, institution_id, approval_required, created_at)
      VALUES (?, 'institution', ?, ?, datetime('now'))
      ON CONFLICT(project_id) DO UPDATE SET access_mode = 'institution', institution_id = excluded.institution_id, approval_required = excluded.approval_required`)
    .run(project.id, req.params.id, approvalRequired);
  audit(req.user.id, 'institution.project_shared', 'project', project.id, { institutionId: req.params.id, approvalRequired: !!approvalRequired });
  res.json({ success: true, projectId: project.id, access_mode: 'institution', approval_required: !!approvalRequired });
}));

router.delete('/:id/projects/:projectId/share', requireRole('university'), wrap((req, res) => {
  if (!requireInstitutionAdmin(req, res, req.params.id)) return;
  const project = db.prepare('SELECT id, user_id FROM projects WHERE id = ?').get(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (project.user_id !== req.user.id) return res.status(403).json({ error: 'Only the project owner can revoke its institution share.' });
  const policy = db.prepare("SELECT project_id FROM project_access_policies WHERE project_id = ? AND institution_id = ? AND access_mode = 'institution'")
    .get(project.id, req.params.id);
  if (!policy) return res.status(404).json({ error: 'Project is not shared with this institution.' });
  db.prepare("UPDATE project_access_policies SET access_mode = 'private', institution_id = NULL, approval_required = 1 WHERE project_id = ?")
    .run(project.id);
  audit(req.user.id, 'institution.project_share_revoked', 'project', project.id, { institutionId: req.params.id });
  res.json({ success: true, projectId: project.id, access_mode: 'private' });
}));

router.get('/:id/members', requireRole('university', 'admin'), wrap((req, res) => {
  if (!requireInstitutionAdmin(req, res, req.params.id)) return;
  const status = ['active', 'pending', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
    const members = db.prepare(`SELECT m.id, m.user_id, m.member_type, m.status, m.department_id, m.created_at,
      m.is_institution_admin, u.name, u.role, u.avatar FROM institution_memberships m JOIN users u ON u.id = m.user_id
    WHERE m.institution_id = ? AND m.status = ? ORDER BY m.created_at DESC`).all(req.params.id, status);
  res.json({ members });
}));

router.patch('/:id/members/:membershipId', requireRole('university', 'admin'), wrap((req, res) => {
  if (!requireInstitutionAdmin(req, res, req.params.id)) return;
  const { status, department_id, is_institution_admin } = req.body;
  if (!['active', 'rejected'].includes(status)) return res.status(400).json({ error: 'Membership status must be active or rejected.' });
  const membership = db.prepare('SELECT * FROM institution_memberships WHERE id = ? AND institution_id = ?')
    .get(req.params.membershipId, req.params.id);
  if (!membership) return res.status(404).json({ error: 'Membership request not found.' });
  if (membership.user_id === req.user.id) {
    return res.status(400).json({ error: 'You cannot change your own institution membership.' });
  }
  if (department_id && !db.prepare('SELECT id FROM institution_departments WHERE id = ? AND institution_id = ?').get(department_id, req.params.id)) {
    return res.status(400).json({ error: 'Department does not belong to this institution.' });
  }
  db.prepare("UPDATE institution_memberships SET status = ?, department_id = COALESCE(?, department_id), updated_at = datetime('now') WHERE id = ?")
    .run(status, department_id || null, membership.id);
  const adminFlag = is_institution_admin === undefined ? membership.is_institution_admin : (is_institution_admin ? 1 : 0);
  if (membership.member_type === 'university' && req.user.id === membership.user_id && adminFlag !== membership.is_institution_admin) {
    return res.status(400).json({ error: 'You cannot change your own institution-admin permission.' });
  }
  db.prepare('UPDATE institution_memberships SET is_institution_admin = ? WHERE id = ?').run(adminFlag || 0, membership.id);
  audit(req.user.id, `institution.membership.${status}`, 'membership', membership.id, { institutionId: req.params.id, memberUserId: membership.user_id, departmentId: department_id || null, isInstitutionAdmin: !!adminFlag });
  res.json({ success: true, membershipId: membership.id, status });
}));

router.post('/:id/departments', requireRole('university', 'admin'), wrap((req, res) => {
  if (!requireInstitutionAdmin(req, res, req.params.id)) return;
  const name = String(req.body.name || '').trim();
  const program = String(req.body.program || '').trim();
  if (name.length < 2 || name.length > 120) return res.status(400).json({ error: 'Department name must be between 2 and 120 characters.' });
  const id = `dept_${uuidv4()}`;
  try {
    db.prepare('INSERT INTO institution_departments (id, institution_id, name, program) VALUES (?, ?, ?, ?)')
      .run(id, req.params.id, name, program);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) return res.status(409).json({ error: 'Department already exists.' });
    throw error;
  }
  audit(req.user.id, 'institution.department.created', 'department', id, { institutionId: req.params.id, name });
  res.status(201).json({ department: db.prepare('SELECT * FROM institution_departments WHERE id = ?').get(id) });
}));

router.delete('/:id/departments/:departmentId', requireRole('university', 'admin'), wrap((req, res) => {
  if (!requireInstitutionAdmin(req, res, req.params.id)) return;
  const department = db.prepare('SELECT * FROM institution_departments WHERE id = ? AND institution_id = ?')
    .get(req.params.departmentId, req.params.id);
  if (!department) return res.status(404).json({ error: 'Department not found.' });
  db.prepare('UPDATE institution_memberships SET department_id = NULL WHERE department_id = ?').run(department.id);
  db.prepare('DELETE FROM institution_departments WHERE id = ?').run(department.id);
  audit(req.user.id, 'institution.department.deleted', 'department', department.id, { institutionId: req.params.id, name: department.name });
  res.json({ success: true });
}));

router.get('/:id/report.csv', requireRole('university'), wrap((req, res) => {
  if (!requireInstitutionAdmin(req, res, req.params.id)) return;
  const rows = db.prepare(`SELECT u.name, u.email, m.member_type, m.status, d.name AS department,
      m.created_at AS joined_at
    FROM institution_memberships m JOIN users u ON u.id = m.user_id
    LEFT JOIN institution_departments d ON d.id = m.department_id
    WHERE m.institution_id = ? ORDER BY m.member_type, u.name`).all(req.params.id);
  const escape = value => {
    const text = String(value ?? '').replace(/[\r\n]+/g, ' ');
    const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const csv = ['name,email,member_type,status,department,joined_at', ...rows.map(row =>
    [row.name, row.email, row.member_type, row.status, row.department, row.joined_at].map(escape).join(','))].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="institution-members.csv"');
  res.send(csv);
}));

router.get('/:id/audit', requireRole('university'), wrap((req, res) => {
  if (!requireInstitutionAdmin(req, res, req.params.id)) return;
  const events = db.prepare(`SELECT a.id, a.action, a.resource_type, a.resource_id, a.details, a.created_at,
      u.name AS actor_name FROM authorization_audit_log a LEFT JOIN users u ON u.id = a.actor_user_id
    WHERE json_extract(a.details, '$.institutionId') = ? OR (a.resource_type = 'institution' AND a.resource_id = ?) OR a.resource_id IN (
      SELECT id FROM institution_memberships WHERE institution_id = ?
    ) OR a.resource_id IN (
      SELECT id FROM institution_departments WHERE institution_id = ?
    ) ORDER BY a.created_at DESC LIMIT 100`).all(req.params.id, req.params.id, req.params.id, req.params.id);
  res.json({ events });
}));

module.exports = router;