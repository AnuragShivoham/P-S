const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const WorkspaceService = require('../services/workspaceService');
const { userCanAccessProject } = require('../security/projectAccess');

const router = express.Router();

router.post('/:projectId/token', authMiddleware, (req, res) => {
    const { projectId } = req.params;
    if (!userCanAccessProject(req.user, projectId)) {
        return res.status(404).json({ error: 'Project not found or access denied.' });
    }
    const token = jwt.sign(
        { sub: req.user.id, projectId, purpose: 'project-preview' },
        config.JWT_SECRET,
        { expiresIn: '5m' }
    );
    res.json({ token, expiresIn: 300 });
});

function serveProjectPreview(req, res, token, subPath) {
    const { projectId } = req.params;
    res.set({
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff'
    });
    try {
        const claims = token && jwt.verify(token, config.JWT_SECRET);
        if (!claims || claims.purpose !== 'project-preview' || claims.projectId !== projectId) {
            return res.status(401).send('A valid project preview token is required.');
        }
        const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(claims.sub);
        if (!user || !userCanAccessProject(user, projectId)) {
            return res.status(403).send('Project access denied.');
        }

        const workspacePath = WorkspaceService.getProjectPath(projectId);
        const rootPath = path.resolve(workspacePath);
        let fullPath = path.resolve(rootPath, subPath || 'index.html');
        const relativePath = path.relative(rootPath, fullPath);

        // Reject traversal and symlink targets outside the project directory.
        if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
            return res.status(403).send('Access Denied');
        }

        // Handle directories - look for index.html
        if (!fs.existsSync(fullPath)) return res.status(404).send('File not found in workspace');
        if (fs.statSync(fullPath).isDirectory()) {
            fullPath = path.join(fullPath, 'index.html');
            if (!fs.existsSync(fullPath)) return res.status(404).send('Directory index not found');
        }

        const realWorkspacePath = fs.realpathSync(rootPath);
        const realFullPath = fs.realpathSync(fullPath);
        const realRelativePath = path.relative(realWorkspacePath, realFullPath);
        if (realRelativePath.startsWith('..') || path.isAbsolute(realRelativePath)) {
            return res.status(403).send('Access Denied');
        }

        // Special handling for HTML to inject live reload script (Simulated)
        if (fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            const injectScript = `
                <script>
                    console.log('[LiveServer] System Online');
                    // Simple interval check for updates (simulated HMR)
                    let lastUpdate = Date.now();
                    setInterval(async () => {
                        try {
                            const r = await fetch(window.location.href, { method: 'HEAD' });
                            const newDate = new Date(r.headers.get('last-modified')).getTime();
                            if (newDate > lastUpdate) {
                                window.location.reload();
                            }
                        } catch(e) {}
                    }, 2000);
                </script>
            `;
            content = content.replace('</body>', `${injectScript}</body>`);
            return res.send(content);
        }

        res.sendFile(fullPath);
    } catch (e) {
        if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
            return res.status(401).send('Invalid or expired project preview token.');
        }
        console.error('[Preview Error]', e.message);
        res.status(500).send('Preview Error');
    }
}

// Put the short-lived signed token in the path so relative preview assets keep
// carrying it on every request (query strings are dropped for relative assets).
router.get('/:projectId/:token/*', (req, res) => {
    serveProjectPreview(req, res, req.params.token, req.params[0] || 'index.html');
});

// Legacy query-string token support for already-open previews.
router.get('/:projectId/*', (req, res) => {
    serveProjectPreview(req, res, req.query.token, req.params[0] || 'index.html');
});

module.exports = router;
