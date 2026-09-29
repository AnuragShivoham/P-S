const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const architectureGenerator = require('../engines/architectureGenerator');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(e => {
  console.error('[ProjectExtensions Route Error]', e.message);
  res.status(500).json({ error: e.message });
});

// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURE
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:id/architecture', wrap(async (req, res) => {
  const architectures = architectureGenerator.getProjectArchitectures(req.params.id);
  const project = db.prepare('SELECT id, title, architecture_version FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  res.json({
    project_id: project.id,
    current_version: project.architecture_version || 1,
    architectures
  });
}));

router.post('/:id/architecture/generate', wrap(async (req, res) => {
  const { notes = '' } = req.body;
  const result = await architectureGenerator.generateArchitecture(req.params.id, notes);
  res.status(201).json({
    message: `Generated architecture version ${result.version}`,
    architecture: result
  });
}));

router.post('/:id/architecture/approve', wrap(async (req, res) => {
  const { version } = req.body;
  if (!version) return res.status(400).json({ error: 'Version is required' });

  const approved = architectureGenerator.approveArchitecture(req.params.id, parseInt(version, 10));
  res.json({
    message: `Architecture version ${version} approved`,
    approved
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT TEAM & ROLES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:id/team', wrap(async (req, res) => {
  const projectId = req.params.id;
  let team = db.prepare('SELECT * FROM project_teams WHERE project_id = ?').get(projectId);
  if (!team) {
    const teamId = `team_${uuidv4()}`;
    db.prepare('INSERT INTO project_teams (id, project_id, name) VALUES (?, ?, ?)')
      .run(teamId, projectId, 'Engineering Team');
    team = db.prepare('SELECT * FROM project_teams WHERE id = ?').get(teamId);
  }

  const members = db.prepare(`
    SELECT m.*, u.name, u.email, u.role as user_platform_role, u.avatar,
           t.title as assigned_task_title, t.status as assigned_task_status
    FROM project_team_members m
    JOIN users u ON m.user_id = u.id
    LEFT JOIN tasks t ON m.assigned_task_id = t.id
    WHERE m.team_id = ?
    ORDER BY m.created_at ASC
  `).all(team.id);

  res.json({
    team,
    members
  });
}));

router.post('/:id/team/invite', wrap(async (req, res) => {
  const projectId = req.params.id;
  const { user_id, email, role = 'Frontend Developer' } = req.body;

  let targetUserId = user_id;
  if (!targetUserId && email) {
    const foundUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!foundUser) return res.status(404).json({ error: 'User with specified email not found' });
    targetUserId = foundUser.id;
  }

  if (!targetUserId) return res.status(400).json({ error: 'user_id or email is required' });

  let team = db.prepare('SELECT * FROM project_teams WHERE project_id = ?').get(projectId);
  if (!team) {
    const teamId = `team_${uuidv4()}`;
    db.prepare('INSERT INTO project_teams (id, project_id, name) VALUES (?, ?, ?)')
      .run(teamId, projectId, 'Engineering Team');
    team = db.prepare('SELECT * FROM project_teams WHERE id = ?').get(teamId);
  }

  const memberId = `tm_${uuidv4()}`;
  db.prepare(`
    INSERT INTO project_team_members (id, team_id, user_id, role, status, created_at)
    VALUES (?, ?, ?, ?, 'active', datetime('now'))
  `).run(memberId, team.id, targetUserId, role);

  res.status(201).json({ message: 'Team member added successfully', memberId });
}));

router.patch('/:id/team/member/:memberId', wrap(async (req, res) => {
  const { memberId } = req.params;
  const { role, assigned_task_id, status } = req.body;

  db.prepare(`
    UPDATE project_team_members SET
      role = COALESCE(?, role),
      assigned_task_id = COALESCE(?, assigned_task_id),
      status = COALESCE(?, status)
    WHERE id = ?
  `).run(role || null, assigned_task_id || null, status || null, memberId);

  res.json({ success: true, message: 'Team member updated' });
}));

router.delete('/:id/team/member/:memberId', wrap(async (req, res) => {
  db.prepare('DELETE FROM project_team_members WHERE id = ?').run(req.params.memberId);
  res.json({ success: true, message: 'Member removed from team' });
}));

// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENTS TRACEABILITY
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:id/requirements', wrap(async (req, res) => {
  const projectId = req.params.id;
  const requirements = db.prepare(`
    SELECT r.*,
           (SELECT COUNT(*) FROM requirement_tasks WHERE requirement_id = r.id) as linked_tasks_count,
           (SELECT qa.status FROM requirement_qa qa WHERE qa.requirement_id = r.id ORDER BY qa.created_at DESC LIMIT 1) as latest_qa_verdict,
           (SELECT qa.score FROM requirement_qa qa WHERE qa.requirement_id = r.id ORDER BY qa.created_at DESC LIMIT 1) as latest_qa_score,
           (SELECT qa.evidence_text FROM requirement_qa qa WHERE qa.requirement_id = r.id ORDER BY qa.created_at DESC LIMIT 1) as latest_qa_evidence
    FROM requirements r
    WHERE r.project_id = ?
    ORDER BY r.priority DESC, r.created_at ASC
  `).all(projectId);

  res.json({ requirements });
}));

