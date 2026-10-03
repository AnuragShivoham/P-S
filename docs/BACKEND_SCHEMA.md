# Backend Database Schema & Data Shapes — SOCRATES

> **Source Code & Reference Branch:** [`feature/labour-intelligence`](https://github.com/AnuragShivoham/P-S/tree/feature/labour-intelligence)  
> The full production Labour-Market Intelligence schema is implemented in [`backend/src/db/labour_schema.js`](file:///c:/Project-Skill/P-S/backend/src/db/labour_schema.js).

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

> **Branch:** [`feature/labour-intelligence`](https://github.com/AnuragShivoham/P-S/tree/feature/labour-intelligence)  
> **Schema Source:** [`backend/src/db/labour_schema.js`](file:///c:/Project-Skill/P-S/backend/src/db/labour_schema.js)

### `industry_signals` — Industry Signal Layer
Ingested raw signals from JDs, internships, employer forms, expert consultations, and placement outcomes.
```sql
CREATE TABLE IF NOT EXISTS industry_signals (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,  -- 'job_description', 'internship', 'employer_form',
                              -- 'expert_input', 'hiring_drive', 'placement_outcome'
  source_name TEXT NOT NULL,
  source_url TEXT,
  organization TEXT,
  role_title TEXT,
  location TEXT,
  published_at TEXT,
  collected_at TEXT DEFAULT (datetime('now')),
  raw_content TEXT NOT NULL,
  parsed_content TEXT,        -- JSON: sections, detected skills, confidence scores
  status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'reviewed', 'archived'
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);
```

### `roles_ontology` — Canonical Role Hierarchy
```sql
CREATE TABLE IF NOT EXISTS roles_ontology (
  id TEXT PRIMARY KEY,        -- e.g. 'software-engineering-intern', 'backend-engineer'
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Engineering',
  description TEXT,
  parent_role_id TEXT REFERENCES roles_ontology(id),
  version INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### `skills_ontology` — Canonical Skill Taxonomy
```sql
CREATE TABLE IF NOT EXISTS skills_ontology (
  id TEXT PRIMARY KEY,        -- e.g. 'docker', 'oop', 'dsa', 'rest-api', 'observability'
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Core Engineering',
  description TEXT,
  proficiency_definitions TEXT, -- JSON: { beginner: "...", intermediate: "...", advanced: "..." }
  version INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### `skill_aliases` — Alias Resolution Table
Maps arbitrary skill phrases to canonical skill IDs (e.g. `"Dockerfiles"` → `docker`).
```sql
CREATE TABLE IF NOT EXISTS skill_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_id TEXT NOT NULL REFERENCES skills_ontology(id) ON DELETE CASCADE,
  alias TEXT UNIQUE NOT NULL
);
```

### `skill_relationships` — Ontology Hierarchy & Prerequisites
```sql
CREATE TABLE IF NOT EXISTS skill_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_skill_id TEXT NOT NULL REFERENCES skills_ontology(id) ON DELETE CASCADE,
  child_skill_id TEXT NOT NULL REFERENCES skills_ontology(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'contains'  -- 'contains', 'prerequisite', 'related'
);
```

### `labour_requirements` — Multi-Signal Requirement Matrix
Aggregates market demand signals across JDs, internships, employers, and expert reviews.
```sql
CREATE TABLE IF NOT EXISTS labour_requirements (
  id TEXT PRIMARY KEY,
  signal_id TEXT REFERENCES industry_signals(id) ON DELETE SET NULL,
  role_id TEXT NOT NULL REFERENCES roles_ontology(id),
  skill_id TEXT NOT NULL REFERENCES skills_ontology(id),
  requirement_type TEXT DEFAULT 'required',    -- 'required', 'preferred', 'nice_to_have'
  proficiency TEXT DEFAULT 'intermediate',     -- 'beginner', 'intermediate', 'advanced'
  experience_years REAL DEFAULT 0,
  source_reference TEXT,
  evidence_quote TEXT,
  extraction_method TEXT DEFAULT 'deterministic', -- 'deterministic', 'nlp', 'llm', 'manual'
  confidence REAL DEFAULT 1.0,
  status TEXT DEFAULT 'OBSERVED',             -- 'OBSERVED', 'EMERGING', 'REVIEW_REQUIRED',
                                              -- 'EXPERT_VALIDATED', 'APPROVED', 'DECLINING', 'REJECTED'
  job_signal_count INTEGER DEFAULT 1,
  internship_signal_count INTEGER DEFAULT 0,
  employer_signal_count INTEGER DEFAULT 0,
  expert_signal_count INTEGER DEFAULT 0,
  trend_score REAL DEFAULT 0.0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### `requirement_reviews` — Human Validation & Review Log
Audit trail of expert faculty and employer review decisions.
```sql
CREATE TABLE IF NOT EXISTS requirement_reviews (
  id TEXT PRIMARY KEY,
  requirement_id TEXT NOT NULL REFERENCES labour_requirements(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  reviewer_role TEXT NOT NULL,    -- 'expert', 'employer', 'mentor', 'institution', 'admin'
  decision TEXT NOT NULL,        -- 'APPROVE', 'MODIFY', 'REJECT', 'REQUEST_MORE_EVIDENCE'
  comments TEXT,
  suggested_proficiency TEXT,
  suggested_learning_outcomes TEXT,    -- JSON array
  suggested_evidence_requirements TEXT, -- JSON array
  suggested_project_context TEXT,
  version INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### `student_competency_profiles` — Multi-Tier Student Evidence
Tracks per-student, per-skill evidence states across four verified tiers.
```sql
CREATE TABLE IF NOT EXISTS student_competency_profiles (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  skill_id TEXT NOT NULL REFERENCES skills_ontology(id),
  status TEXT DEFAULT 'CLAIMED',  -- 'CLAIMED', 'OBSERVED', 'ASSESSED', 'VERIFIED'
  claimed_source TEXT,    -- e.g. 'CV / Resume'
  observed_source TEXT,   -- e.g. 'GitHub Project Scan'
  assessed_source TEXT,   -- e.g. 'Assessment Quiz Passed'
  verified_source TEXT,   -- e.g. 'I.D.E. Build, Test & QA Validation + Mentor Review'
  proficiency_level TEXT DEFAULT 'beginner',
  confidence_score REAL DEFAULT 0.5,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(student_id, skill_id)
);
```

### `competency_evidence_store` — Immutable Verified Evidence Records
Persistent store for all QA-verified evidence artifacts linked to IDE projects and test outputs.
```sql
CREATE TABLE IF NOT EXISTS competency_evidence_store (
  id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL REFERENCES users(id),
  skill_id TEXT NOT NULL REFERENCES skills_ontology(id),
  role_id TEXT REFERENCES roles_ontology(id),
  project_id TEXT REFERENCES projects(id),
  milestone_id TEXT REFERENCES milestones(id),
  task_id TEXT REFERENCES tasks(id),
  assessment_id TEXT,
  evidence_type TEXT NOT NULL, -- 'source_code', 'test_results', 'execution_result',
                               -- 'project_artifact', 'technical_explanation', 'ide_validation'
  evidence_location TEXT,      -- File path, workspace URI, or Git commit hash
  evidence_payload TEXT,       -- JSON: test output, coverage %, health probe logs, QA score, mentor notes
  reviewer_id TEXT REFERENCES users(id),
  rubric_version INTEGER DEFAULT 1,
  competency_version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'VERIFIED',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### `project_upgrades` — Non-Destructive Project Upgrade Records
Links targeted skill upgrade milestones to existing student projects without overwriting code.
```sql
CREATE TABLE IF NOT EXISTS project_upgrades (
  id TEXT PRIMARY KEY,
  base_project_id TEXT NOT NULL REFERENCES projects(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  target_skill_id TEXT NOT NULL REFERENCES skills_ontology(id),
  target_requirement_id TEXT REFERENCES labour_requirements(id),
  upgrade_title TEXT NOT NULL,
  upgrade_milestone_id TEXT REFERENCES milestones(id),
  status TEXT DEFAULT 'pending',   -- 'pending', 'in_progress', 'completed', 'verified'
  generated_by TEXT DEFAULT 'AI_GAP_ENGINE',
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);
```

### `employer_feedback_records` — Closed-Loop Placement Outcome Feedback
Captures employer interview and hiring outcomes, feeding back into the market signal demand counters.
```sql
CREATE TABLE IF NOT EXISTS employer_feedback_records (
  id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL REFERENCES users(id),
  candidate_id TEXT NOT NULL REFERENCES users(id),
  role_id TEXT REFERENCES roles_ontology(id),
  hiring_status TEXT NOT NULL,       -- 'hired', 'internship_completed', 'interviewed', 'rejected'
  competency_feedback TEXT,          -- JSON: { skill_id: "employer comment" }
  gap_notes TEXT,
  readiness_rating INTEGER,          -- 1–5
  communication_rating INTEGER,      -- 1–5
  created_at TEXT DEFAULT (datetime('now'))
);
```

> **Test Coverage:** All 8 Labour Intelligence schema tables are exercised and verified in  
> [`backend/tests/labour_intelligence_test.js`](file:///c:/Project-Skill/P-S/backend/tests/labour_intelligence_test.js) — **12/12 integration tests passing** on branch `feature/labour-intelligence`.
