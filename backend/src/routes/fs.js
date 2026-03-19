const express = require('express');
const router = express.Router();
const WorkspaceService = require('../services/workspaceService');
const db = require('../db/database');

function getUserProject(req, projectId) {
  if (projectId) {
    const project = db.prepare('SELECT id, user_id FROM projects WHERE id = ?').get(projectId);
    if (!project || project.user_id !== req.user.id) {
      throw new Error('Access denied');
    }
    return project;
  }

  // Fall back to the most recent project for the user
  const project = db.prepare('SELECT id, user_id FROM projects WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(req.user.id);
  if (!project) {
    throw new Error('No project found for user');
  }
  return project;
}

/**
 * File System Routes
 * All operations are sandboxed to project workspace
 */

// ─────────────────────────────────────────────────────────────────────────────
// GET /files/:projectId - List files in directory
// ─────────────────────────────────────────────────────────────────────────────
router.get('/files/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const { dir = '' } = req.query;

    const project = getUserProject(req, projectId);

    const files = WorkspaceService.listFiles(projectId, dir);
    res.json({
      projectId,
      directory: dir || '/',
      files,
      stats: WorkspaceService.getWorkspaceStats(projectId),
    });
  } catch (err) {
    console.error('[FS] List error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /file/:projectId/* - Read file content
// ─────────────────────────────────────────────────────────────────────────────
router.get('/file/:projectId/*', (req, res) => {
  try {
    const { projectId } = req.params;
    const filePath = req.params[0]; // Capture everything after projectId/

    const project = getUserProject(req, projectId);

    const file = WorkspaceService.readFile(projectId, filePath);
    res.json(file);
  } catch (err) {
    console.error('[FS] Read error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /file/:projectId/* - Create or update file
// ─────────────────────────────────────────────────────────────────────────────
router.post('/file/:projectId/*', (req, res) => {
  try {
    const { projectId } = req.params;
    const filePath = req.params[0];
    const { content } = req.body;

    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'content must be a string' });
    }

    const project = getUserProject(req, projectId);

    const result = WorkspaceService.writeFile(projectId, filePath, content);
    res.json(result);
  } catch (err) {
    console.error('[FS] Write error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /file/:projectId/* - Delete file
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/file/:projectId/*', (req, res) => {
  try {
    const { projectId } = req.params;
    const filePath = req.params[0];

    const project = getUserProject(req, projectId);

    const result = WorkspaceService.deleteFile(projectId, filePath);
    res.json(result);
  } catch (err) {
    console.error('[FS] Delete error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /folder/:projectId/* - Create directory
// ─────────────────────────────────────────────────────────────────────────────
router.post('/folder/:projectId/*', (req, res) => {
  try {
    const { projectId } = req.params;
    const dirPath = req.params[0];

    const project = getUserProject(req, projectId);

    const result = WorkspaceService.createDirectory(projectId, dirPath);
    res.json(result);
  } catch (err) {
    console.error('[FS] Folder create error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Compatibility endpoints used by the IDE frontend
// ─────────────────────────────────────────────────────────────────────────────

router.get('/tree', (req, res) => {
  try {
    const project = getUserProject(req, req.query.projectId);
    const dir = req.query.dir || '';
    const files = WorkspaceService.listFiles(project.id, dir);
    res.json({ projectId: project.id, directory: dir || '/', tree: files });
  } catch (err) {
    console.error('[FS] Tree error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

router.get('/file', (req, res) => {
  try {
    const project = getUserProject(req, req.query.projectId);
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'path query param required' });

    const file = WorkspaceService.readFile(project.id, filePath);
    res.json(file);
  } catch (err) {
    console.error('[FS] Read error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

router.post('/file', (req, res) => {
  try {
    const project = getUserProject(req, req.body.projectId);
    const { path: filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: 'path required' });
    if (typeof content !== 'string') return res.status(400).json({ error: 'content must be a string' });

    const result = WorkspaceService.writeFile(project.id, filePath, content);
    res.json(result);
  } catch (err) {
    console.error('[FS] Write error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

router.post('/touch', (req, res) => {
  try {
    const project = getUserProject(req, req.body.projectId);
    const { path: filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: 'path required' });

    const result = WorkspaceService.writeFile(project.id, filePath, '');
    res.json(result);
  } catch (err) {
    console.error('[FS] Touch error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

router.post('/mkdir', (req, res) => {
  try {
    const project = getUserProject(req, req.body.projectId);
    const { path: dirPath } = req.body;
    if (!dirPath) return res.status(400).json({ error: 'path required' });

    const result = WorkspaceService.createDirectory(project.id, dirPath);
    res.json(result);
  } catch (err) {
    console.error('[FS] Mkdir error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /init/:projectId - Initialize project workspace
// ─────────────────────────────────────────────────────────────────────────────
router.post('/init/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const { template = 'nodejs' } = req.body;

    // Verify project belongs to user
    const project = db.prepare('SELECT id, user_id FROM projects WHERE id = ?').get(projectId);
    if (!project || project.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = WorkspaceService.initializeProjectStructure(projectId, template);
    res.json(result);
  } catch (err) {
    console.error('[FS] Init error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /stats/:projectId - Get workspace statistics
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify project belongs to user
    const project = db.prepare('SELECT id, user_id FROM projects WHERE id = ?').get(projectId);
    if (!project || project.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stats = WorkspaceService.getWorkspaceStats(projectId);
    res.json({ projectId, ...stats });
  } catch (err) {
    console.error('[FS] Stats error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

