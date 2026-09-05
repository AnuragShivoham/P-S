const { callClaudeJSON } = require('../db/claude');
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

const ARCH_SYSTEM_PROMPT = `You are the AMIT-BODHIT Principal Solutions Architect.
Your task is to generate a comprehensive, enterprise-grade system architecture and technical blueprint for a project addressing a critical real-world societal challenge.

RULES:
1. Provide practical, scalable, and modern architectural specifications.
2. Cover: System Overview, Frontend Architecture, Backend Architecture, Database Architecture, AI/ML Architecture, Data Flow, Deployment Architecture, Security Architecture.
3. Recommend a concrete technology stack with specific technical justifications.
4. Output structured visual diagram nodes and edges for component flow.
5. Identify required team roles and their assigned architectural modules.

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "title": "System Architecture v...",
  "system_overview": "Comprehensive 2-3 paragraph architectural overview.",
  "frontend_arch": "Detailed frontend stack, state management, offline sync, UI/UX architecture.",
  "backend_arch": "API layer, business logic, asynchronous queues, background workers.",
  "database_arch": "Relational/document schema strategy, indexing, caching, data retention.",
  "aiml_arch": "Model selection, training/inference pipelines, edge processing, confidence thresholds.",
  "data_flow": "Step-by-step description of how data originates, transforms, and is surfaced.",
  "deployment_arch": "Docker containerization, CI/CD, cloud/on-premise deployment, monitoring.",
  "security_arch": "Zero-trust principles, encryption at rest/transit, role-based access control, input validation.",
  "recommended_stack": [
    { "category": "Frontend", "technology": "React + Vite", "rationale": "High-performance reactive UI with rapid build cycles." },
    { "category": "Backend", "technology": "Node.js + Express", "rationale": "Lightweight, event-driven API service." },
    { "category": "Database", "technology": "PostgreSQL / SQLite", "rationale": "ACID compliance for critical societal reports." }
  ],
  "components": [
    { "id": "client", "name": "Citizen Mobile / Web App", "type": "frontend", "description": "Offline-first reporting interface" },
    { "id": "api_gw", "name": "API Gateway", "type": "backend", "description": "Authentication & rate limiting" },
    { "id": "core_service", "name": "Core Service Engine", "type": "backend", "description": "Business logic & validation" },
    { "id": "db", "name": "Persistent Database", "type": "database", "description": "Structured storage" }
  ],
  "connections": [
    { "from": "client", "to": "api_gw", "label": "HTTPS REST / WS" },
    { "from": "api_gw", "to": "core_service", "label": "Internal RPC" },
    { "from": "core_service", "to": "db", "label": "SQL Queries" }
  ],
  "team_roles": [
    { "role": "Frontend Developer", "focus": "Citizen UI & Real-time Dashboard" },
    { "role": "Backend Developer", "focus": "API Services & Data Persistence" },
    { "role": "QA Engineer", "focus": "End-to-end integration & requirement validation" }
  ]
}`;

function fallbackArchitecture(project, problem) {
  const title = project.title || problem?.title || 'Community Solution System';
  return {
    title: `Architecture v1: ${title}`,
    system_overview: `A robust multi-tier cloud and edge architecture designed to solve: "${title}". Emphasizes low latency, reliable data ingestion, and citizen accessibility.`,
    frontend_arch: 'React SPA with Tailwind/CSS modular tokens, responsive mobile-first views, and local IndexedDB offline sync.',
    backend_arch: 'RESTful Node.js service utilizing Express, input validation middleware, and WebSocket notification dispatchers.',
    database_arch: 'Relational SQLite/PostgreSQL with indexed spatial columns, audit trails, and foreign-key referential integrity.',
    aiml_arch: 'Lightweight anomaly detection and automated report classification with confidence scoring.',
    data_flow: '1. Citizen inputs report → 2. Edge/Client validates format → 3. API Gateway authenticates → 4. Database persists record → 5. WebSocket notifies responders.',
    deployment_arch: 'Dockerized microservice stack deployable to VPS or Kubernetes with automated health checks.',
    security_arch: 'JWT Bearer authentication, sanitized input fields, rate-limited public endpoints, and privacy coordinate truncation.',
    recommended_stack: [
      { category: 'Frontend', technology: 'React + Vite', rationale: 'Ultra-fast client rendering with minimal bundle overhead.' },
      { category: 'Backend', technology: 'Node.js + Express', rationale: 'Non-blocking I/O optimized for concurrent reporting.' },
      { category: 'Database', technology: 'SQLite / PostgreSQL', rationale: 'ACID transactional safety for citizen records.' }
    ],
    components: [
      { id: 'web_client', name: 'Citizen Web Portal', type: 'frontend', description: 'Reporting and tracking interface' },
      { id: 'api_server', name: 'P-S Backend Server', type: 'backend', description: 'Authentication, business logic, REST APIs' },
      { id: 'data_store', name: 'Relational Database', type: 'database', description: 'Problem records, user profiles, audit logs' },
      { id: 'ai_engine', name: 'Problem Intelligence & QA', type: 'ai', description: 'Evaluation and automated advice' }
    ],
    connections: [
      { from: 'web_client', to: 'api_server', label: 'HTTP / WebSocket' },
      { from: 'api_server', to: 'data_store', label: 'SQL' },
      { from: 'api_server', to: 'ai_engine', label: 'Internal Engine IPC' }
    ],
    team_roles: [
      { role: 'Frontend Developer', focus: 'User interface, maps, media upload' },
      { role: 'Backend Developer', focus: 'REST APIs, authentication, database' },
      { role: 'QA Engineer', focus: 'Automated test suite and requirement traceability' }
    ]
  };
}