router.post('/:id/requirements', wrap(async (req, res) => {
  const projectId = req.params.id;
  const { title, description = '', priority = 'must', source_type = 'project_requirement' } = req.body;

  if (!title) return res.status(400).json({ error: 'Requirement title required' });

  const reqId = `req_${uuidv4()}`;
  db.prepare(`
    INSERT INTO requirements (id, project_id, source_type, title, description, priority, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
  `).run(reqId, projectId, source_type, title, description, priority);

  res.status(201).json({ success: true, requirementId: reqId });
}));

// ─────────────────────────────────────────────────────────────────────────────
// IMPACT TRACKING (Estimated vs Measured)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:id/impact', wrap(async (req, res) => {
  const projectId = req.params.id;
  const metrics = db.prepare('SELECT * FROM impact_metrics WHERE project_id = ? ORDER BY updated_at DESC').all(projectId);
  const project = db.prepare('SELECT id, title, status FROM projects WHERE id = ?').get(projectId);

  res.json({
    project,
    metrics
  });
}));

router.post('/:id/impact', wrap(async (req, res) => {
  const projectId = req.params.id;
  const {
    metric_type,
    label,
    unit = '',
    estimated_value = 0,
    measured_value = null,
    evidence_notes = '',
    deployment_status = 'planned'
  } = req.body;

  if (!label || !metric_type) return res.status(400).json({ error: 'metric_type and label are required' });

  const metricId = `imp_${uuidv4()}`;
  db.prepare(`
    INSERT INTO impact_metrics (
      id, project_id, metric_type, label, unit, estimated_value,
      measured_value, evidence_notes, deployment_status, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(metricId, projectId, metric_type, label, unit, estimated_value, measured_value, evidence_notes, deployment_status);

  res.status(201).json({ success: true, metricId });
}));

// ─────────────────────────────────────────────────────────────────────────────
// REAL-TIME COLLABORATION SESSION & VS CODE LIVE SHARE BOUNDARY
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:id/collaboration/session', wrap(async (req, res) => {
  const projectId = req.params.id;
  const activeSession = db.prepare(`
    SELECT s.*, u.name as host_name
    FROM collaboration_sessions s
    JOIN users u ON s.host_id = u.id
    WHERE s.project_id = ? AND s.status = 'active'
    ORDER BY s.started_at DESC LIMIT 1
  `).get(projectId);

  if (!activeSession) {
    return res.json({ session: null });
  }

  const participants = db.prepare(`
    SELECT p.*, u.name, u.avatar
    FROM collaboration_participants p
    JOIN users u ON p.user_id = u.id
    WHERE p.session_id = ? AND p.left_at IS NULL
  `).all(activeSession.id);

  res.json({
    session: activeSession,
    participants
  });
}));

router.post('/:id/collaboration/session', wrap(async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const projectId = req.params.id;
  const { title = 'Team Coding Session', task_id = null, live_share_url = '', permission_mode = 'full' } = req.body;

  const sessionId = `collab_${uuidv4()}`;
  const generatedShareUrl = live_share_url || `https://prod.liveshare.vsengsaas.visualstudio.com/join?${sessionId}`;

  db.prepare(`
    INSERT INTO collaboration_sessions (
      id, project_id, host_id, task_id, title, status,
      live_share_url, permission_mode, started_at
    ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, datetime('now'))
  `).run(sessionId, projectId, req.user.id, task_id, title, generatedShareUrl, permission_mode);

  // Add host as participant
  db.prepare(`
    INSERT INTO collaboration_participants (id, session_id, user_id, role, joined_at)
    VALUES (?, ?, ?, 'host', datetime('now'))
  `).run(`cp_${uuidv4()}`, sessionId, req.user.id);

  const session = db.prepare('SELECT * FROM collaboration_sessions WHERE id = ?').get(sessionId);

  res.status(201).json({
    message: 'Collaboration session started',
    session
  });
}));

router.patch('/:id/collaboration/session/:sessionId', wrap(async (req, res) => {
  const { sessionId } = req.params;
  const { status = 'ended', live_share_url } = req.body;

  db.prepare(`
    UPDATE collaboration_sessions SET
      status = ?,
      live_share_url = COALESCE(?, live_share_url),
      ended_at = CASE WHEN ? = 'ended' THEN datetime('now') ELSE ended_at END
    WHERE id = ?
  `).run(status, live_share_url || null, status, sessionId);

  res.json({ success: true, message: 'Session updated' });
}));

// ─────────────────────────────────────────────────────────────────────────────
// VS CODE EXTENSION API BOUNDARY (P-S Project Collaborator)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/vscode/project/:id', wrap(async (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  let problem = null;
  if (project.problem_id) {
    problem = db.prepare('SELECT * FROM societal_problems WHERE id = ?').get(project.problem_id);
  }

  const milestones = db.prepare('SELECT * FROM milestones WHERE project_id = ? ORDER BY ord ASC').all(project.id);
  const tasks = db.prepare(`
    SELECT t.* FROM tasks t
    JOIN milestones m ON t.milestone_id = m.id
    WHERE m.project_id = ?
    ORDER BY m.ord ASC, t.ord ASC
  `).all(project.id);

  const activeCollab = db.prepare("SELECT * FROM collaboration_sessions WHERE project_id = ? AND status = 'active' LIMIT 1").get(project.id);

  res.json({
    project: {
      id: project.id,
      title: project.title,
      status: project.status,
      tech_stack: JSON.parse(project.tech_stack || '[]'),
      current_milestone_id: project.current_milestone_id,
      current_task_id: project.current_task_id
    },
    societal_problem: problem ? { id: problem.id, title: problem.title, urgency: problem.urgency } : null,
    milestones,
    tasks,
    collaboration_session: activeCollab || null,
    api_endpoints: {
      ask_mentor: `/api/v1/projects/${project.id}/ask`,
      submit_task: `/api/v1/tasks/submit`,
      sync_session: `/api/v1/projects/${project.id}/collaboration/session`
    }
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT APPLICATIONS (project_student_applications)
// ─────────────────────────────────────────────────────────────────────────────
const { requireRole } = require('../middleware/role_middleware');

/**
 * POST /:id/apply — Student applies to join a problem-derived project.
 * Checks project_access_policies: if approval_required = 0 the student is
 * auto-accepted; otherwise the record waits for mentor review.
 */
router.post('/:id/apply', requireRole('student'), wrap(async (req, res) => {
  const projectId = req.params.id;
  const studentId = req.user.id;
  const { message = '' } = req.body;

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found.' });

  // Prevent duplicate application
  const existing = db.prepare(
    "SELECT id FROM project_student_applications WHERE project_id = ? AND student_id = ? AND status != 'withdrawn'"
  ).get(projectId, studentId);
  if (existing) {
    return res.json({ message: 'You already have an active application for this project.', applicationId: existing.id });
  }

  // Check access policy
  const policy = db.prepare('SELECT * FROM project_access_policies WHERE project_id = ?').get(projectId);
  const autoApprove = !policy || policy.approval_required === 0;

  const result = db.prepare(`
    INSERT INTO project_student_applications (project_id, student_id, status, message, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(projectId, studentId, autoApprove ? 'approved' : 'pending', message);

  res.status(201).json({
    applicationId: result.lastInsertRowid,
    status: autoApprove ? 'approved' : 'pending',
    message: autoApprove
      ? 'Application approved automatically. You may now join the team.'
      : 'Application submitted. Awaiting mentor review.'
  });
}));

/**
 * GET /:id/applications — List applications for a project.
 * Visible to: project mentor/owner (mentor, university, admin).
 */
router.get('/:id/applications', requireRole('mentor', 'university', 'admin'), wrap(async (req, res) => {
  const projectId = req.params.id;
  const applications = db.prepare(`
    SELECT psa.*, u.name as student_name, u.email as student_email
    FROM project_student_applications psa
    JOIN users u ON psa.student_id = u.id
    WHERE psa.project_id = ?
    ORDER BY psa.created_at DESC
  `).all(projectId);
  res.json({ applications });
}));

/**
 * PATCH /:id/applications/:appId — Approve or reject a student application.
 */
router.patch('/:id/applications/:appId', requireRole('mentor', 'university', 'admin'), wrap(async (req, res) => {
  const { appId } = req.params;
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be approved or rejected.' });
  }
  db.prepare(`
    UPDATE project_student_applications
    SET status = ?, reviewed_by = ?, reviewed_at = datetime('now')
    WHERE id = ?
  `).run(status, req.user.id, appId);
  res.json({ success: true, status });
}));

/**
 * GET /:id/my-application — Student checks their own application status.
 */
router.get('/:id/my-application', requireRole('student'), wrap(async (req, res) => {
  const projectId = req.params.id;
  const application = db.prepare(
    "SELECT * FROM project_student_applications WHERE project_id = ? AND student_id = ? ORDER BY created_at DESC LIMIT 1"
  ).get(projectId, req.user.id);
  res.json({ application: application || null });
}));

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT ACCESS POLICIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PUT /:id/access-policy — Set or update the access policy for a project.
 * Only mentor / university / admin may configure this.
 */
router.put('/:id/access-policy', requireRole('mentor', 'university', 'admin'), wrap(async (req, res) => {
  const projectId = req.params.id;
  const { access_mode, institution_id, course_id, approval_required = 0, max_team_size } = req.body;
  if (!access_mode) return res.status(400).json({ error: 'access_mode is required.' });

  const existing = db.prepare('SELECT project_id FROM project_access_policies WHERE project_id = ?').get(projectId);
  if (existing) {
    db.prepare(`
      UPDATE project_access_policies
      SET access_mode = ?, institution_id = ?, course_id = ?, approval_required = ?, max_team_size = ?
      WHERE project_id = ?
    `).run(access_mode, institution_id || null, course_id || null, approval_required ? 1 : 0, max_team_size || null, projectId);
  } else {
    db.prepare(`
      INSERT INTO project_access_policies (project_id, access_mode, institution_id, course_id, approval_required, max_team_size, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(projectId, access_mode, institution_id || null, course_id || null, approval_required ? 1 : 0, max_team_size || null);
  }

  const policy = db.prepare('SELECT * FROM project_access_policies WHERE project_id = ?').get(projectId);
  res.json({ policy });
}));

/**
 * GET /:id/access-policy — Retrieve the access policy for a project.
 */
router.get('/:id/access-policy', wrap(async (req, res) => {
  const policy = db.prepare('SELECT * FROM project_access_policies WHERE project_id = ?').get(req.params.id);
  res.json({ policy: policy || null });
}));

module.exports = router;

