# Backend Database Schema & Data Shapes — SOCRATES

All persistence in SOCRATES is managed via SQLite using Node.js built-in `node:sqlite` (`DatabaseSync`) with Write-Ahead Logging (WAL) and foreign keys enabled.

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
```

---

## 1. Core Platform & Direct Project Entities

### `users`
Represents platform actors across all roles.
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  skill_level TEXT DEFAULT 'beginner', -- beginner, intermediate, advanced
  role TEXT DEFAULT 'student',         -- student, mentor, citizen, university, admin
  google_id TEXT,
  avatar TEXT,
  tech_stack TEXT DEFAULT '[]',        -- JSON array of selected skills
  created_at TEXT DEFAULT (datetime('now'))
);
```

### `otp_requests`
Stores passwordless login verification codes.
```sql
CREATE TABLE IF NOT EXISTS otp_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### `projects`
Represents an instantiated student or team engineering project.
```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT,
  description TEXT,
  raw_goal TEXT,
  tech_stack TEXT DEFAULT '[]',        -- JSON array
  category TEXT,
  progress_pct INTEGER DEFAULT 0,
  course_id TEXT REFERENCES courses(id),
  is_course INTEGER DEFAULT 0,
  course_version INTEGER,
  status TEXT DEFAULT 'active',        -- active, completed, archived
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `goals`
Clarified specifications output by the Goal Clarifier engine.
```sql
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  refined_goal TEXT NOT NULL,
  target_audience TEXT,
  key_features TEXT,                   -- JSON array of features
  tech_stack TEXT,                     -- JSON array
  created_at TEXT DEFAULT (datetime('now'))
);
```

### `milestones`
Phased execution chunks for a project.
```sql
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  ord INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER,
  measurable_output TEXT,
  status TEXT DEFAULT 'locked',        -- locked, in_progress, completed
  started_at TEXT,
  completed_at TEXT
);
```

### `tasks`
Daily atomic tasks belonging to a milestone.
```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  milestone_id TEXT NOT NULL REFERENCES milestones(id),
  day INTEGER NOT NULL,
  ord INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  commands TEXT,                       -- JSON array of bash commands
  folder_structure TEXT,              -- JSON representation of directory scaffold
  starter_template TEXT,              -- Code skeleton containing TODO markers
  concepts_taught TEXT,               -- JSON array of concepts
  expected_output TEXT,
  status TEXT DEFAULT 'pending',       -- pending, in_progress, completed, failed
  created_at TEXT DEFAULT (datetime('now'))
);
```

### `user_skills`
Records verified competency levels acquired through completed tasks.
```sql
CREATE TABLE IF NOT EXISTS user_skills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  skill_name TEXT NOT NULL,
  proficiency TEXT NOT NULL,           -- beginner, intermediate, advanced
  verified_at TEXT NOT NULL,
  UNIQUE(user_id, skill_name)
);
```

### `courses` & `course_progress`
Static pre-built guided learning tracks created by mentors or official curricula.
```sql
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT DEFAULT 'Beginner',
  estimated_hours INTEGER DEFAULT 10,
  tech_stack TEXT,                     -- JSON array
  category TEXT,
  source TEXT DEFAULT 'official',      -- official, mentor, community
  badge TEXT DEFAULT 'official',
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  task_id TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  submitted_code TEXT,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, course_id, task_id)
);
```

---

## 2. Societal Problems (Pipeline B) Entities

### `problem_categories` & `societal_problems`
Civic problem catalog and individual citizen-submitted challenges.
```sql
CREATE TABLE IF NOT EXISTS problem_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS societal_problems (
  id TEXT PRIMARY KEY,
  submitted_by TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  problem_type TEXT,
  category_id TEXT REFERENCES problem_categories(id),
  urgency TEXT DEFAULT 'medium',       -- low, medium, high, critical
  severity TEXT DEFAULT 'moderate',    -- minor, moderate, severe, catastrophic
  people_affected TEXT,
  geographic_scope TEXT,               -- local, district, state, national
  privacy_level TEXT DEFAULT 'locality', -- exact, locality, district
  expected_impact TEXT,
  structured_impact TEXT,              -- JSON object of impact metrics
  status TEXT DEFAULT 'pending_review',-- pending_review, active, adopted, resolved
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `problem_locations` & `problem_media`
Geospatial coordinates with privacy masking and magic-byte verified evidence.
```sql
CREATE TABLE IF NOT EXISTS problem_locations (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL REFERENCES societal_problems(id) ON DELETE CASCADE,
  latitude REAL,
  longitude REAL,
  formatted_address TEXT,
  district TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT
);