/**
 * Generate a new version of the system architecture for a project.
 */
async function generateArchitecture(projectId, customNotes = '') {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) throw new Error('Project not found');

  let problem = null;
  let analysis = null;
  if (project.problem_id) {
    problem = db.prepare('SELECT * FROM societal_problems WHERE id = ?').get(project.problem_id);
    analysis = db.prepare('SELECT * FROM problem_ai_analysis WHERE problem_id = ?').get(project.problem_id);
  }

  // Determine current highest version
  const latestArch = db.prepare('SELECT MAX(version) as max_v FROM project_architectures WHERE project_id = ?').get(projectId);
  const nextVersion = (latestArch?.max_v || 0) + 1;

  const prompt = `
Project Context:
- Project Title: ${project.title}
- Scope: ${project.scope}
- Tech Stack: ${project.tech_stack}
- Deliverables: ${project.deliverables}
- Problem Context: ${problem ? `${problem.title}: ${problem.description}` : 'Custom Project Goal: ' + project.raw_goal}
- Problem Requirements: ${analysis?.key_requirements || '[]'}
- Constraints: ${analysis?.constraints || '[]'}
- Target Architecture Version: Version ${nextVersion}
${customNotes ? `- User Custom Guidelines: ${customNotes}` : ''}
`;

  let archData = null;
  try {
    archData = await callClaudeJSON(ARCH_SYSTEM_PROMPT, prompt, [], 2500);
  } catch (e) {
    console.warn('[Architecture Generator] AI unavailable, using baseline:', e.message);
    archData = fallbackArchitecture(project, problem);
  }

  if (!archData || !archData.system_overview) {
    archData = fallbackArchitecture(project, problem);
  }

  archData.title = `Architecture v${nextVersion}: ${project.title}`;

  const archId = `arch_${uuidv4()}`;
  db.prepare(`
    INSERT INTO project_architectures (
      id, project_id, version, title, system_overview, frontend_arch,
      backend_arch, database_arch, aiml_arch, data_flow, deployment_arch,
      security_arch, components_json, is_approved, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `).run(
    archId,
    projectId,
    nextVersion,
    archData.title,
    archData.system_overview,
    archData.frontend_arch,
    archData.backend_arch,
    archData.database_arch,
    archData.aiml_arch,
    archData.data_flow,
    archData.deployment_arch,
    archData.security_arch,
    JSON.stringify({
      components: archData.components || [],
      connections: archData.connections || [],
      recommended_stack: archData.recommended_stack || [],
      team_roles: archData.team_roles || []
    })
  );

  return {
    id: archId,
    version: nextVersion,
    ...archData
  };
}

/**
 * Approve a specific architecture version for the project.
 */
function approveArchitecture(projectId, version) {
  db.prepare('UPDATE project_architectures SET is_approved = 0 WHERE project_id = ?').run(projectId);
  db.prepare('UPDATE project_architectures SET is_approved = 1 WHERE project_id = ? AND version = ?').run(projectId, version);
  db.prepare('UPDATE projects SET architecture_version = ? WHERE id = ?').run(version, projectId);

  return db.prepare('SELECT * FROM project_architectures WHERE project_id = ? AND version = ?').get(projectId, version);
}

/**
 * Get all architecture versions for a project.
 */
function getProjectArchitectures(projectId) {
  const rows = db.prepare('SELECT * FROM project_architectures WHERE project_id = ? ORDER BY version DESC').all(projectId);
  return rows.map(r => ({
    ...r,
    components_data: JSON.parse(r.components_json || '{}')
  }));
}

module.exports = {
  generateArchitecture,
  approveArchitecture,
  getProjectArchitectures,
  fallbackArchitecture
};
