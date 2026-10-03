// Uses Node.js built-in sqlite (stable since Node 22.12.0)
// Zero npm packages, zero C++ compilation needed
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');
const config = require('../config');

const DB_PATH = config.DB_PATH || './data/socrates.db';
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
    tech_stack TEXT DEFAULT '[]',
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
    raw_goal TEXT,
    course_id TEXT REFERENCES courses(id),
    is_course INTEGER DEFAULT 0,
    course_version INTEGER,
    status TEXT DEFAULT 'active', -- active/completed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

  -- [V2 COURSE ENGINE SCHEMA]

  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    difficulty TEXT,
    tech_stack TEXT,
    estimated_hours INTEGER,
    popularity INTEGER DEFAULT 0,
    completion_rate REAL DEFAULT 0,
    difficulty_score INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    version INTEGER DEFAULT 1,
    badge TEXT DEFAULT 'official',
    source TEXT DEFAULT 'official',
    creator_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS course_milestones (
    id TEXT PRIMARY KEY,
    course_id TEXT REFERENCES courses(id),
    title TEXT,
    position INTEGER
  );

  CREATE TABLE IF NOT EXISTS course_tasks (
    id TEXT PRIMARY KEY,
    course_id TEXT REFERENCES courses(id),
    milestone_id TEXT REFERENCES course_milestones(id),
    title TEXT,
    description TEXT,
    position INTEGER,
    validation_type TEXT, -- static / regex / custom
    validation_rules TEXT, -- JSON rules
    hints TEXT, -- JSON array
    starter_template TEXT,
    folder_structure TEXT,
    file_path TEXT,
    version INTEGER DEFAULT 1,
    estimated_minutes INTEGER
  );

  CREATE TABLE IF NOT EXISTS course_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    task_id TEXT REFERENCES course_tasks(id),
    status TEXT DEFAULT 'pending', -- pending / completed
    attempts INTEGER DEFAULT 0,
    last_scaffold_level INTEGER DEFAULT 1,
    last_hint_used INTEGER DEFAULT 0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    help_requested INTEGER DEFAULT 0,
    active_mentor_id TEXT,
    last_help_request DATETIME,
    failure_consistency INTEGER DEFAULT 0,
    last_error_hash TEXT,
    interventions_count INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS behavior_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    task_id TEXT NOT NULL REFERENCES course_tasks(id),
    cheat_score INTEGER,
    paste_score INTEGER,
    typing_pattern INTEGER,
    paste_size INTEGER DEFAULT 0,
    typing_speed REAL DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    time_spent REAL DEFAULT 0,
    characters_added INTEGER DEFAULT 0,
    elapsed_ms INTEGER DEFAULT 0,
    was_empty INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_skills (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    fundamentals REAL DEFAULT 0,
    syntax REAL DEFAULT 0,
    problem_solving REAL DEFAULT 0,
    debugging REAL DEFAULT 0,
    system_design REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- [PHASE 9: MARKETPLACE + CONTROLLED EXECUTION]

  CREATE TABLE IF NOT EXISTS community_projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tech_stack TEXT DEFAULT '[]',
    difficulty TEXT DEFAULT 'intermediate',
    final_outcome TEXT,
    estimated_hours REAL DEFAULT 10,
    status TEXT DEFAULT 'pending',
    structured_data TEXT,
    rejection_reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    reviewed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS hint_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    task_id TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    hint_text TEXT NOT NULL DEFAULT '',
    requested_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS project_memory (
    project_id TEXT PRIMARY KEY REFERENCES projects(id),
    task_id TEXT,
    last_code_snapshot TEXT,
    last_action TEXT,
    concepts_json TEXT DEFAULT '[]', -- [ "express-setup", "routing" ]
    failures_json TEXT DEFAULT '{}', -- { "TypeError": 4, "ECONNREFUSED": 2 }
    reflections_json TEXT DEFAULT '[]', -- [ { "task": "...", "text": "..." } ]
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

` + `
  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL REFERENCES projects(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT DEFAULT 'student',
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS platform_extensions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    command TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
if (!cols.includes('active_project_id')) {
  db.exec("ALTER TABLE users ADD COLUMN active_project_id TEXT");
  console.log('[DB] Migrated: added active_project_id to users');
}
if (!cols.includes('tech_stack')) {
  db.exec("ALTER TABLE users ADD COLUMN tech_stack TEXT DEFAULT '[]'");
  console.log('[DB] Migrated: added tech_stack to users');
}
// ─── Onboarding metadata migrations ──────────────────────────────────────────
if (!cols.includes('onboarded')) {
  db.exec("ALTER TABLE users ADD COLUMN onboarded INTEGER DEFAULT 0");
  console.log('[DB] Migrated: added onboarded to users');
}
if (!cols.includes('use_case')) {
  db.exec("ALTER TABLE users ADD COLUMN use_case TEXT");
  console.log('[DB] Migrated: added use_case to users');
}
if (!cols.includes('profession')) {
  db.exec("ALTER TABLE users ADD COLUMN profession TEXT");
  console.log('[DB] Migrated: added profession to users');
}
if (!cols.includes('team_size')) {
  db.exec("ALTER TABLE users ADD COLUMN team_size TEXT");
  console.log('[DB] Migrated: added team_size to users');
}
if (!cols.includes('primary_goals')) {
  db.exec("ALTER TABLE users ADD COLUMN primary_goals TEXT DEFAULT '[]'");
  console.log('[DB] Migrated: added primary_goals to users');
}
if (!cols.includes('referral_source')) {
  db.exec("ALTER TABLE users ADD COLUMN referral_source TEXT");
  console.log('[DB] Migrated: added referral_source to users');
}

const projInfo = db.prepare("PRAGMA table_info(projects)").all().map(c => c.name);
if (!projInfo.includes('is_course')) {
  db.exec("ALTER TABLE projects ADD COLUMN is_course INTEGER DEFAULT 0");
  db.exec("ALTER TABLE projects ADD COLUMN course_id TEXT REFERENCES courses(id)");
  db.exec("ALTER TABLE projects ADD COLUMN course_version TEXT");
  console.log('[DB] Migrated: added V2 course metadata to projects');
}
if (!projInfo.includes('title'))          db.exec("ALTER TABLE projects ADD COLUMN title TEXT");
if (!projInfo.includes('tech_stack'))     db.exec("ALTER TABLE projects ADD COLUMN tech_stack TEXT DEFAULT '[]'");
if (!projInfo.includes('scope'))          db.exec("ALTER TABLE projects ADD COLUMN scope TEXT DEFAULT ''");
if (!projInfo.includes('deadline_days'))  db.exec("ALTER TABLE projects ADD COLUMN deadline_days INTEGER DEFAULT 7");
if (!projInfo.includes('skill_level'))    db.exec("ALTER TABLE projects ADD COLUMN skill_level TEXT DEFAULT 'beginner'");
if (!projInfo.includes('deliverables'))   db.exec("ALTER TABLE projects ADD COLUMN deliverables TEXT DEFAULT '[]'");
if (!projInfo.includes('clarification_history')) db.exec("ALTER TABLE projects ADD COLUMN clarification_history TEXT DEFAULT '[]'");
if (!projInfo.includes('clarification_round'))   db.exec("ALTER TABLE projects ADD COLUMN clarification_round INTEGER DEFAULT 0");
if (!projInfo.includes('current_milestone_id'))   db.exec("ALTER TABLE projects ADD COLUMN current_milestone_id TEXT");
if (!projInfo.includes('current_task_id'))         db.exec("ALTER TABLE projects ADD COLUMN current_task_id TEXT");
if (!projInfo.includes('total_tasks'))     db.exec("ALTER TABLE projects ADD COLUMN total_tasks INTEGER DEFAULT 0");
if (!projInfo.includes('completed_tasks')) db.exec("ALTER TABLE projects ADD COLUMN completed_tasks INTEGER DEFAULT 0");
if (!projInfo.includes('progress_pct'))    db.exec("ALTER TABLE projects ADD COLUMN progress_pct REAL DEFAULT 0");
if (!projInfo.includes('help_requested'))  db.exec("ALTER TABLE projects ADD COLUMN help_requested INTEGER DEFAULT 0");
if (!projInfo.includes('last_help_request')) db.exec("ALTER TABLE projects ADD COLUMN last_help_request TEXT");
if (!projInfo.includes('active_mentor_id')) db.exec("ALTER TABLE projects ADD COLUMN active_mentor_id TEXT");
if (!projInfo.includes('requested_mentor_id')) db.exec("ALTER TABLE projects ADD COLUMN requested_mentor_id TEXT");
if (!projInfo.includes('intervention_mode')) db.exec("ALTER TABLE projects ADD COLUMN intervention_mode TEXT DEFAULT 'none'");
if (!projInfo.includes('mentor_hint')) db.exec("ALTER TABLE projects ADD COLUMN mentor_hint TEXT");
if (!projInfo.includes('interventions_count')) db.exec("ALTER TABLE projects ADD COLUMN interventions_count INTEGER DEFAULT 0");
if (!projInfo.includes('updated_at'))      db.exec("ALTER TABLE projects ADD COLUMN updated_at TEXT");

// [V2 COURSE ENGINE MIGRATIONS (PHASE 10)]
const cmInfo = db.prepare("PRAGMA table_info(course_milestones)").all().map(c => c.name);
if (cmInfo.includes('order_index') && !cmInfo.includes('position')) {
  db.exec("ALTER TABLE course_milestones RENAME COLUMN order_index TO position");
  console.log('[DB] Migrated: course_milestones (order_index -> position)');
}

const ctInfo = db.prepare("PRAGMA table_info(course_tasks)").all().map(c => c.name);
if (ctInfo.includes('order_index') && !ctInfo.includes('position')) {
  db.exec("ALTER TABLE course_tasks RENAME COLUMN order_index TO position");
  console.log('[DB] Migrated: course_tasks (order_index -> position)');
}
if (!ctInfo.includes('validation_rules')) db.exec("ALTER TABLE course_tasks ADD COLUMN validation_rules TEXT");
if (!ctInfo.includes('hints'))            db.exec("ALTER TABLE course_tasks ADD COLUMN hints TEXT");
if (!ctInfo.includes('starter_template')) db.exec("ALTER TABLE course_tasks ADD COLUMN starter_template TEXT");
if (!ctInfo.includes('folder_structure')) db.exec("ALTER TABLE course_tasks ADD COLUMN folder_structure TEXT");
if (!ctInfo.includes('file_path'))        db.exec("ALTER TABLE course_tasks ADD COLUMN file_path TEXT");
if (!ctInfo.includes('version'))          db.exec("ALTER TABLE course_tasks ADD COLUMN version INTEGER DEFAULT 1");
if (!ctInfo.includes('estimated_minutes')) db.exec("ALTER TABLE course_tasks ADD COLUMN estimated_minutes INTEGER");
if (!ctInfo.includes('course_id'))        db.exec("ALTER TABLE course_tasks ADD COLUMN course_id TEXT REFERENCES courses(id)");
if (ctInfo.includes('validation_pattern')) {
  // Optional: Rename or drop if not needed, but for now we leave it
}

const cInfo = db.prepare("PRAGMA table_info(courses)").all().map(c => c.name);
if (!cInfo.includes('is_active')) {
  if (cInfo.includes('active')) {
    db.exec("ALTER TABLE courses RENAME COLUMN active TO is_active");
  } else {
    db.exec("ALTER TABLE courses ADD COLUMN is_active INTEGER DEFAULT 1");
  }
}
if (!cInfo.includes('estimated_hours')) {
  db.exec("ALTER TABLE courses ADD COLUMN estimated_hours INTEGER");
}
if (!cInfo.includes('popularity')) {
  db.exec("ALTER TABLE courses ADD COLUMN popularity INTEGER DEFAULT 0");
  db.exec("ALTER TABLE courses ADD COLUMN completion_rate REAL DEFAULT 0");
  db.exec("ALTER TABLE courses ADD COLUMN difficulty_score INTEGER DEFAULT 0");
}
if (!cInfo.includes('version')) {
  db.exec("ALTER TABLE courses ADD COLUMN version INTEGER DEFAULT 1");
}

if (!cInfo.includes('badge')) db.exec("ALTER TABLE courses ADD COLUMN badge TEXT DEFAULT 'official'");
if (!cInfo.includes('source')) db.exec("ALTER TABLE courses ADD COLUMN source TEXT DEFAULT 'official'");
if (!cInfo.includes('creator_id')) db.exec("ALTER TABLE courses ADD COLUMN creator_id TEXT");

db.exec("UPDATE courses SET badge = 'official' WHERE badge IS NULL");
db.exec("UPDATE courses SET source = 'official' WHERE source IS NULL");

const cpInfo = db.prepare("PRAGMA table_info(course_progress)").all().map(c => c.name);
if (cpInfo.includes('course_task_id') && !cpInfo.includes('task_id')) {
  db.exec("ALTER TABLE course_progress RENAME COLUMN course_task_id TO task_id");
  console.log('[DB] Migrated: course_progress (course_task_id -> task_id)');
}
if (!cpInfo.includes('user_id')) {
  db.exec("ALTER TABLE course_progress ADD COLUMN user_id TEXT REFERENCES users(id)");
  db.exec("ALTER TABLE course_progress ADD COLUMN last_scaffold_level INTEGER DEFAULT 1");
  db.exec("ALTER TABLE course_progress ADD COLUMN last_hint_used INTEGER DEFAULT 0");
  db.exec("ALTER TABLE course_progress ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP");
}
if (!cpInfo.includes('completed_at')) {
  db.exec("ALTER TABLE course_progress ADD COLUMN completed_at DATETIME");
}
if (!cpInfo.includes('started_at')) {
  db.exec("ALTER TABLE course_progress ADD COLUMN started_at DATETIME DEFAULT CURRENT_TIMESTAMP");
}
if (!cpInfo.includes('help_requested')) {
  db.exec("ALTER TABLE course_progress ADD COLUMN help_requested INTEGER DEFAULT 0");
}
if (!cpInfo.includes('active_mentor_id')) {
  db.exec("ALTER TABLE course_progress ADD COLUMN active_mentor_id TEXT");
}
if (!cpInfo.includes('last_help_request')) {
  db.exec("ALTER TABLE course_progress ADD COLUMN last_help_request DATETIME");
  db.exec("ALTER TABLE course_progress ADD COLUMN failure_consistency INTEGER DEFAULT 0");
  db.exec("ALTER TABLE course_progress ADD COLUMN last_error_hash TEXT");
  db.exec("ALTER TABLE course_progress ADD COLUMN interventions_count INTEGER DEFAULT 0");
}

// [COURSE BUILDER SCHEMA EXTENSIONS]
const courseInfo = db.prepare("PRAGMA table_info(courses)").all().map(c => c.name);
if (!courseInfo.includes('creator_id'))      db.exec("ALTER TABLE courses ADD COLUMN creator_id TEXT REFERENCES users(id)");
if (!courseInfo.includes('learning_outcome')) db.exec("ALTER TABLE courses ADD COLUMN learning_outcome TEXT");
if (!courseInfo.includes('status'))          db.exec("ALTER TABLE courses ADD COLUMN status TEXT DEFAULT 'draft'");
if (!courseInfo.includes('problem_id'))       db.exec("ALTER TABLE courses ADD COLUMN problem_id TEXT REFERENCES societal_problems(id)");

const cmInfo2 = db.prepare("PRAGMA table_info(course_milestones)").all().map(c => c.name);
if (!cmInfo2.includes('description'))  db.exec("ALTER TABLE course_milestones ADD COLUMN description TEXT");
if (!cmInfo2.includes('duration_days')) db.exec("ALTER TABLE course_milestones ADD COLUMN duration_days INTEGER DEFAULT 7");

const ctInfo2 = db.prepare("PRAGMA table_info(course_tasks)").all().map(c => c.name);
if (!ctInfo2.includes('concepts'))    db.exec("ALTER TABLE course_tasks ADD COLUMN concepts TEXT DEFAULT '[]'");
if (!ctInfo2.includes('steps'))       db.exec("ALTER TABLE course_tasks ADD COLUMN steps TEXT DEFAULT '[]'");
if (!ctInfo2.includes('difficulty'))   db.exec("ALTER TABLE course_tasks ADD COLUMN difficulty TEXT DEFAULT 'easy'");
if (!ctInfo2.includes('goal'))        db.exec("ALTER TABLE course_tasks ADD COLUMN goal TEXT");
if (!ctInfo2.includes('commands'))    db.exec("ALTER TABLE course_tasks ADD COLUMN commands TEXT DEFAULT '[]'");

const chatInfo = db.prepare("PRAGMA table_info(chat_history)").all().map(c => c.name);
if (!chatInfo.includes('role')) db.exec("ALTER TABLE chat_history ADD COLUMN role TEXT DEFAULT 'student'");

const behaviorInfo = db.prepare("PRAGMA table_info(behavior_logs)").all().map(c => c.name);
if (!behaviorInfo.includes('paste_size')) db.exec("ALTER TABLE behavior_logs ADD COLUMN paste_size INTEGER DEFAULT 0");
if (!behaviorInfo.includes('typing_speed')) db.exec("ALTER TABLE behavior_logs ADD COLUMN typing_speed REAL DEFAULT 0");
if (!behaviorInfo.includes('attempts')) db.exec("ALTER TABLE behavior_logs ADD COLUMN attempts INTEGER DEFAULT 0");
if (!behaviorInfo.includes('time_spent')) db.exec("ALTER TABLE behavior_logs ADD COLUMN time_spent REAL DEFAULT 0");
if (!behaviorInfo.includes('characters_added')) db.exec("ALTER TABLE behavior_logs ADD COLUMN characters_added INTEGER DEFAULT 0");
if (!behaviorInfo.includes('elapsed_ms')) db.exec("ALTER TABLE behavior_logs ADD COLUMN elapsed_ms INTEGER DEFAULT 0");
if (!behaviorInfo.includes('was_empty')) db.exec("ALTER TABLE behavior_logs ADD COLUMN was_empty INTEGER DEFAULT 0");

const hintInfo = db.prepare("PRAGMA table_info(hint_requests)").all().map(c => c.name);
if (!hintInfo.includes('level')) db.exec("ALTER TABLE hint_requests ADD COLUMN level INTEGER NOT NULL DEFAULT 1");
if (!hintInfo.includes('hint_text')) db.exec("ALTER TABLE hint_requests ADD COLUMN hint_text TEXT NOT NULL DEFAULT ''");

const progressInfo = db.prepare("PRAGMA table_info(course_progress)").all().map(c => c.name);
// [SOCIETAL PROBLEMS & SOLUTION PLANNING SCHEMA]
db.exec(`
  CREATE TABLE IF NOT EXISTS problem_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS societal_problems (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    problem_type TEXT NOT NULL,
    category_id TEXT REFERENCES problem_categories(id),
    status TEXT DEFAULT 'SUBMITTED',
    urgency TEXT DEFAULT 'medium',
    severity TEXT DEFAULT 'medium',
    people_affected TEXT,
    geographic_scope TEXT DEFAULT 'local',
    privacy_level TEXT DEFAULT 'locality',
    expected_impact TEXT,
    structured_impact TEXT DEFAULT '{}',
    adopted_by TEXT REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS problem_media (
    id TEXT PRIMARY KEY,
    problem_id TEXT NOT NULL REFERENCES societal_problems(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS private_media_uploads (
    file_name TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS problem_locations (
    id TEXT PRIMARY KEY,
    problem_id TEXT NOT NULL REFERENCES societal_problems(id) ON DELETE CASCADE,
    latitude REAL,
    longitude REAL,
    formatted_address TEXT,
    district TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    privacy_level TEXT DEFAULT 'locality',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS problem_ai_analysis (
    id TEXT PRIMARY KEY,
    problem_id TEXT NOT NULL REFERENCES societal_problems(id) ON DELETE CASCADE,
    summary TEXT,
    problem_statement TEXT NOT NULL,
    primary_category TEXT,
    secondary_categories TEXT DEFAULT '[]',
    affected_stakeholders TEXT DEFAULT '[]',
    root_causes TEXT DEFAULT '[]',
    key_requirements TEXT DEFAULT '[]',
    constraints TEXT DEFAULT '[]',
    urgency TEXT,
    severity TEXT,
    estimated_scope TEXT,
    expected_impact TEXT,
    potential_solution_domains TEXT DEFAULT '[]',
    required_skills TEXT DEFAULT '[]',
    recommended_project_type TEXT,
    recommended_team_roles TEXT DEFAULT '[]',
    technology_domains TEXT DEFAULT '[]',
    confidence REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS problem_reviews (
    id TEXT PRIMARY KEY,
    problem_id TEXT NOT NULL REFERENCES societal_problems(id) ON DELETE CASCADE,
    reviewer_id TEXT NOT NULL REFERENCES users(id),
    verdict TEXT NOT NULL,
    review_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS problem_duplicates (
    id TEXT PRIMARY KEY,
    problem_id TEXT NOT NULL REFERENCES societal_problems(id) ON DELETE CASCADE,
    matched_problem_id TEXT NOT NULL REFERENCES societal_problems(id) ON DELETE CASCADE,
    similarity_score REAL NOT NULL,
    reasoning TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS problem_interests (
    id TEXT PRIMARY KEY,
    problem_id TEXT NOT NULL REFERENCES societal_problems(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    role_preference TEXT,
    note TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS project_architectures (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version INTEGER DEFAULT 1,
    title TEXT,
    system_overview TEXT,
    frontend_arch TEXT,
    backend_arch TEXT,
    database_arch TEXT,
    aiml_arch TEXT,
    data_flow TEXT,
    deployment_arch TEXT,
    security_arch TEXT,
    components_json TEXT DEFAULT '[]',
    is_approved INTEGER DEFAULT 0,
    created_by TEXT REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS project_teams (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT DEFAULT 'Solution Team',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS project_team_members (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES project_teams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT DEFAULT 'developer',
    assigned_task_id TEXT REFERENCES tasks(id),
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS requirements (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    problem_id TEXT REFERENCES societal_problems(id),
    source_type TEXT DEFAULT 'problem_statement',
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'must',
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS requirement_tasks (
    id TEXT PRIMARY KEY,
    requirement_id TEXT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS requirement_qa (
    id TEXT PRIMARY KEY,
    requirement_id TEXT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    qa_review_id TEXT NOT NULL REFERENCES qa_reviews(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    score REAL DEFAULT 0,
    evidence_text TEXT,
    missing_pieces_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    host_id TEXT NOT NULL REFERENCES users(id),
    task_id TEXT REFERENCES tasks(id),
    title TEXT,
    status TEXT DEFAULT 'active',
    live_share_url TEXT,
    permission_mode TEXT DEFAULT 'full',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS collaboration_participants (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT DEFAULT 'participant',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    left_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS impact_metrics (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL,
    label TEXT NOT NULL,
    unit TEXT,
    estimated_value REAL,
    measured_value REAL,
    evidence_notes TEXT,
    deployment_status TEXT DEFAULT 'planned',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ─── Societal Problem Column Migrations ─────────────────────────────────────
const pCols = db.prepare("PRAGMA table_info(projects)").all().map(c => c.name);
if (!pCols.includes('problem_id')) {
  db.exec("ALTER TABLE projects ADD COLUMN problem_id TEXT REFERENCES societal_problems(id)");
  console.log('[DB] Migrated: added problem_id to projects');
}
if (!pCols.includes('architecture_version')) {
  db.exec("ALTER TABLE projects ADD COLUMN architecture_version INTEGER DEFAULT 1");
  console.log('[DB] Migrated: added architecture_version to projects');
}

// ─── Seed Default Problem Categories ────────────────────────────────────────
const catCount = db.prepare("SELECT COUNT(*) as count FROM problem_categories").get().count;
if (catCount === 0) {
  const insertCat = db.prepare(`
    INSERT OR IGNORE INTO problem_categories (id, name, slug, icon, description)
    VALUES (?, ?, ?, ?, ?)
  `);
  const defaultCats = [
    ['cat_water', 'Water & Sanitation', 'water-sanitation', 'Droplets', 'Clean water supply, drinking water contamination, drainage, and sewage management.'],
    ['cat_health', 'Healthcare & Hygiene', 'healthcare', 'HeartPulse', 'Public health clinics, disease surveillance, medical supply distribution, and community wellbeing.'],
    ['cat_edu', 'Education & Literacy', 'education', 'GraduationCap', 'School infrastructure, digital learning access, dropout reduction, and vocational training.'],
    ['cat_agri', 'Agriculture & Food', 'agriculture', 'Sprout', 'Crop health, smart irrigation, farmer market linkages, storage, and food security.'],
    ['cat_env', 'Environment & Climate', 'environment', 'Trees', 'Pollution tracking, renewable energy, waste management, and conservation.'],
    ['cat_access', 'Accessibility & Inclusion', 'accessibility', 'Accessibility', 'Assistive technologies, public accessibility for disabled persons, and inclusive services.'],
    ['cat_infra', 'Public Infrastructure', 'public-infrastructure', 'Building2', 'Roads, bridges, public transit, street lighting, and utility reliability.'],
    ['cat_rural', 'Rural Development', 'rural-development', 'Home', 'Last-mile electrification, village governance, rural livelihoods, and connectivity.'],
    ['cat_urban', 'Urban Governance & Safety', 'urban-governance', 'Shield', 'Traffic congestion, emergency response, municipal grievance redressal, and civic safety.'],
    ['cat_other', 'Other Societal Needs', 'other', 'HelpCircle', 'Cross-cutting community and civic problems requiring technological innovation.']
  ];
  for (const [id, name, slug, icon, desc] of defaultCats) {
    insertCat.run(id, name, slug, icon, desc);
  }
  console.log('[DB] Seeded default problem categories');
}

// ─── Citizen Role & Workflow Tables ─────────────────────────────────────────
db.exec(`
  -- AI-suggested categories for problems (separate from canonical problem_categories)
  -- Supports human-reviewed, auditable AI categorisation workflow.
  CREATE TABLE IF NOT EXISTS problem_ai_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_id TEXT NOT NULL REFERENCES societal_problems(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES problem_categories(id),
    suggested_category TEXT NOT NULL,
    confidence REAL,
    rank INTEGER,
    model TEXT,
    prompt_version TEXT,
    status TEXT DEFAULT 'PENDING',
    reasoning TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    reviewed_by TEXT REFERENCES users(id)
  );

  -- Tracks mentor/university adoptions of societal problems.
  -- Separate from projects; adoption does NOT auto-create a project.
  CREATE TABLE IF NOT EXISTS problem_adoptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_id TEXT NOT NULL REFERENCES societal_problems(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Access policies for projects spawned from societal problems.
  CREATE TABLE IF NOT EXISTS project_access_policies (
    project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    access_mode TEXT NOT NULL,
    institution_id TEXT,
    course_id TEXT,
    approval_required INTEGER DEFAULT 0,
    max_team_size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Student applications to join a problem-derived project.
  CREATE TABLE IF NOT EXISTS project_student_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id),
    status TEXT DEFAULT 'pending',
    message TEXT,
    reviewed_by TEXT REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME
  );
`);

// ─── Column migrations for new tables (idempotent) ───────────────────────────
const adoptionInfo = db.prepare('PRAGMA table_info(problem_adoptions)').all().map(c => c.name);
if (!adoptionInfo.includes('role')) {
  // Table was created without role column (very old schema); add it.
  db.exec("ALTER TABLE problem_adoptions ADD COLUMN role TEXT NOT NULL DEFAULT 'mentor'");
  console.log('[DB] Migrated: added role to problem_adoptions');
}

const policyInfo = db.prepare('PRAGMA table_info(project_access_policies)').all().map(c => c.name);
if (!policyInfo.includes('max_team_size')) {
  db.exec('ALTER TABLE project_access_policies ADD COLUMN max_team_size INTEGER');
  console.log('[DB] Migrated: added max_team_size to project_access_policies');
}

console.log('[DB] Citizen role tables ready');

// ─── Ensure Anonymous Citizen User Exists ───────────────────────────────────
db.prepare(`
  INSERT OR IGNORE INTO users (id, email, name, role)
  VALUES ('anon_citizen', 'citizen@socrates.local', 'Anonymous Citizen', 'citizen')
`).run();

// ══════════════════════════════════════════════════════════════════════
// Labour-Market Intelligence & Competency Alignment Schema
// ══════════════════════════════════════════════════════════════════════
const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, email, name, role, skill_level) VALUES (?, ?, ?, ?, ?)');
const personas = [
  ['demo_student', 'student@socrates.local', 'Alex Johnson', 'student', 'intermediate'],
  ['demo_mentor', 'mentor@socrates.local', 'Prof. Sarah Williams', 'mentor', 'advanced'],
  ['demo_employer', 'employer@socrates.local', 'Microsoft Hiring Team', 'employer', 'advanced'],
  ['demo_expert', 'expert@socrates.local', 'Dr. Elena Vance (Industry Expert)', 'expert', 'advanced'],
  ['demo_institution', 'institution@socrates.local', 'Engineering Academic Board', 'institution', 'advanced']
];
if (process.env.ENABLE_DEMO_SEED_DATA === 'true') {
  personas.forEach(p => insertUser.run(...p));
}

const { initLabourSchema } = require('./labour_schema');
initLabourSchema(db);

console.log('[DB] Labour-Market Intelligence schema & demo personas ready');

module.exports = db;