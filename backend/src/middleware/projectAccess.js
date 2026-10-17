const db = require('../db/database');

function getProjectPermission(user, projectId) {
  if (!user?.id || !projectId) return { level: 'deny', project: null };
  const project = db.prepare('SELECT id, user_id FROM projects WHERE id = ?').get(projectId);
  if (!project) return { level: 'deny', project: null };
  if (project.user_id === user.id) return { level: 'owner', project };

  const grant = db.prepare(`SELECT access_level FROM project_access_grants
    WHERE project_id = ? AND user_id = ?`).get(projectId, user.id);
  if (grant && ['read', 'write'].includes(grant.access_level)) {
    return { level: grant.access_level, project };
  }

  const teamMember = db.prepare(`SELECT m.access_level FROM project_teams t
    JOIN project_team_members m ON m.team_id = t.id
    WHERE t.project_id = ? AND m.user_id = ? AND m.status = 'active'
    ORDER BY CASE WHEN m.access_level = 'write' THEN 0 ELSE 1 END LIMIT 1`).get(projectId, user.id);
  if (teamMember && ['read', 'write'].includes(teamMember.access_level)) {
    return { level: teamMember.access_level, project };
  }

  const institutionShare = db.prepare(`SELECT ap.institution_id FROM project_access_policies ap
    JOIN institution_memberships im ON im.institution_id = ap.institution_id
    WHERE ap.project_id = ? AND ap.access_mode = 'institution' AND im.user_id = ? AND im.status = 'active'
      AND im.member_type IN ('student', 'faculty', 'mentor', 'university')
    LIMIT 1`).get(projectId, user.id);
  if (institutionShare) return { level: 'read', project };

  return { level: 'deny', project };
}

function requireProjectPermission(user, projectId, write = false) {
  const permission = getProjectPermission(user, projectId);
  const allowed = permission.level === 'owner' || permission.level === 'write' || (!write && permission.level === 'read');
  return { ...permission, allowed };
}

function requireExplicitMentorAssignment(user, projectId) {
  if (!user?.id || !projectId) return false;
  const project = db.prepare('SELECT user_id, requested_mentor_id FROM projects WHERE id = ?').get(projectId);
  return !!project && (project.requested_mentor_id === user.id || !!db.prepare(`SELECT 1 FROM project_teams t
    JOIN project_team_members m ON m.team_id = t.id WHERE t.project_id = ? AND m.user_id = ? AND m.status = 'active'`)
    .get(projectId, user.id));
}

function requireAssignedMentorProject(req, res, projectId) {
  const permission = requireProjectPermission(req.user, projectId, false);
  const assigned = req.user?.role === 'mentor' && requireExplicitMentorAssignment(req.user, projectId);
  if (!permission.project) {
    res.status(404).json({ error: 'Project not found.' });
    return false;
  }
  if (permission.allowed || assigned) return true;
  res.status(403).json({ error: 'Project owner has not granted this mentor access.' });
  return false;
}

module.exports = { getProjectPermission, requireProjectPermission, requireExplicitMentorAssignment, requireAssignedMentorProject };