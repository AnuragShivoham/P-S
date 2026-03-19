// Uses Node.js built-in sqlite (stable since Node 22.12.0)
// Zero npm packages, zero C++ compilation needed
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');
const config = require('../config');

const DB_PATH = config.DB_PATH || './data/amitbodhit.db';
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new DatabaseSync(DB_PATH);

// WAL mode for better concurrent read performance; foreign keys enforced
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    skill_level TEXT DEFAULT 'beginner',
    role TEXT DEFAULT 'student',
    google_id TEXT,
    avatar TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS otp_requests (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    raw_goal TEXT NOT NULL,
    title TEXT,
    tech_stack TEXT DEFAULT '[]',
    scope TEXT,
    deadline_days INTEGER,
    skill_level TEXT,
    deliverables TEXT DEFAULT '[]',
    status TEXT DEFAULT 'clarifying',
    clarification_round INTEGER DEFAULT 0,
    clarification_history TEXT DEFAULT '[]',
    current_milestone_id TEXT,
    current_task_id TEXT,
    progress_pct REAL DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    ord INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration_days INTEGER,
    measurable_output TEXT,
    status TEXT DEFAULT 'locked',
    started_at TEXT,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    milestone_id TEXT NOT NULL REFERENCES milestones(id),
    ord INTEGER NOT NULL,
    day INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    estimated_hours REAL,
    commands TEXT DEFAULT '[]',
    folder_structure TEXT DEFAULT '{}',
    starter_template TEXT,
    concepts_taught TEXT DEFAULT '[]',
    status TEXT DEFAULT 'pending',
    submission_text TEXT,
    attempts INTEGER DEFAULT 0,
    started_at TEXT,
    submitted_at TEXT,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS qa_reviews (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    attempt_number INTEGER DEFAULT 1,
    verdict TEXT NOT NULL,
    score REAL DEFAULT 0,
    passed_checks TEXT DEFAULT '[]',
    failed_checks TEXT DEFAULT '[]',
    corrections TEXT DEFAULT '[]',
    feedback_text TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS automation_suggestions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    milestone_id TEXT REFERENCES milestones(id),
    tool TEXT,
    description TEXT,
    script_snippet TEXT,
    benefit TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversation_turns (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    task_id TEXT REFERENCES tasks(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    context_type TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workspace_files (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    file_path TEXT NOT NULL,
    content TEXT,
    file_type TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS command_logs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    task_id TEXT REFERENCES tasks(id),
    command TEXT NOT NULL,
    exit_code INTEGER,
    stdout TEXT,
    stderr TEXT,
    executed_at TEXT DEFAULT (datetime('now')),
    duration_ms INTEGER
  );

  CREATE TABLE IF NOT EXISTS progress_snapshots (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    milestone_id TEXT REFERENCES milestones(id),
    task_id TEXT REFERENCES tasks(id),
    progress_pct REAL,
    total_tasks INTEGER,
    completed_tasks INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS otp_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

console.log('[DB] Ready (node:sqlite) →', config.DB_PATH);

// ─── Migrations ──────────────────────────────────────────────────────────────
// SQLite CREATE TABLE IF NOT EXISTS doesn't add columns to existing tables.
// We manually ensure new columns exist.
const tableInfo = db.prepare("PRAGMA table_info(users)").all();
const cols = tableInfo.map(c => c.name);

if (!cols.includes('role')) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'");
  console.log('[DB] Migrated: added role to users');
}
if (!cols.includes('google_id')) {
  db.exec("ALTER TABLE users ADD COLUMN google_id TEXT");
  console.log('[DB] Migrated: added google_id to users');
}
if (!cols.includes('avatar')) {
  db.exec("ALTER TABLE users ADD COLUMN avatar TEXT");
  console.log('[DB] Migrated: added avatar to users');
}

module.exports = db;
