# Implementation Plan: Societal Problems → AI Project → Collaborative Solution

## Goal Description
Implement a complete end-to-end feature in **P-S (Project-Skill)** that connects real-world societal problems to AI-assisted collaborative student projects and deployed solutions:
`Citizen Problem Submission → AI Problem Intelligence & Deduplication → Problem Marketplace → Mentor/University Adoption → AI Architecture & Project Planning → Project Course & Team Formation → Real-Time Collaborative Development (with VS Code Live Share boundary) → AI Mentor Guidance → Dual-Axis AI QA (Technical + Problem Alignment) → Pilot Deployment & Impact Tracking`.

The architecture extends existing modules (`database.js`, `api.js`, `goalClarifier.js`, `milestoneGenerator.js`, `taskPlanner.js`, `qaCritic.js`, `mentorEngine.js`, `socketService.js`, `workspaceService.js`, and the React frontend) cleanly, preserving all existing functionality while introducing a robust domain model.

---

## User Review Required

> [!IMPORTANT]
> **Key Architectural Decisions for Review**:
> 1. **Location Selector & Privacy**: We will use OpenStreetMap tiles with interactive pin-dropping and Nominatim reverse geocoding. Exact coordinates will be stored for administration, while public views will respect the citizen's privacy setting (Exact, Locality, District, Approximate). No external paid API keys (e.g. Google Maps) are required by default.
> 2. **Media Upload Storage**: We will store media safely in `backend/data/uploads/` with UUID filenames, MIME-type validation, size caps (10MB for images, 50MB for video), and secure streaming routes, bumping `express.json` limit to handle client payloads safely.
> 3. **VS Code Live Share Integration Boundary**: Rather than attempting to embed the closed-source VS Code desktop extension inside the browser Monaco editor, we build an external collaboration orchestration boundary (`/projects/:id/collaboration`) and a set of REST endpoints for the future "P-S Project Collaborator" VS Code extension.
> 4. **AI Deduplication & Fallback**: Deduplication checks use title/keyword Jaccard + n-gram semantic similarity over existing problem records, with LLM verification for high-similarity matches. If the LLM provider (Groq/Ollama) is offline, deterministic fallback heuristics ensure the platform never crashes.

---

## Proposed Changes

### Phase 1: Database Architecture & Migration Layer

