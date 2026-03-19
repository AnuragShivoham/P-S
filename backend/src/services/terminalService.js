const os = require('os');
const path = require('path');
const pty = require('node-pty');
const { v4: uuid } = require('uuid');
const db = require('../db/database');

// Allowed commands list (for security)
const ALLOWED_COMMANDS = new Set([
  'npm', 'node', 'yarn', 'pnpm',
  'python', 'python3', 'pip', 'pip3',
  'git', 'docker', 'docker-compose',
  'gcc', 'g++', 'make',
  'ruby', 'bundle',
  'java', 'javac',
  'go', 'cargo',
  'ls', 'cd', 'pwd', 'mkdir', 'rm', 'cp', 'mv',
  'cat', 'echo', 'touch', 'chmod',
  'curl', 'wget', 'grep', 'find',
  'clear', 'exit',
]);

// Forbidden commands
const FORBIDDEN_PATTERNS = [
  /rm\s+-rf\s+\//,           // Don't allow rm -rf /
  /sudo/,                     // No sudo
  /chown/,                    // No chown
  /passwd/,                   // No password changes
  /shutdown|reboot|halt/,     // No system shutdown
];

/**
 * Validate command against security rules
 */
function isCommandAllowed(command) {
  const trimmed = command.trim();
  
  // Check forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { allowed: false, reason: 'Command not permitted' };
    }
  }
  
  // Check allowed commands
  const cmd = trimmed.split(/\s+/)[0];
  if (!ALLOWED_COMMANDS.has(cmd)) {
    return { allowed: false, reason: `Command '${cmd}' not allowed` };
  }
  
  return { allowed: true };
}

/**
 * Parse command to extract executable and args
 */
function parseCommand(command) {
  const parts = command.trim().split(/\s+/);
  return {
    executable: parts[0],
    args: parts.slice(1),
    full: command.trim(),
  };
}

/**
 * Log command execution
 */
function logCommand(projectId, taskId, command, exitCode, stdout, stderr) {
  try {
    const stmt = db.prepare(`
      INSERT INTO command_logs 
      (id, project_id, task_id, command, exit_code, stdout, stderr, executed_at, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
    `);
    
    stmt.run(
      uuid(),
      projectId,
      taskId || null,
      command,
      exitCode || 0,
      stdout || '',
      stderr || '',
      null
    );
  } catch (err) {
    console.error('[Terminal] Failed to log command:', err.message);
  }
}

/**
 * Setup WebSocket terminal connections
 */
function setupTerminalWS(wss, authenticate) {
  wss.on('connection', (ws, req) => {
    // Extract auth from URL params
    const url = new URL(req.url, `http://${req.headers.host}`);
    const projectId = url.searchParams.get('projectId');
    const token = url.searchParams.get('token');

    if (!projectId || !token) {
      ws.close(1008, 'Missing credentials');
      return;
    }


    console.log(`[Terminal] New connection for project: ${projectId}`);

    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const shellArgs = os.platform() === 'win32' 
      ? ['-NoLogo', '-ExecutionPolicy', 'Bypass'] 
      : [];

    const workspacePath = path.resolve(
      path.join(__dirname, '../../../workspace', projectId)
    );

    // Ensure workspace directory exists
    const fs = require('fs');
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
    }

    const ptyProcess = pty.spawn(shell, shellArgs, {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: workspacePath,
      env: { ...process.env, PROJECT_ID: projectId },
    });

    let commandBuffer = '';
    let isExecutingCommand = false;

    // Send terminal output to frontend
    ptyProcess.onData((data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'output', data }));
      }
    });

    // Receive input from frontend
    ws.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg);

        if (parsed.type === 'input') {
          const input = parsed.data;
          
          // Accumulate input for command detection
          commandBuffer += input;

          // Check for command execution (newline)
          if (input.includes('\n') || input.includes('\r')) {
            const command = commandBuffer.trim();
            commandBuffer = '';

            if (command && command.length > 0) {
              // Validate command
              const validation = isCommandAllowed(command);
              if (!validation.allowed) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: `Command blocked: ${validation.reason}`,
                }));
                // Send command prompt without executing
                if (shell === 'powershell.exe') {
                  ptyProcess.write('Write-Host "PS>" -NoNewline\n');
                }
                return;
              }

              // Log command
              logCommand(parsed.projectId || projectId, parsed.taskId || null, command, null, null, null);
            }
          }

          // Write to PTY
          ptyProcess.write(input);

        } else if (parsed.type === 'resize') {
          ptyProcess.resize(parsed.cols || 80, parsed.rows || 24);

        } else if (parsed.type === 'clear') {
          ptyProcess.write(os.platform() === 'win32' ? 'clear\n' : 'clear\n');
        }
      } catch (err) {
        console.error('[Terminal] Message parsing error:', err.message);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format' 
        }));
      }
    });

    ws.on('close', () => {
      try {
        ptyProcess.kill();
        console.log(`[Terminal] Connection closed for project: ${projectId}`);
      } catch (err) {
        console.error('[Terminal] Error closing PTY:', err.message);
      }
    });

    ws.on('error', (err) => {
      console.error(`[Terminal] WebSocket error (${projectId}):`, err.message);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      message: `Connected to project workspace: ${projectId}`,
      platform: os.platform(),
      cwd: workspacePath,
    }));
  });
}

module.exports = { setupTerminalWS };
