const BASE = '/api/v1';
async function req(method, path, body) {
  const token = localStorage.getItem('ab_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  console.log(`[API] ${method} ${path}`, body || '');
  const r = await fetch(`${BASE}${path}`, opts);
  const d = await r.json();
  if (!r.ok) {
    if (r.status === 401) {
      localStorage.removeItem('ab_token');
      window.location.href = '/login';
    }
    console.error(`[API ERROR] ${method} ${path} -> ${r.status}`, d);
    throw new Error(d.error || `HTTP ${r.status}`);
  }
  return d;
}
const get = p => req('GET', p);
const post = (p, b) => req('POST', p, b);
export const api = {
  createUser: (email, name, skill_level) => post('/users', { email, name, skill_level }),
  getUser: (id) => get(`/users/${id}`),
  submitGoal: (uid, rg) => post('/goals/submit', { user_id: uid, raw_goal: rg }),
  clarifyGoal: (pid, ans) => post('/goals/clarify', { project_id: pid, answers: ans }),
  getProject: (id) => get(`/projects/${id}`),
  getLatestProject: () => get('/projects/latest'),
  debugLog: (data) => post('/debug/log', data),
  getUserProjects: (uid) => get(`/users/${uid}/projects`),
  resumeProject: (id) => get(`/projects/${id}/resume`),
  deleteProject: (id) => req('DELETE', `/projects/${id}`),
  getMilestones: (pid) => get(`/projects/${pid}/milestones`),
  getConversation: (pid) => get(`/projects/${pid}/conversation`),
  getAutomations: (pid) => get(`/projects/${pid}/automations`),
  getMilestoneTasks: (mid) => get(`/milestones/${mid}/tasks`),
  getTask: (id) => get(`/tasks/${id}`),
  startTask: (id) => post(`/tasks/${id}/start`),
  getHint: (id) => post(`/tasks/${id}/hint`),
  askQuestion: (id, q, content, path) => post(`/tasks/${id}/ask`, { question: q, activeFileContent: content, activeFilePath: path }),
  askProjectQuestion: (id, q, content, path) => post(`/projects/${id}/ask`, { question: q, activeFileContent: content, activeFilePath: path }),
  submitTask: (tid, txt) => post('/tasks/submit', { task_id: tid, submission_text: txt }),
  getFsTree: () => get('/fs/tree'),
  getFile: (path) => get(`/fs/file?path=${encodeURIComponent(path)}`),
  saveFile: (path, contents) => post('/fs/file', { path, content: contents }),
  uploadFile: (path, content, encoding) => post('/fs/upload', { path, content, encoding }),
  createFile: (path) => post('/fs/touch', { path }),
  createFolder: (path) => post('/fs/mkdir', { path }),
  deleteFile: (path) => req('DELETE', `/fs/file?path=${encodeURIComponent(path)}`),
  renameFile: (oldPath, newPath) => req('PUT', '/fs/rename', { oldPath, newPath }),
  gitClone: (url, targetDir) => post('/fs/git-clone', { url, targetDir }),
  authorizeDeletion: (projectId, path) => post('/fs/authorize-deletion', { projectId, path }),

  // Auth
  sendOtp: (email) => post('/auth/send-otp', { email }),
  verifyOtp: (email, otp, name, role) => post('/auth/verify-otp', { email, otp, name, role }),
  loginGoogle: (credential, role) => post('/auth/google', { credential, role }),
  updateRole: (role) => req('PUT', '/auth/role', { role }),
  getMe: () => get('/auth/me'),
};