CREATE TABLE IF NOT EXISTS problem_media (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL REFERENCES societal_problems(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  media_type TEXT NOT NULL,            -- image, video, document
  mime_type TEXT NOT NULL,
  file_size INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `problem_ai_analysis` & `problem_duplicates`
AI intelligence output assessing feasibility, requirements, and duplicate grouping.
```sql
CREATE TABLE IF NOT EXISTS problem_ai_analysis (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL REFERENCES societal_problems(id) ON DELETE CASCADE,
  summary TEXT,
  technical_feasibility TEXT,          -- low, medium, high
  urgency_score REAL,
  key_requirements TEXT,               -- JSON array
  target_stakeholders TEXT,           -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS problem_duplicates (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL REFERENCES societal_problems(id) ON DELETE CASCADE,
  duplicate_problem_id TEXT NOT NULL REFERENCES societal_problems(id) ON DELETE CASCADE,
  similarity_score REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `problem_adoptions`, `student_applications` & Project Extensions
Mentorship linking, student team assignments, architecture revisions, and impact tracking.
```sql
CREATE TABLE IF NOT EXISTS problem_adoptions (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL REFERENCES societal_problems(id),
  mentor_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT REFERENCES projects(id),
  adopted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_applications (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL REFERENCES societal_problems(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  role_requested TEXT NOT NULL,        -- Frontend, Backend, DevOps, Data/AI, QA
  statement TEXT,
  status TEXT DEFAULT 'pending',       -- pending, accepted, rejected
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_architecture (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  diagram_mermaid TEXT NOT NULL,       -- Renderable Mermaid diagram syntax
  frontend_arch TEXT,
  backend_arch TEXT,
  database_arch TEXT,
  approved_by TEXT REFERENCES users(id),
  approved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_requirements (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_problem_id TEXT REFERENCES societal_problems(id),
  requirement_key TEXT NOT NULL,       -- REQ-01, REQ-02
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'must_have',   -- must_have, should_have, nice_to_have
  status TEXT DEFAULT 'pending'        -- pending, implemented, verified
);

CREATE TABLE IF NOT EXISTS project_impact_metrics (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  estimated_value REAL,
  actual_value REAL,
  unit TEXT,
  verified_at DATETIME
);
```

---

## 3. Labour-Market Intelligence & Competency Alignment Entities

### `industry_signals` & `skill_ontology`
Raw job signals and canonical dictionary for alias resolution.
```sql
CREATE TABLE IF NOT EXISTS industry_signals (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,           -- job_posting, curriculum, internship
  company_or_institution TEXT NOT NULL,
  job_title TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  location TEXT,
  experience_level TEXT,               -- entry, mid, senior
  ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skill_ontology (
  id TEXT PRIMARY KEY,
  canonical_name TEXT UNIQUE NOT NULL, -- e.g. "docker", "react", "postgresql"
  category TEXT NOT NULL,              -- language, framework, database, tool, concept
  aliases TEXT NOT NULL                -- JSON array: ["docker-compose", "containerization"]
);
```

### `requirement_matrix`
Reviewed and approved role-to-skill mappings with market recurrence weighting.
```sql
CREATE TABLE IF NOT EXISTS requirement_matrix (
  id TEXT PRIMARY KEY,
  role_title TEXT NOT NULL,            -- e.g. "Backend Engineer"
  canonical_skill TEXT NOT NULL,
  min_experience_years INTEGER DEFAULT 0,
  recurrence_count INTEGER DEFAULT 1,
  importance_weight REAL DEFAULT 1.0,  -- 0.0 - 5.0
  is_human_reviewed INTEGER DEFAULT 0, -- 0 = raw, 1 = faculty/expert approved
  reviewed_by TEXT REFERENCES users(id),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_title, canonical_skill)
);
```

### `student_competencies` & `project_upgrades`
Tracks student gap statuses and generated upgrade roadmaps.
```sql
CREATE TABLE IF NOT EXISTS student_competencies (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  target_role TEXT NOT NULL,
  canonical_skill TEXT NOT NULL,
  status TEXT DEFAULT 'MISSING',       -- MISSING, IN_PROGRESS, VERIFIED
  last_evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, target_role, canonical_skill)
);

CREATE TABLE IF NOT EXISTS project_upgrades (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT NOT NULL REFERENCES projects(id),
  missing_skill TEXT NOT NULL,
  upgrade_type TEXT NOT NULL,          -- UPGRADE_EXISTING_PROJECT, NEW_IDE_PROJECT
  milestone_id TEXT REFERENCES milestones(id),
  status TEXT DEFAULT 'pending',       -- pending, completed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `competency_evidence` & `outcome_feedback`
Cryptographic or verifiable artifacts demonstrating competency and loop-closure feedback.
```sql
CREATE TABLE IF NOT EXISTS competency_evidence (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  canonical_skill TEXT NOT NULL,
  project_id TEXT REFERENCES projects(id),
  task_id TEXT REFERENCES tasks(id),
  evidence_type TEXT NOT NULL,         -- task_completion, code_artifact, git_commit
  artifact_summary TEXT,
  verified_by TEXT DEFAULT 'socrates_qa',
  verified_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outcome_feedback (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  target_role TEXT NOT NULL,
  outcome TEXT NOT NULL,               -- placed, shortlisted, interview_failed
  feedback_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
