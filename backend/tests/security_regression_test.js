const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { DatabaseSync } = require('node:sqlite');
const WebSocket = require('ws');

const backendDir = path.resolve(__dirname, '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socrates-security-'));
const port = 32000 + Math.floor(Math.random() * 20000);
const secret = 'security-regression-suite-secret-value-32-chars-minimum';
const workspacePath = path.join(tempDir, 'workspace');

let serverProcess;
let baseUrl;

async function waitForHealth() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) throw new Error('Backend exited before becoming healthy.');
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Timed out waiting for backend health check.');
}

async function request(pathname, { token, ...options } = {}) {
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return fetch(`${baseUrl}${pathname}`, { ...options, headers });
}

function report(name) {
  console.log(`  PASS ${name}`);
}

async function expectTerminalDisabled(projectId, token) {
  await new Promise((resolve, reject) => {
    const socket = new WebSocket(`${baseUrl.replace(/^http/, 'ws')}/api/v1/terminal?projectId=${encodeURIComponent(projectId)}&token=${encodeURIComponent(token)}`);
    const timeout = setTimeout(() => reject(new Error('Terminal did not reject the production WebSocket request.')), 5000);
    socket.on('unexpected-response', (_request, response) => {
      clearTimeout(timeout);
      assert.equal(response.statusCode, 503);
      response.resume();
      report('production terminal shell is disabled by default');
      resolve();
    });
    socket.on('open', () => {
      clearTimeout(timeout);
      socket.close();
      reject(new Error('Terminal unexpectedly accepted a production WebSocket connection.'));
    });
    socket.on('error', error => {
      if (!String(error.message).includes('Unexpected server response')) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  });
}

async function expectSocketReject(url, origin, expectedStatus) {
  await new Promise((resolve, reject) => {
    const socket = new WebSocket(url, { headers: { Origin: origin } });
    const timeout = setTimeout(() => reject(new Error('WebSocket authorization did not reject the connection.')), 5000);
    socket.on('unexpected-response', (_request, response) => {
      clearTimeout(timeout);
      assert.equal(response.statusCode, expectedStatus);
      response.resume();
      resolve();
    });
    socket.on('open', () => {});
    socket.on('close', code => {
      clearTimeout(timeout);
      assert.equal(code, expectedStatus);
      resolve();
    });
    socket.on('error', error => {
      if (!String(error.message).includes('Unexpected server response')) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  });
}

async function main() {
  serverProcess = spawn(process.execPath, ['src/server.js'], {
    cwd: backendDir,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      DB_PATH: path.join(tempDir, 'socrates.db'),
      WORKSPACE_PATH: workspacePath,
      JWT_SECRET: secret,
      ADMIN_EMAILS: 'security-admin@example.test',
      ADMIN_PASSWORD: 'security-test-admin-password',
      FRONTEND_URL: 'https://p-s-khaki.vercel.app',
      ALLOW_VERCEL_PREVIEWS: 'false',
      ENABLE_TERMINAL: 'true',
      ENABLE_DEMO_SEED_DATA: 'false'
    },
    stdio: 'ignore'
  });
  baseUrl = `http://127.0.0.1:${port}`;

  try {
    await waitForHealth();
    console.log('SECURITY REGRESSION TESTS');

    let response = await request('/api/v1/labour/ontology/skills');
    assert.equal(response.status, 200);
    report('public labour ontology remains accessible');

    response = await request('/api/v1/labour/signals');
    assert.equal(response.status, 401);
    report('raw industry signal data requires reviewer authentication');

    response = await request('/api/v1/labour/ontology/skills', { headers: { Authorization: 'Bearer invalid' } });
    assert.equal(response.status, 401);
    report('invalid optional bearer token fails closed');

    response = await request('/api/v1/labour/signals/ingest', {
      method: 'POST', body: JSON.stringify({ source_name: 'x', raw_content: 'x' })
    });
    assert.equal(response.status, 401);
    report('anonymous labour signal ingestion is rejected');

    response = await request('/api/v1/auth/send-otp', {
      method: 'POST', body: JSON.stringify({ email: 'security-admin@example.test', action: 'signup' })
    });
    assert.equal(response.status, 403);
    const otpDb = new DatabaseSync(path.join(tempDir, 'socrates.db'));
    assert.equal(otpDb.prepare('SELECT COUNT(*) AS count FROM otp_requests WHERE email = ?').get('security-admin@example.test').count, 0);
    otpDb.close();
    report('configured admin email is reserved before its first login and receives no OTP');

    response = await request('/api/v1/auth/admin-login', {
      method: 'POST', body: JSON.stringify({ email: 'security-admin@example.test', password: 'security-test-admin-password' })
    });
    assert.equal(response.status, 200);
    const bootstrapLogin = await response.json();
    const { token: adminToken } = bootstrapLogin;
    assert.equal(bootstrapLogin.user.role, 'admin');

    const testDb = new DatabaseSync(path.join(tempDir, 'socrates.db'));
    const bootstrapAdmin = testDb.prepare('SELECT role FROM users WHERE email = ?').get('security-admin@example.test');
    assert.equal(bootstrapAdmin.role, 'admin');
    report('configured bootstrap admin signs in without prior signup');

    response = await request('/api/v1/auth/admin-login', {
      method: 'POST', body: JSON.stringify({ email: 'unapproved-admin@example.test', password: 'security-test-admin-password' })
    });
    assert.equal(response.status, 401);
    report('unapproved email cannot bootstrap an admin account');

    response = await request('/api/v1/auth/send-otp', {
      method: 'POST', body: JSON.stringify({ email: 'security-admin@example.test', action: 'login' })
    });
    assert.equal(response.status, 403);
    report('admin accounts cannot bypass password login through email OTP');

    testDb.prepare('INSERT INTO otp_requests (id, email, otp, expires_at) VALUES (?, ?, ?, ?)')
      .run('admin-otp-regression', 'security-admin@example.test', '123456', new Date(Date.now() + 60000).toISOString());
    response = await request('/api/v1/auth/verify-otp', {
      method: 'POST', body: JSON.stringify({ email: 'security-admin@example.test', otp: '123456', role: 'student', action: 'login' })
    });
    assert.equal(response.status, 403);
    report('admin accounts cannot bypass password login through OTP verification');

    assert.equal(testDb.prepare("SELECT COUNT(*) AS count FROM users WHERE id LIKE 'demo_%'").get().count, 0);
    assert.equal(testDb.prepare("SELECT COUNT(*) AS count FROM industry_signals WHERE id LIKE 'sig_msft_%'").get().count, 0);
    report('production database starts without demo personas or sample market signals');
    const student = {
      id: `security-student-${Date.now()}`,
      email: `security-student-${Date.now()}@example.test`,
      name: 'Security Test Student'
    };
    const attacker = {
      id: `security-attacker-${Date.now()}`,
      email: `security-attacker-${Date.now()}@example.test`,
      name: 'Security Test Attacker'
    };
    const newAdmin = {
      id: `security-new-admin-${Date.now()}`,
      email: `security-new-admin-${Date.now()}@example.test`,
      name: 'Security Test New Admin'
    };
    const provisionedMentor = {
      id: `security-mentor-${Date.now()}`,
      email: `security-mentor-${Date.now()}@example.test`,
      name: 'Security Test Mentor'
    };
    const provisionedUniversity = {
      id: `security-university-${Date.now()}`,
      email: `security-university-${Date.now()}@example.test`,
      name: 'Security Test University'
    };
    testDb.prepare('INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)')
      .run(student.id, student.email, student.name, 'student');
    testDb.prepare('INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)')
      .run(attacker.id, attacker.email, attacker.name, 'student');
    testDb.prepare('INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)')
      .run(newAdmin.id, newAdmin.email, newAdmin.name, 'student');
    testDb.prepare('INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)')
      .run(provisionedMentor.id, provisionedMentor.email, provisionedMentor.name, 'mentor');
    testDb.prepare('INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)')
      .run(provisionedUniversity.id, provisionedUniversity.email, provisionedUniversity.name, 'university');
    const studentToken = jwt.sign({ id: student.id, email: student.email, role: 'student' }, secret, { expiresIn: '5m' });
    const attackerToken = jwt.sign({ id: attacker.id, email: attacker.email, role: 'student' }, secret, { expiresIn: '5m' });

    response = await request('/api/v1/auth/role', {
      method: 'PUT', token: studentToken, body: JSON.stringify({ role: 'mentor' })
    });
    assert.equal(response.status, 403);
    report('self-service role escalation is rejected');

    response = await request('/api/v1/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email: 'new-mentor@example.test', otp: '000000', role: 'mentor', action: 'signup' })
    });
    assert.equal(response.status, 403);
    report('self-service mentor account creation is rejected');

    const expiresAt = new Date(Date.now() + 60000).toISOString();
    testDb.prepare('INSERT INTO otp_requests (id, email, otp, expires_at) VALUES (?, ?, ?, ?)')
      .run('provisioned-mentor-otp', provisionedMentor.email, '234561', expiresAt);
    response = await request('/api/v1/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email: provisionedMentor.email, otp: '234561', role: 'mentor', action: 'login' })
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).user.role, 'mentor');
    report('administrator-provisioned mentor can use the signup page OTP sign-in path');

    testDb.prepare('INSERT INTO otp_requests (id, email, otp, expires_at) VALUES (?, ?, ?, ?)')
      .run('provisioned-university-otp', provisionedUniversity.email, '234562', expiresAt);
    response = await request('/api/v1/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email: provisionedUniversity.email, otp: '234562', role: 'university', action: 'login' })
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).user.role, 'university');
    report('administrator-provisioned university can use the signup page OTP sign-in path');

    testDb.prepare('INSERT INTO otp_requests (id, email, otp, expires_at) VALUES (?, ?, ?, ?)')
      .run('wrong-provisioned-role-otp', provisionedMentor.email, '234563', expiresAt);
    response = await request('/api/v1/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email: provisionedMentor.email, otp: '234563', role: 'university', action: 'login' })
    });
    assert.equal(response.status, 403);
    assert.equal(testDb.prepare('SELECT used FROM otp_requests WHERE id = ?').get('wrong-provisioned-role-otp').used, 1);
    report('provisioned role cannot be changed by selecting another role during OTP login');

    response = await request('/api/v1/admin/users/demo_student/role', {
      method: 'PUT', token: studentToken, body: JSON.stringify({ role: 'admin' })
    });
    assert.equal(response.status, 403);
    report('non-admin cannot assign privileged roles');

    response = await request(`/api/v1/admin/users/${newAdmin.id}/role`, {
      method: 'PUT', token: adminToken, body: JSON.stringify({ role: 'admin' })
    });
    assert.equal(response.status, 200);
    assert.equal(testDb.prepare('SELECT role FROM users WHERE id = ?').get(newAdmin.id).role, 'admin');
    response = await request('/api/v1/auth/admin-login', {
      method: 'POST', body: JSON.stringify({ email: newAdmin.email, password: 'security-test-admin-password' })
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).user.role, 'admin');
    response = await request('/api/v1/auth/send-otp', {
      method: 'POST', body: JSON.stringify({ email: newAdmin.email, action: 'signup' })
    });
    assert.equal(response.status, 403);
    report('newly provisioned admin emails cannot be reused for signup or OTP');
    report('existing admin can provision another admin, who can then sign in');

    response = await request(`/api/v1/users/${student.id}`, { token: adminToken });
    assert.equal(response.status, 200);
    response = await request(`/api/v1/users/${student.id}`, { token: studentToken });
    assert.equal(response.status, 200);
    response = await request(`/api/v1/users/${student.id}`, { token: attackerToken });
    assert.equal(response.status, 404);
    report('user profiles are self/admin-only');

    const projectId = `security-project-${Date.now()}`;
    const milestoneId = `security-milestone-${Date.now()}`;
    const taskId = `security-task-${Date.now()}`;
    testDb.prepare(`
      INSERT INTO projects (id, user_id, raw_goal, title, status)
      VALUES (?, ?, ?, ?, 'active')
    `).run(projectId, student.id, 'Disposable security test project', 'Security Test Project');
    testDb.prepare(`
      INSERT INTO milestones (id, project_id, ord, title, status)
      VALUES (?, ?, 1, 'Test milestone', 'in_progress')
    `).run(milestoneId, projectId);
    testDb.prepare(`
      INSERT INTO tasks (id, milestone_id, ord, day, title, status)
      VALUES (?, ?, 1, 1, 'Test task', 'pending')
    `).run(taskId, milestoneId);
    const otherProjectId = `security-other-project-${Date.now()}`;
    const ownerTeamId = `security-owner-team-${Date.now()}`;
    const otherTeamId = `security-other-team-${Date.now()}`;
    const otherMemberId = `security-other-member-${Date.now()}`;
    testDb.prepare(`INSERT INTO projects (id, user_id, raw_goal, title, status) VALUES (?, ?, ?, ?, 'active')`)
      .run(otherProjectId, attacker.id, 'Other project', 'Other Security Test Project');
    testDb.prepare('INSERT INTO project_teams (id, project_id, name) VALUES (?, ?, ?)')
      .run(ownerTeamId, projectId, 'Owner team');
    testDb.prepare('INSERT INTO project_teams (id, project_id, name) VALUES (?, ?, ?)')
      .run(otherTeamId, otherProjectId, 'Other team');
    testDb.prepare(`
      INSERT INTO project_team_members (id, team_id, user_id, role, status)
      VALUES (?, ?, ?, 'Student', 'active')
    `).run(otherMemberId, otherTeamId, attacker.id);
    testDb.close();
    const ownerToken = jwt.sign({ id: student.id, email: student.email, role: 'student' }, secret, { expiresIn: '5m' });

    response = await request(`/api/v1/labour/students/${student.id}/evidence`, { token: ownerToken });
    assert.equal(response.status, 200);
    report('student can read own evidence');

    response = await request(`/api/v1/labour/students/${student.id}/evidence`, { token: attackerToken });
    assert.equal(response.status, 403);
    report('student cannot read another learner evidence');

    response = await request(`/api/v1/projects/${projectId}/impact`, { token: attackerToken });
    assert.equal(response.status, 404);
    report('unrelated student cannot read project extension data');

    response = await request(`/api/v1/projects/${projectId}/memory`, { token: attackerToken });
    assert.equal(response.status, 404);
    report('unrelated student cannot read core project memory');

    response = await request(`/api/v1/projects/${projectId}/team/member/${otherMemberId}`, {
      method: 'DELETE', token: ownerToken
    });
    assert.equal(response.status, 404);
    const verifyDb = new DatabaseSync(path.join(tempDir, 'socrates.db'));
    assert.ok(verifyDb.prepare('SELECT id FROM project_team_members WHERE id = ?').get(otherMemberId));
    verifyDb.close();
    report('team member IDs cannot mutate membership in another project');

    response = await request(`/api/v1/tasks/${taskId}`, { token: attackerToken });
    assert.equal(response.status, 404);
    report('unrelated student cannot read another project task');

    response = await request(`/api/v1/session/context/${projectId}`, { token: attackerToken });
    assert.equal(response.status, 404);
    report('unrelated student cannot access mentor session context');

    response = await request(`/api/v1/goals/confirm`, {
      method: 'POST', token: attackerToken,
      body: JSON.stringify({ project_id: projectId, milestones: [{ title: 'malicious plan' }] })
    });
    assert.equal(response.status, 404);
    report('user cannot confirm another project plan');

    response = await request('/api/v1/mentor/join', {
      method: 'POST', token: attackerToken, body: JSON.stringify({ projectId })
    });
    assert.equal(response.status, 403);
    report('students cannot acquire mentor session locks');

    const unauthorizedSocketUrl = `${baseUrl.replace(/^http/, 'ws')}/api/v1/session?projectId=${encodeURIComponent(projectId)}&token=${encodeURIComponent(attackerToken)}`;
    await expectSocketReject(unauthorizedSocketUrl, 'https://p-s-khaki.vercel.app', 4003);
    report('unrelated student collaboration WebSocket is rejected before room join');

    const rejectedOriginSocketUrl = `${baseUrl.replace(/^http/, 'ws')}/api/v1/session?projectId=${encodeURIComponent(projectId)}&token=${encodeURIComponent(ownerToken)}`;
    await expectSocketReject(rejectedOriginSocketUrl, 'https://evil.example', 403);
    report('unapproved WebSocket Origin is rejected');

    response = await request(`/api/v1/preview/${projectId}/token`, { method: 'POST', token: attackerToken });
    assert.equal(response.status, 404);
    report('unrelated student cannot mint a project preview token');

    response = await request(`/api/v1/preview/${projectId}/token`, { method: 'POST', token: ownerToken });
    assert.equal(response.status, 200);
    const { token: previewToken } = await response.json();
    const projectWorkspace = path.join(workspacePath, projectId);
    fs.mkdirSync(projectWorkspace, { recursive: true });
    fs.writeFileSync(path.join(projectWorkspace, 'index.html'), '<html><body>private preview</body></html>');

    response = await request(`/api/v1/preview/${projectId}/index.html`);
    assert.equal(response.status, 401);

    response = await request(`/api/v1/preview/${projectId}/${encodeURIComponent(previewToken)}/`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /private preview/);
    report('project owner preview token authorizes HTML and path-scoped assets');

    response = await request(`/api/v1/fs/file?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent('../outside.txt')}`, { token: ownerToken });
    assert.equal(response.status, 400);
    report('filesystem traversal outside a project workspace is rejected');

    fs.mkdirSync(path.join(projectWorkspace, 'src'), { recursive: true });
    fs.writeFileSync(path.join(projectWorkspace, 'src', 'keep.js'), 'protected');
    response = await request(`/api/v1/fs/file?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent('nested/../src')}`, {
      method: 'DELETE', token: ownerToken
    });
    assert.equal(response.status, 400);
    assert.equal(fs.existsSync(path.join(projectWorkspace, 'src', 'keep.js')), true);
    report('protected-file deletion cannot be bypassed with path aliases');

    const outsideDir = path.join(tempDir, 'outside-workspace');
    fs.mkdirSync(outsideDir, { recursive: true });
    fs.writeFileSync(path.join(outsideDir, 'secret.txt'), 'outside project secret');
    try {
      fs.symlinkSync(outsideDir, path.join(projectWorkspace, 'external-link'), 'junction');
      response = await request(`/api/v1/fs/file?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent('external-link/secret.txt')}`, { token: ownerToken });
      assert.equal(response.status, 400);
      report('filesystem symlink escape is rejected');
    } catch (error) {
      if (error.code !== 'EPERM' && error.code !== 'EACCES' && error.code !== 'ENOTSUP') throw error;
      console.log('  SKIP filesystem symlink test: this OS does not permit creating test junctions.');
    }

    response = await request('/api/v1/media/upload', {
      method: 'POST', body: JSON.stringify({ originalName: 'x.png', mimeType: 'image/png', dataBase64: 'AA==' })
    });
    assert.equal(response.status, 401);
    report('anonymous media uploads are rejected');

    await expectTerminalDisabled(projectId, ownerToken);
  } finally {
    if (serverProcess && serverProcess.exitCode === null) {
      serverProcess.kill();
      await new Promise(resolve => {
        const timer = setTimeout(resolve, 3000);
        serverProcess.once('exit', () => { clearTimeout(timer); resolve(); });
      });
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
