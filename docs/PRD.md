# Product Requirements Document (PRD) — SOCRATES

## 1. Executive Summary

**SOCRATES (Project-Skill)** is an execution-driven AI engineering mentor and civic innovation platform. It bridges theoretical education, open-ended problem exploration, and industry competency requirements through structured, verified development workflows.

Unlike conversational AI tools that provide complete copy-paste code solutions, SOCRATES enforces Socratic learning: it decomposes goals into verifiable milestones and atomic tasks, provides progressive hints (concept → structural direction → partial skeleton with TODOs), verifies student implementations via automated and rubric-based QA, and tracks authenticated competency evidence.

The platform operates across two primary execution tracks:
- **Pipeline A (Direct Project Track):** Individual student goal clarification, milestone generation, embedded IDE execution, and progressive verification.
- **Pipeline B (Civic Innovation Track):** Citizen problem intake with geospatial and media validation, AI-assisted feasibility and requirement decomposition, mentor-led university project adoption, student team formation, requirement traceability, and post-deployment impact measurement.
- **Labour-Market Intelligence & Competency Alignment:** Extraction of real-time role competencies from industry signals (job descriptions), human review by academic/industry validators, student baseline gap analysis, project upgrades or new project generation, and evidence recording.

---

## 2. Target Personas & Access Boundaries

| Persona | Role Identifier | Primary Capabilities | Constraints |
|---|---|---|---|
| **Student** | `student` | Submit project goals, solve assigned milestone tasks in the Monaco IDE, request tiered Socratic hints, apply to societal problem solution teams, view labour-market competency gaps. | Cannot bypass QA verification; cannot paste external code into the editor; cannot adopt problems. |
| **Mentor / Faculty** | `mentor`, `university` | Adopt citizen problems, generate and approve system architectures, configure student team rosters, review priority intervention queue, build structured courses. | Cannot edit student project files directly; must provide pedagogical feedback. |
| **Citizen** | `citizen` | Report civic and environmental challenges with location coordinates and validated media evidence; monitor progress via Citizen Dashboard; participate in community voting and feedback. | Cannot access cloud IDE, terminal, or internal development artifacts. |
| **Platform Admin** | `admin` | System-wide observability, user role moderation, category management, system metrics inspection. | Access guarded by strict email whitelist (`ADMIN_EMAILS`). |

---

## 3. Core Functional Requirements

### 3.1 Pipeline A: Direct Student Project Execution

1. **Goal Intake & Socratic Clarification:**
   - The student submits a high-level project vision.
   - The `GoalClarifier` engine conducts a targeted multi-turn technical interview (up to 10 rounds) to establish technical constraints, tech stack, architecture boundaries, and deliverables.
2. **Deterministic Milestone Breakdown:**
   - The `MilestoneGenerator` produces 3–5 sequentially locked milestones with concrete duration estimates and measurable outputs.
3. **Daily Task Planning:**
   - The `TaskPlanner` breaks the active milestone into day-by-day atomic tasks containing:
     - Learning objectives and concepts taught.
     - CLI commands to execute.
     - Folder structure scaffolding.
     - Starter code templates containing only skeletons and `TODO` markers.
4. **Embedded Cloud IDE & Terminal Sandbox:**
   - In-browser Monaco editor with multi-file directory tree navigation and real-time syntax checking.
   - Interactive terminal connected via WebSocket (`/api/v1/terminal`) to a sandboxed `node-pty` session.
   - Filesystem operations restricted strictly to `./workspace/<projectId>` with relative path validation.
5. **Progressive Hint Ladder:**
   - Level 1: Conceptual explanation and architectural guidance.
   - Level 2: Algorithmic direction and pseudo-code structure.
   - Level 3: Partial skeleton code with specific syntax hints. Direct complete solutions are strictly prohibited.
6. **Automated QA & Task Verification:**
   - The `QACritic` engine evaluates student code against defined requirements, returning pass/fail status, actionable feedback, and an objective score (threshold: >= 0.70).

