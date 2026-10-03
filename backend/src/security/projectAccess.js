const db = require('../db/database');

function userCanAccessProject(user, projectId, database = db) {
  if (!user?.id || !projectId) return false;
  if (String(user.role || '').toLowerCase() === 'admin') return true;

  const project = database.prepare(
    'SELECT id, user_id, active_mentor_id, requested_mentor_id FROM projects WHERE id = ?'
  ).get(projectId);
  if (!project) return false;
  if (project.user_id === user.id || project.active_mentor_id === user.id || project.requested_mentor_id === user.id) return true;

  return Boolean(database.prepare(`
    SELECT 1
    FROM project_team_members tm
    JOIN project_teams t ON t.id = tm.team_id
    WHERE t.project_id = ? AND tm.user_id = ? AND tm.status = 'active'
    LIMIT 1
  `).get(projectId, user.id));
}

function userCanManageProject(user, projectId, database = db) {
  if (!user?.id || !projectId) return false;
  if (String(user.role || '').toLowerCase() === 'admin') return true;
  const project = database.prepare(
    'SELECT user_id, active_mentor_id FROM projects WHERE id = ?'
  ).get(projectId);
  return Boolean(project && (project.user_id === user.id || project.active_mentor_id === user.id));
}

function requireProjectAccess(req, res, next) {
  const projectId = req.params.projectId || req.params.id || req.query.projectId || req.body?.projectId;
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  if (!projectId) return res.status(400).json({ error: 'Project ID is required.' });
  if (!userCanAccessProject(req.user, projectId)) {
    return res.status(404).json({ error: 'Project not found or access denied.' });
  }
  req.projectId = projectId;
  next();
}

module.exports = { userCanAccessProject, userCanManageProject, requireProjectAccess };
