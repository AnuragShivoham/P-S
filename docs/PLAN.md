# Build Roadmap (Phases 0–11) — SOCRATES

This document outlines the phased engineering milestones of the SOCRATES platform, from monorepo foundation to multi-role civic integration and labour-market intelligence.

---

## Phase 0: Project Inception, Monorepo Scaffolding & Core Auth
- **Goal:** Establish monorepo structure, unified package management, and passwordless authentication.
- **Deliverables:**
  - Root, backend, and frontend directory isolation.
  - Node.js Express server initialization with SQLite (`node:sqlite` in WAL mode).
  - Passwordless Email OTP authentication flow (`/api/v1/auth/otp/send`, `/verify`) and Google OAuth token verification.
  - Role-Based Access Control (RBAC) middleware supporting `student`, `mentor`, `citizen`, `university`, and `admin`.

## Phase 1: Pipeline A — Direct Project Intake & Socratic Clarifier
- **Goal:** Implement the student-facing goal specification interview.
- **Deliverables:**
  - `GoalClarifier` engine with iterative technical questionnaire (up to 10 rounds).
  - Scope boundary setting, technology stack selection, and requirement formulation.
  - Project baseline state persistence in `projects` and `goals` tables.

## Phase 2: Embedded Monaco Cloud IDE & Interactive Terminal PTY Sandbox
- **Goal:** Provide an in-browser development environment with real filesystem isolation.
- **Deliverables:**
  - Monaco editor integration with language detection and live file switching.
  - `workspaceService` with directory sandboxing (`./workspace/<projectId>`) and strict traversal guards.
  - WebSocket-powered terminal connection using `node-pty` and `xterm.js`.
  - Security denylist blocking dangerous system commands.

## Phase 3: Socratic Mentor Engine & Milestone/Task Decomposition
- **Goal:** Break complex engineering goals into daily actionable tasks with progressive guidance.
- **Deliverables:**
  - `MilestoneGenerator` outputting 3–5 phased milestones with duration and acceptance metrics.
  - `TaskPlanner` decomposing milestones into daily atomic tasks with starter template code containing only structural skeletons and `TODO` markers.
  - `GuidedExecution` hint ladder: Tier 1 (Concept), Tier 2 (Direction), Tier 3 (Partial skeleton).

## Phase 4: Dual-Axis QA Critic & Verification System
- **Goal:** Automated evaluation of student code submissions against objective criteria.
- **Deliverables:**
  - `QACritic` engine scoring submissions across technical correctness and completeness (threshold >= 0.70).
  - Automated pass/fail status updates and actionable feedback generation.
  - Task completion recording and progress percentage calculations.

## Phase 5: Anti-Cheat & Student Behavior Analytics Engine
- **Goal:** Preserve pedagogical authenticity and detect external code copy-pasting.
- **Deliverables:**
  - Frontend event listeners intercepting and blocking clipboard paste actions on Monaco code inputs.
  - `BehaviorEngine` tracking typing duration, keystroke patterns, and external injection signals.
  - Warning banners and audit logs for non-authentic inputs.

## Phase 6: Adaptive Skill Profiler & Competency Progression
- **Goal:** Dynamic profiling of student technical competence across languages and frameworks.
- **Deliverables:**
  - `SkillEngine` calculating skill levels (`beginner`, `intermediate`, `advanced`) based on completed tasks.
  - Persistence in `user_skills` table with verified timestamping.
  - Adaptive hint adjustment tailored to the student's evaluated mastery level.

## Phase 7: Course Engine, Project Seeding & Mentor Intervention Hub
- **Goal:** Enable faculty and mentors to author structured courses and monitor struggling students.
- **Deliverables:**
  - `CourseBuilderPage` for defining curricula, milestones, and starter templates.
  - `MentorEngine` with priority-sorted intervention queue (`/api/v1/mentor/queue`) identifying students stuck on tasks.
  - Mentor feedback modals and direct intervention notes.

## Phase 8: Pipeline B — Societal Problems Marketplace & Citizen Reporting
- **Goal:** Connect citizen community challenges to university engineering talent.
- **Deliverables:**
  - Dedicated Citizen role with `CitizenDashboardPage` and submission flow (`/problems/submit`).
  - Geospatial validation with Leaflet maps and privacy masking (exact, locality, district).
  - Binary magic-byte validation on image/video evidence uploads via `mediaService`.
  - `ProblemIntelligence` engine assessing technical feasibility, severity, urgency, and deduplicating incoming complaints.
  - Public Marketplace (`/problems`) with category filters, upvoting, and community discussions.

## Phase 9: Project Architecture, Team Allocation, Traceability & Impact
- **Goal:** Convert adopted societal problems into formal collaborative engineering projects.
- **Deliverables:**
  - `ArchitectureGenerator` formulating interactive Mermaid diagrams and system contracts (v1 baseline, v2 revisions).
  - Team application and role allocation system (`Frontend`, `Backend`, `DevOps`, `QA`, `Lead`).
  - Requirements Traceability Matrix linking citizen pain points to specific daily tasks.
  - Real-world impact tracking dashboard comparing estimated beneficiaries to verified outcomes.

## Phase 10: Labour-Market Intelligence & Adaptive Role Upgrades
- **Goal:** Align student project outputs directly with verified industry demand signals.
- **Deliverables:**
  - Ingestion of industry job descriptions and skill demand signals.
  - Canonical `SkillOntology` normalizing framework and tool aliases.
  - Academic/industry human review workflow for requirement matrices.
  - `CompetencyGapEngine` analyzing student baselines and determining whether to upgrade an existing project with an additional milestone or initialize a targeted new project.
  - Immutable competency evidence store and employer feedback integration.

## Phase 11: Production Hardening, Security Audits & Technical Integrity
- **Goal:** Verify codebase stability, eliminate stale artifacts, and confirm architectural consistency.
- **Deliverables:**
  - Deprecate uninstalled external dependencies (`better-sqlite3`, `pg`, `ioredis`, `bullmq`) in favor of native Node 22 `node:sqlite`.
  - Full automated regression test suites (`labour_intelligence_test.js`, `test_societal_problems.js`).
  - Production frontend build verification (`vite build`).
  - Authoritative, synchronized documentation suite in `docs/`.