---

### 3.2 Pipeline B: Societal Problem to Solution Pipeline

1. **Citizen Problem Submission:**
   - Form inputs: title, detailed description, problem category, urgency (low, medium, high, critical), severity, estimated population affected, geographic scope, and expected social impact.
   - Geospatial validation: Coordinates and location attributes with user-configurable privacy levels (exact, locality, district).
   - Media validation: Binary signature (magic bytes) validation on upload preventing disguised files (PNG, JPEG, WebP, MP4).
2. **AI Problem Intelligence Analysis:**
   - Evaluates technical feasibility, urgency score (0–100), root causes, and formal technical requirements.
   - Deduplication: Compares incoming reports against existing database entries using semantic similarity to group duplicate complaints.
3. **Marketplace Discovery (`/problems`):**
   - Publicly searchable marketplace filterable by category, urgency, location, and status.
   - Authenticated upvoting and community comment threads.
4. **Mentor / University Adoption:**
   - Verified mentors adopt registered problems and trigger project conversion (`POST /api/v1/problems/:id/create-project`).
5. **System Architecture Generation:**
   - `ArchitectureGenerator` generates interactive Mermaid diagrams, backend/frontend module specifications, database schemas, and revisioned architectural records (v1 baseline, v2+ revisions).
6. **Student Team Formation:**
   - Multi-role allocation: Frontend, Backend, DevOps, Data/AI, QA, Project Lead.
   - Application and approval workflow between students and mentors.
7. **Requirements Traceability Matrix:**
   - Direct database foreign key linkage connecting initial citizen requirements (`project_requirements`) to developmental tasks and QA criteria.
8. **Outcome Impact Tracking:**
   - Dashboard comparing estimated beneficiaries with verified post-deployment metrics (e.g., liters of clean water monitored, transit delays reduced).

---

### 3.3 Labour-Market Intelligence & Competency Alignment

1. **Industry Signal Ingestion:**
   - Ingests structured job descriptions and skill demands.
   - Deterministic and LLM-assisted requirement extraction with experience tiering and multi-signal recurrence counting.
2. **Skill & Role Ontology:**
   - Canonical normalization of role titles and skill aliases (e.g., "Docker", "Containerization", "docker-compose" mapped to canonical `docker`).
3. **Human Review & Validation:**
   - Faculty or industry experts review and approve raw requirement matrices before they enter the authoritative curriculum.
4. **Student Baseline & Competency Gap Engine:**
   - Analyzes student completed projects and verified evidence against industry requirements.
   - Classifies gaps into:
     - `NO_ACTION`: Competency already demonstrated and verified.
     - `UPGRADE_EXISTING_PROJECT`: Relevant project exists; generates and appends an upgrade milestone with tasks.
     - `NEW_IDE_PROJECT`: No relevant project exists; initiates a targeted new project in the cloud IDE.
5. **Verified Competency Evidence:**
   - Automatically stores immutable proof (task output, commit, verification timestamp) when a student completes an assigned milestone.
6. **Outcome Feedback Loop:**
   - Tracks placement and interview outcomes to recalibrate industry signal weights.

---

## 4. Non-Functional Requirements

- **Security & Sandboxing:**
  - JWT token authentication with 30-day expiry.
  - Role-based access control guards on every mutating endpoint.
  - Terminal command filtering denylist blocking destructive commands (`rm -rf`, fork bombs, reverse shells).
  - Strict path traversal prevention: all file access bounded to the workspace directory via `path.relative`.
  - Binary magic-byte sniffing on uploaded media assets.
- **Reliability & Data Integrity:**
  - WAL (Write-Ahead Logging) enabled on SQLite for concurrent read operations.
  - Foreign key constraint enforcement (`PRAGMA foreign_keys = ON`).
  - Graceful degradation when external LLM APIs encounter rate limits.
- **Pedagogical Integrity:**
  - Copy-paste blocking on Monaco code inputs to encourage active typing.
  - Keystroke cadence analysis to detect external automated script injections.