Extend [database.js](file:///c:/Project-Skill/P-S/backend/src/db/database.js) with native SQLite tables and auto-migrations:

#### [MODIFY] [database.js](file:///c:/Project-Skill/P-S/backend/src/db/database.js)
- Add new tables:
  - `societal_problems`: `id`, `user_id` (submitter), `title`, `description`, `problem_type`, `category_id`, `status` (`DRAFT`, `SUBMITTED`, `AI_ANALYZING`, `AI_ANALYZED`, `REVIEW_REQUIRED`, `APPROVED`, `PUBLISHED`, `REJECTED`, `DUPLICATE`, `NEEDS_CLARIFICATION`, `ARCHIVED`), `urgency`, `severity`, `people_affected`, `geographic_scope`, `privacy_level` (`exact`, `locality`, `district`, `approximate`), `expected_impact`, `created_at`, `updated_at`.
  - `problem_media`: `id`, `problem_id`, `media_type` (`image`, `video`), `file_path`, `original_name`, `mime_type`, `size_bytes`, `created_at`.
  - `problem_locations`: `id`, `problem_id`, `latitude`, `longitude`, `formatted_address`, `district`, `state`, `country`, `privacy_level`.
  - `problem_ai_analysis`: `id`, `problem_id`, `summary`, `problem_statement`, `affected_stakeholders` (JSON), `root_causes` (JSON), `key_requirements` (JSON), `constraints` (JSON), `urgency`, `severity`, `estimated_scope`, `expected_impact`, `potential_solution_domains` (JSON), `required_skills` (JSON), `recommended_project_type`, `recommended_team_roles` (JSON), `technology_domains` (JSON), `confidence` (REAL), `created_at`.
  - `problem_categories`: `id`, `name`, `slug`, `icon`, `description`, `is_active`.
  - `problem_reviews`: `id`, `problem_id`, `reviewer_id`, `verdict` (`approved`, `rejected`, `needs_clarification`), `review_notes`, `created_at`.
  - `problem_duplicates`: `id`, `problem_id`, `matched_problem_id`, `similarity_score` (REAL), `status` (`pending`, `confirmed`, `dismissed`).
  - `problem_interests`: `id`, `problem_id`, `user_id`, `role_preference`, `note`, `status`, `created_at`.
  - `project_architectures`: `id`, `project_id`, `version` (INTEGER), `title`, `system_overview`, `frontend_arch`, `backend_arch`, `database_arch`, `aiml_arch`, `data_flow`, `deployment_arch`, `security_arch`, `components_json` (JSON), `is_approved` (INTEGER), `created_by`, `created_at`.
  - `project_teams`: `id`, `project_id`, `name`, `created_at`.
  - `project_team_members`: `id`, `team_id`, `user_id`, `role` (`frontend`, `backend`, `ml`, `uiux`, `devops`, `qa`, `research`), `assigned_task_id`, `status` (`active`, `invited`, `requested`), `created_at`.
  - `requirements`: `id`, `project_id`, `problem_id`, `source_type` (`problem_statement`, `functional`, `non_functional`), `title`, `description`, `priority` (`must`, `should`, `could`), `status` (`pending`, `in_progress`, `implemented`, `verified`).
  - `requirement_tasks`: `id`, `requirement_id`, `task_id`.
  - `requirement_qa`: `id`, `requirement_id`, `qa_review_id`, `status` (`pass`, `partial`, `fail`), `score` (REAL), `evidence_text`, `missing_pieces_text`.
  - `collaboration_sessions`: `id`, `project_id`, `host_id`, `task_id`, `title`, `status` (`active`, `paused`, `ended`), `live_share_url`, `permission_mode` (`full`, `read_only`), `started_at`, `ended_at`.
  - `collaboration_participants`: `id`, `session_id`, `user_id`, `role`, `joined_at`, `left_at`.
  - `impact_metrics`: `id`, `project_id`, `metric_type` (`people_reached`, `cost_reduction`, `time_saved`, `environmental`, `accessibility`, `custom`), `label`, `unit`, `estimated_value` (REAL), `measured_value` (REAL), `evidence_notes`, `updated_at`.
- Add column migrations to `projects`:
  - `problem_id REFERENCES societal_problems(id)`
  - `architecture_version INTEGER DEFAULT 1`
- Seed default problem categories:
  - `Local Community`, `Education`, `Healthcare`, `Agriculture`, `Water`, `Sanitation`, `Environment`, `Accessibility`, `Public Infrastructure`, `Rural Development`, `Urban Development`, `Public Services`, `Other`.

---

### Phase 2: AI Problem Intelligence & Deduplication Engines

#### [NEW] [problemIntelligence.js](file:///c:/Project-Skill/P-S/backend/src/engines/problemIntelligence.js)
- Build the core AI analysis pipeline for citizen problems using `callClaudeJSON` from `db/claude.js` with structured fallback.
- Transforms informal citizen complaints into the exact required schema:
  - `problem_type`, `primary_category`, `secondary_categories`, `summary`, `problem_statement`, `affected_stakeholders`, `root_causes`, `key_requirements`, `constraints`, `urgency`, `severity`, `estimated_scope`, `expected_impact`, `potential_solution_domains`, `required_skills`, `recommended_project_type`, `recommended_team_roles`, `technology_domains`, `duplicate_candidates`, `confidence`.
- Deduplication engine: compares against existing published/submitted problems via text similarity (token n-grams & TF-IDF/Jaccard) to discover potential matches with similarity % (e.g. 91%, 84%).
- Human review state machine logic: transitions between `DRAFT → SUBMITTED → AI_ANALYZING → AI_ANALYZED → REVIEW_REQUIRED → APPROVED → PUBLISHED`.

---

### Phase 3: Media Upload, Storage & Location Privacy

#### [NEW] [mediaService.js](file:///c:/Project-Skill/P-S/backend/src/services/mediaService.js)
- Securely processes uploaded media files (JPG, JPEG, PNG, WEBP, MP4, WEBM).
- Validates MIME headers and magic bytes.
- Generates cryptographically secure filenames (UUIDv4) and stores them in isolated folder `backend/data/uploads/`.
- Prevents path traversal and never exposes internal filesystem paths.

#### [MODIFY] [server.js](file:///c:/Project-Skill/P-S/backend/src/server.js)
- Increase JSON/URL-encoded payload limits to `50mb` to support media uploads smoothly.
- Serve media via authenticated/safe route handler `/api/v1/media/:id`.
- Mount `/api/v1/problems` and `/api/v1/projects` extensions.

---

### Phase 4: Backend REST API Endpoints & RBAC

#### [NEW] [problems.js](file:///c:/Project-Skill/P-S/backend/src/routes/problems.js)
- `POST /api/v1/problems`: Submit problem (Citizen/Any authenticated user).
- `GET /api/v1/problems`: Browse published problems with search & filters (category, type, district, urgency, severity, skills, status, sort).
- `GET /api/v1/problems/categories`: List active problem categories.
- `GET /api/v1/problems/:id`: Get problem detail with AI analysis, media, location, project opportunities, and adoption state.
- `PATCH /api/v1/problems/:id`: Edit problem (Author only while DRAFT or Admin).
- `DELETE /api/v1/problems/:id`: Delete draft problem.
- `POST /api/v1/problems/:id/analyze`: Trigger/re-run AI analysis.
- `POST /api/v1/problems/:id/review`: Approve/reject/request clarification (Admin/University review).
- `POST /api/v1/problems/:id/publish`: Publish approved problem.
- `POST /api/v1/problems/:id/interest`: Student expresses interest or requests to join.
- `GET /api/v1/problems/:id/interest`: List student interest for this problem.
- `POST /api/v1/problems/:id/create-project`: Convert problem into project (Mentor/University).
- `POST /api/v1/problems/:id/create-course`: Create linked Project Course.

#### [NEW] [projectExtensions.js](file:///c:/Project-Skill/P-S/backend/src/routes/projectExtensions.js)
- `GET /api/v1/projects/:id/problem`: Return linked problem and analysis.
- `GET /api/v1/projects/:id/architecture`: Get active and historical architectures.
- `POST /api/v1/projects/:id/architecture/generate`: Generate new architecture version (v1, v2, v3...).
- `POST /api/v1/projects/:id/architecture/approve`: Approve specific version.
- `GET /api/v1/projects/:id/team`: Get project team members, roles, and status.
- `POST /api/v1/projects/:id/team/invite`: Invite student or assign role.
- `POST /api/v1/projects/:id/team/join`: Request to join team.
- `PATCH /api/v1/projects/:id/team/member/:memberId`: Update member role or assign task.
- `DELETE /api/v1/projects/:id/team/member/:memberId`: Remove member.
- `GET /api/v1/projects/:id/collaboration/session`: Get active collaboration session.
- `POST /api/v1/projects/:id/collaboration/session`: Start new Live Share collaboration session.
- `PATCH /api/v1/projects/:id/collaboration/session/:sessionId`: End or update session.
- `GET /api/v1/projects/:id/requirements`: Get requirement traceability matrix.
- `POST /api/v1/projects/:id/requirements`: Add/update project requirements.
- `POST /api/v1/projects/:id/qa/alignment`: Run Dual-Axis QA (Technical + Problem Requirement Alignment).
- `GET /api/v1/projects/:id/impact`: Get impact metrics and measurements.
- `POST /api/v1/projects/:id/impact`: Add or update estimated and measured impact.
- `GET /api/v1/vscode/project/:id`: VS Code extension integration endpoint (exports project state, tasks, collaboration link, and AI mentor context).

---

### Phase 5: AI Architecture, Milestone, Task & QA Engine Extensions

#### [NEW] [architectureGenerator.js](file:///c:/Project-Skill/P-S/backend/src/engines/architectureGenerator.js)
- Generates comprehensive architectural blueprints from the analyzed problem and project context:
  - Component diagram (Mermaid/structured JSON)
  - System architecture (frontend, backend, database, AI/ML, data flow, deployment, security)
  - Technology stack recommendations with explicit rationale
  - Recommended team roles and skill mappings
- Preserves historical versions (`Architecture v1`, `v2`, etc.).

#### [MODIFY] [milestoneGenerator.js](file:///c:/Project-Skill/P-S/backend/src/engines/milestoneGenerator.js)
- Support societal problem context (stakeholders, root causes, constraints, urgency) to generate project-specific, non-hardcoded milestone sequences.

#### [MODIFY] [taskPlanner.js](file:///c:/Project-Skill/P-S/backend/src/engines/taskPlanner.js)
- Include requirement links, assigned roles, required skills, and learning resources per task.

#### [MODIFY] [qaCritic.js](file:///c:/Project-Skill/P-S/backend/src/engines/qaCritic.js)
- Extend QA critic to evaluate two dimensions:
  1. Technical Correctness (Functionality, Code Quality, Security, Architecture)
  2. Problem Alignment (Does the implementation actually address the original citizen problem and requirements?).
- Outputs requirement-level traceability: Requirement → Implemented? → Evidence → Score → Missing pieces.

#### [MODIFY] [mentorEngine.js](file:///c:/Project-Skill/P-S/backend/src/engines/mentorEngine.js)
- Incorporate full societal problem context into AI Mentor: Societal Problem + AI Problem Analysis + Project Goal + Architecture + Milestones + Current Task + Student Role + Workspace Files + Previous QA Results.

---

### Phase 6: Frontend Pages & Navigation

#### [MODIFY] [App.jsx](file:///c:/Project-Skill/P-S/frontend/src/App.jsx)
- Add "Societal Problems" (`/problems`) to header navigation bar.
- Add routes:
  - `/problems` (`SocietalProblemsPage`)
  - `/problems/submit` (`ProblemSubmitPage`)
  - `/problems/:id` (`ProblemDetailPage`)
  - `/projects/:id/architecture` (`ProjectArchitecturePage`)
  - `/projects/:id/team` (`ProjectTeamPage`)
  - `/projects/:id/requirements` (`ProjectRequirementsPage`)
  - `/projects/:id/impact` (`ProjectImpactPage`)

#### [NEW] [ProblemSubmitPage.jsx](file:///c:/Project-Skill/P-S/frontend/src/pages/ProblemSubmitPage.jsx)
- Citizen Problem Submission Wizard:
  - Problem Type selector (configurable list with icon badges).
  - Problem Title input with helpful examples.
  - Problem Description (What is happening? Where? Who is affected? Consequences? Frequency?).
  - Multiple Image Upload with file preview cards, remove buttons, and size/format checks.
  - Video Upload with progress indicator, filename, file size, remove button.
  - Interactive Location Selector: OpenStreetMap tile renderer with pin-drop, pin-drag, search with autocomplete (Nominatim), and GPS "Use Current Location".
  - Privacy level selector (Exact, Locality, District, Approximate).
  - Category selection + "Let AI categorize this for me" toggle.
  - Expected Impact section: qualitative description + structured counters (people affected, urgency, geographic scope, social/economic/environmental benefits).

#### [NEW] [SocietalProblemsPage.jsx](file:///c:/Project-Skill/P-S/frontend/src/pages/SocietalProblemsPage.jsx)
- Marketplace / Discovery for real-world problems:
  - Search bar (semantic / keyword query).
  - Multi-faceted filter bar: Category, Problem Type, District/State, Urgency, Severity, Project Status (Open, Adopted, In Development, Solved), Required Skills, Difficulty.
  - Problem Cards: Title, short description, category badge, problem type, location, urgency/severity badges, people affected, status, AI confidence score, required skills, thumbnail image, adoption badge.
  - Sort by: Newest, Highest Impact, Urgency, Most Discussed.

#### [NEW] [ProblemDetailPage.jsx](file:///c:/Project-Skill/P-S/frontend/src/pages/ProblemDetailPage.jsx)
- Problem Overview tab: Title, submitter info, date, privacy-respecting location, image gallery, video player, impact summary.
- AI Problem Analysis tab: Refined problem statement, stakeholders, root causes, key requirements, constraints, urgency, severity, required skills, suggested technology domains, duplicate candidate alerts.
- Project Opportunities panel:
  - Mentor: "Create Project", "Create Project Course", "Adopt Problem".
  - University: "Adopt Problem", "Create Team".
  - Student: "Express Interest", "Join Team", "View Learning Resources".
  - Convert-to-Project modal that pre-populates project goal, requirements, and constraints directly from AI analysis.

#### [NEW] [ProjectArchitecturePage.jsx](file:///c:/Project-Skill/P-S/frontend/src/pages/ProjectArchitecturePage.jsx)
- Architecture visualization:
  - System architecture overview, component diagrams, frontend, backend, AI/ML, data flow, deployment, security.
  - Version switcher (v1, v2, v3...) with "Regenerate with AI" and "Approve Architecture" buttons.

#### [NEW] [ProjectTeamPage.jsx](file:///c:/Project-Skill/P-S/frontend/src/pages/ProjectTeamPage.jsx)
- Team management:
  - Member cards with assigned role (Frontend, Backend, ML, UI/UX, DevOps, QA, Research).
  - Current task indicators, activity status, invite student modal, join request approval.

#### [NEW] [ProjectRequirementsPage.jsx](file:///c:/Project-Skill/P-S/frontend/src/pages/ProjectRequirementsPage.jsx)
- Traceability Matrix:
  - Citizen Problem Requirement → Project Requirement → Milestone → Task → Code Deliverable → QA Test → Status.
  - Visual completion tracker answering: *"How does the final solution address the original citizen problem?"*

#### [NEW] [ProjectImpactPage.jsx](file:///c:/Project-Skill/P-S/frontend/src/pages/ProjectImpactPage.jsx)
- Impact measurement dashboard:
  - Side-by-side comparison: **Estimated Impact** vs **Measured Impact**.
  - Metrics: People affected, people reached, communities served, cost reduction, time saved, environmental impact, deployment status.

#### [MODIFY] [IdePage.jsx](file:///c:/Project-Skill/P-S/frontend/src/pages/IdePage.jsx)
- Add "Collaborate" button in top bar and activity sidebar.
- Opens Collaboration Panel:
  - Start/Join Live Share session.
  - Generate session URL and shareable invite code.
  - Active participants list with role and cursor status.
  - VS Code Extension launch button ("Open in VS Code with Live Share").

#### [MODIFY] [api/client.js](file:///c:/Project-Skill/P-S/frontend/src/api/client.js)
- Add client methods for problems, analysis, reviews, conversion, architecture, team, collaboration, requirements, and impact.

---

## Verification Plan

### Automated Tests
- Create backend integration test suite in `backend/scripts/test_societal_problems.js`:
  - `npm test` or `node scripts/test_societal_problems.js` to verify:
    1. Schema initialization and table migrations.
    2. Citizen problem submission with location and media references.
    3. AI problem intelligence extraction and structured response schema validation.
    4. Deduplication comparison logic and score calculation.
    5. Human review approval lifecycle (`DRAFT → REVIEW_REQUIRED → APPROVED → PUBLISHED`).
    6. Problem-to-Project conversion with inherited requirements and traceability.
    7. Architecture generation and versioning.
    8. Team role assignment and member management.
    9. Dual-Axis QA execution (technical + problem requirement alignment).
    10. Impact metrics logging (estimated vs measured).
    11. RBAC authorization checks for Citizen, Student, Mentor, University, Admin.

### Manual Verification
1. Open browser in development mode:
   - Navigate to `/problems` to check problem discovery, search, and category filters.
   - Click "Submit Problem" (`/problems/submit`), fill in the citizen form:
     - Test pin drop and location search on the map.
     - Upload multiple image previews.
     - Select "Let AI categorize this for me".
     - Submit problem and observe status transition.
2. Review Problem:
   - View problem details at `/problems/:id`.
   - Verify AI problem intelligence breakdown (root causes, stakeholders, requirements, skills).
3. Convert to Project:
   - As Mentor/University, click "Create Project" from problem page.
   - Confirm pre-populated project details, generated architecture, milestones, and traceable requirements.
4. Test Collaboration & IDE:
   - Navigate to `/projects/:id/architecture`, inspect diagrams and versions.
   - Navigate to `/projects/:id/team`, inspect role assignments.
   - Open IDE (`/ide`), click "Collaborate", test session generation and Live Share integration link.
5. Verify Traceability & Impact:
   - Check `/projects/:id/requirements` to see the end-to-end matrix.
   - Check `/projects/:id/impact` for estimated vs measured impact dashboard.
