// backend/src/services/workspaceService.js

const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');

const BASE_WORKSPACE = process.env.WORKSPACE_PATH || './workspace';

/**
 * Workspace Service
 * Manages file operations within project sandboxes
 */

class WorkspaceService {
  /**
   * Create workspace directory for project
   */
  static createProjectWorkspace(projectId) {
    const projectPath = path.join(BASE_WORKSPACE, projectId);
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }
    return projectPath;
  }

  /**
   * Delete entire project workspace directory
   */
  static deleteProjectWorkspace(projectId) {
    const projectPath = path.join(BASE_WORKSPACE, projectId);
    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }
  }

  /**
   * Get project workspace path with validation
   */
  static getProjectPath(projectId) {
    const projectPath = path.resolve(path.join(BASE_WORKSPACE, projectId));
    const basePath = path.resolve(BASE_WORKSPACE);
    
    // Prevent directory traversal
    if (!projectPath.startsWith(basePath)) {
      throw new Error('Invalid project path');
    }
    
    return projectPath;
  }

  /**
   * Validate file path is within project
   */
  static validateFilePath(projectId, filePath) {
    const projectPath = this.getProjectPath(projectId);
    const fullPath = path.resolve(path.join(projectPath, filePath));
    
    if (!fullPath.startsWith(projectPath)) {
      throw new Error('Path traversal not allowed');
    }
    
    return fullPath;
  }

  /**
   * List files in project directory recursively
   */
  static listFiles(projectId, dirPath = '') {
    const projectPath = this.getProjectPath(projectId);
    const fullPath = dirPath ? this.validateFilePath(projectId, dirPath) : projectPath;

    if (!fs.existsSync(fullPath)) {
      return [];
    }

    const walk = (currentPath, relativePath) => {
      try {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        return entries.map(entry => {
          const isDir = entry.isDirectory();
          const nodePath = path.posix.join(relativePath, entry.name);
          const fullNodePath = path.join(currentPath, entry.name);
          
          return {
            name: entry.name,
            type: isDir ? 'directory' : 'file',
            isDir: isDir, // explicitly added for IDE frontend compatibility
            path: nodePath,
            size: isDir ? null : fs.statSync(fullNodePath).size,
            children: isDir ? walk(fullNodePath, nodePath) : undefined,
          };
        });
      } catch (err) {
        console.error('Failed walking directory:', err);
        return [];
      }
    };

    return walk(fullPath, dirPath || '');
  }

  /**
   * Read file content
   */
  static readFile(projectId, filePath) {
    const fullPath = this.validateFilePath(projectId, filePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found');
    }

    if (!fs.statSync(fullPath).isFile()) {
      throw new Error('Path is not a file');
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      return {
        path: filePath,
        content,
        size: content.length,
        type: this.detectFileType(filePath),
      };
    } catch (err) {
      throw new Error(`Failed to read file: ${err.message}`);
    }
  }

  /**
   * Create/update file
   */
  static writeFile(projectId, filePath, content) {
    const fullPath = this.validateFilePath(projectId, filePath);
    
    // Create directories if needed
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      fs.writeFileSync(fullPath, content, 'utf-8');
      return {
        path: filePath,
        size: content.length,
        created: true,
      };
    } catch (err) {
      throw new Error(`Failed to write file: ${err.message}`);
    }
  }

  /**
   * Delete file
   */
  static deleteFile(projectId, filePath, isAuthorized = false) {
    const fullPath = this.validateFilePath(projectId, filePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File or directory not found: ${filePath}`);
    }

    const protectedPaths = ['src', 'backend', 'routes', 'services', 'db', 'package.json', '.env', ''];
    let normalizedPath = filePath.replace(/^[\/\\]+/, '');
    if (normalizedPath === '.') normalizedPath = '';
    
    const isProtected = normalizedPath === '' || protectedPaths.some(p => p !== '' && (normalizedPath === p || normalizedPath.startsWith(p + '/')));
    
    if (isProtected && !isAuthorized) {
      throw new Error(`Deletion of protected path '${filePath}' denied. Request authorization from AI Mentor first.`);
    }

    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      return { path: filePath, deleted: true };
    } catch (err) {
      throw new Error(`Failed to safely delete file ${filePath}: ${err.message}`);
    }
  }

  /**
   * Rename file or directory
   */
  static renameFile(projectId, oldPath, newPath) {
    const fullOldPath = this.validateFilePath(projectId, oldPath);
    const fullNewPath = this.validateFilePath(projectId, newPath);
    if (!fs.existsSync(fullOldPath)) throw new Error('Source file not found');
    if (fs.existsSync(fullNewPath)) throw new Error('Destination file already exists');
    try {
      fs.renameSync(fullOldPath, fullNewPath);
      return { oldPath, newPath, renamed: true };
    } catch (err) {
      throw new Error(`Failed to rename file: ${err.message}`);
    }
  }

  /**
   * Create directory
   */
  static createDirectory(projectId, dirPath) {
    const fullPath = this.validateFilePath(projectId, dirPath);

    try {
      fs.mkdirSync(fullPath, { recursive: true });
      return { path: dirPath, created: true };
    } catch (err) {
      throw new Error(`Failed to create directory: ${err.message}`);
    }
  }

  /**
   * Create project structure from template
   */
  static initializeProjectStructure(projectId, template) {
    const projectPath = this.getProjectPath(projectId);

    const files = {
      'README.md': `# Project\n\nProject workspace initialized.\n\nStart with the first task.`,
      '.gitignore': `node_modules/\n.env\n.DS_Store\n*.log\ndist/\nbuild/`,
      'package.json': JSON.stringify({
        name: 'project',
        version: '1.0.0',
        description: 'Project for AMIT-BODHIT',
        main: 'index.js',
        scripts: { start: 'node index.js' },
        keywords: [],
        author: '',
        license: 'MIT',
      }, null, 2),
    };

    // Template-specific files
    if (template === 'nodejs') {
      files['index.js'] = '// Start your project here\nconsole.log("Hello World!");';
      files['src/index.js'] = '// Main file';
      files['src/utils.js'] = '// Utility functions';
    }

    if (template === 'react') {
      files['index.html'] = `
<!DOCTYPE html>
<html>
<head>
  <title>React App</title>
</head>
<body>
  <div id="root"></div>
  <script src="index.jsx"></script>
</body>
</html>
      `.trim();
      files['src/index.jsx'] = `
import React from 'react';
import ReactDOM from 'react-dom';

function App() {
  return <h1>Hello React!</h1>;
}

ReactDOM.render(<App />, document.getElementById('root'));
      `.trim();
    }

    if (template === 'python') {
      files['requirements.txt'] = '# Add dependencies here\n';
      files['main.py'] = '# Start your Python project here\nprint("Hello World!")';
      files['src/main.py'] = '# Main module';
    }

    // Write files
    Object.entries(files).forEach(([filePath, content]) => {
      try {
        this.writeFile(projectId, filePath, content);
      } catch (err) {
        console.error(`Failed to initialize ${filePath}:`, err.message);
      }
    });

    return { projectId, template, initialized: true };
  }

  /**
   * Detect file type from extension
   */
  static detectFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const typeMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.md': 'markdown',
      '.txt': 'text',
      '.sh': 'shell',
      '.bash': 'shell',
    };
    return typeMap[ext] || 'text';
  }

  /**
   * Get syntax highlighting language
   */
  static getLanguageMode(fileType) {
    const modeMap = {
      javascript: 'javascript',
      typescript: 'typescript',
      python: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      rust: 'rust',
      ruby: 'ruby',
      php: 'php',
      json: 'json',
      yaml: 'yaml',
      xml: 'xml',
      html: 'html',
      css: 'css',
      scss: 'scss',
      markdown: 'markdown',
      text: 'text',
      shell: 'shell',
    };
    return modeMap[fileType] || 'text';
  }

  /**
   * Get workspace statistics
   */
  static getWorkspaceStats(projectId) {
    const projectPath = this.getProjectPath(projectId);
    
    if (!fs.existsSync(projectPath)) {
      return { files: 0, directories: 0, totalSize: 0 };
    }

    let files = 0;
    let directories = 0;
    let totalSize = 0;

    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      entries.forEach(entry => {
        if (entry.isDirectory()) {
          directories++;
          walk(path.join(dir, entry.name));
        } else {
          files++;
          const stat = fs.statSync(path.join(dir, entry.name));
          totalSize += stat.size;
        }
      });
    };

    walk(projectPath);

    return {
      files,
      directories,
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    };
  }
}

module.exports = WorkspaceService;
