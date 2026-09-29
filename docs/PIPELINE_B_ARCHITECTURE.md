# 🏛️ PIPELINE B — Societal Problem → Community Solution
## Comprehensive System Architecture Document

> **SOCRATES (PROJECT-SKILL)**  
> *Civic Innovation & Engineering Engine — Transforming Citizen Voice into Deployed Software Reality*

---

## 1. Executive Summary & Dual-Pipeline Foundation

SOCRATES operates on a dual-pipeline paradigm designed to bridge the chasm between theoretical learning ("tutorial hell") and pressing real-world societal problems.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               SOCRATES DUAL PIPELINE                                │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│  PIPELINE A: Student Direct Execution    │  PIPELINE B: Societal Problem → Solution    │
├──────────────────────────────────────────┼─────────────────────────────────────────────┤
│  • Self-driven student raw idea          │  • Real citizen/community civic pain point   │
│  • Solo or pair exploration              │  • Multi-disciplinary student team squad    │
│  • Synthetic/hypothetical requirements   │  • Grounded civic & field requirements      │
│  • Portfolio demonstration goal          │  • Production civic deployment & real impact│
│  • Mentor assists on code syntax/logic   │  • Mentor + Citizen + Sponsor validation    │
└──────────────────────────────────────────┴─────────────────────────────────────────────┘
```

### The Pipeline B Flow Diagram

```
  📢 Stage 1: Citizen Voices & Problems (Submissions + Geo + Media)
     │
     ▼
  ⚡ Stage 2: AI Problem Synthesizer & Deduplication (Gemini Engine)
     │
     ▼
  🗳️ Stage 3: Community Voting & Prioritization (Civic Heatmap)
     │
     ▼
  💼 Stage 4: Corporate / CSR / Sponsor Backing & University Adoption
     │
     ▼
  👥 Stage 5: Student Team Matching & Forming (Skill-based Squads)
     │
     ▼
  🎯 Stage 6: Milestone Generator & Task Planner (Traceable Specs)
     │
     ▼
  🧑‍💻 Stage 7: Monaco IDE + Socratic Mentor Engine [Pipeline B]
     │
     ▼
  🧪 Stage 8: Community Alpha Testing & Citizen Feedback (Dual QA)
     │
     ▼
  🚀 Stage 9: Real Deployment + Field Impact Metric (Civic ROI)
```

---

## 2. End-to-End Deep Dive: The 9 Stages of Pipeline B

---

### 📢 Stage 1: Citizen Voices & Problems
* **Purpose**: Empower everyday citizens, NGOs, local panchayats, and civic bodies to report urgent community problems without needing technical jargon.
* **Key Capabilities**:
  - Voice-to-text / plain language civic problem submission.
  - Geo-location tagging (latitude, longitude, locality, ward, district, postal code).
  - Multimedia evidence upload (photos, videos, documents up to 50MB via Multer).
  - Target demographic & community size estimation.
* **Frontend Components**:
  - `ProblemSubmitPage.jsx`: Multi-step submission form with Leaflet map picker and media dropzone.
  - `CitizenDashboardPage.jsx`: Citizen tracking portal showing status (`submitted` → `analyzed` → `approved` → `in_development` → `deployed`).
* **Backend Routes & Endpoints**:
  - `POST /api/problems`: Accepts `title`, `description`, `category_id`, `urgency_level`, `impact_scope`, `affected_population`, `estimated_beneficiaries`, `location`, `media_files`. Guarded by `requireRole('citizen', 'admin')`.
  - `GET /api/problems/my`: Retrieves all problems submitted by the authenticated citizen.
  - `GET /api/problems/my/stats`: Provides summary metrics (total submissions, active projects, resolved issues).
* **Database Tables**:
  - `societal_problems`: Core record with title, description, category, urgency (`low`, `medium`, `high`, `critical`), and status (`draft`, `submitted`, `analyzed`, `under_review`, `approved`, `rejected`, `adopted`, `in_progress`, `completed`).
  - `problem_locations`: Latitude, longitude, address, city, district, state, country, pincode.
  - `problem_media`: File paths, mime types, file sizes, captions, and storage URIs.

---

### ⚡ Stage 2: AI Problem Synthesizer & Deduplication
* **Purpose**: Clean, normalize, categorize, and cross-reference new submissions against existing civic challenges to prevent duplication and maximize engineering efficiency.
* **Key Capabilities**:
  - **Categorization & Tagging**: Automatically maps raw descriptions to domain ontologies (Water & Sanitation, Urban Mobility, Healthcare Access, Waste Management, Education, Renewable Energy).
  - **Technical Feasibility Scoring**: Evaluates whether the problem is solvable through software, IoT, web platforms, or mobile apps.
  - **Semantic Deduplication**: Evaluates semantic similarity against existing problem records.
  - **Impact Potential Score (0-100)**: Computes multi-factor metric factoring urgency, population, and feasibility.
* **Backend Service & Routing**:
  - `aiService.js` / `groqClient.js`: LLM prompt pipeline generating structured JSON summaries, technical requirements, and similarity scores.
  - `POST /api/problems/:id/analyze`: Triggers automated synthesizer workflow.
* **Database Tables**:
  - `problem_ai_analysis`: Stores `technical_feasibility`, `solution_scope`, `target_technologies`, `estimated_effort_weeks`, `complexity_score`, and `key_stakeholders`.
  - `problem_duplicates`: Maps `problem_id` to `potential_duplicate_id` with `similarity_score` (0.00-1.00) and AI reason.
  - `problem_ai_categories`: Categorization tags suggested by the AI engine with confidence metrics.

---

### 🗳️ Stage 3: Community Voting & Prioritization
* **Purpose**: Democratize issue selection so students and universities build solutions that real communities actively want and validate.
* **Key Capabilities**:
  - Civic upvoting and urgency corroboration by local residents.
  - Filtering by municipal ward, category, and urgency level.
  - Trend scoring algorithm factoring votes over time:
    $$\text{PriorityScore} = \frac{\text{Upvotes} \times 1.5 + \text{CitizenComments} \times 2.0}{\text{AgeInDays}^{0.8}} \times \text{UrgencyMultiplier}$$
* **Frontend Components**:
  - `SocietalProblemsPage.jsx`: Marketplace view with search filters, category badges, urgency tags, and sort by votes/urgency.
  - `ProblemDetailPage.jsx`: Full breakdown of problem statement, community voices, map view, evidence gallery, and upvote button.
* **Backend Routes & Endpoints**:
  - `POST /api/problems/:id/interest`: Register citizen/student interest or upvote.
  - `GET /api/problems`: Public listing with query parameters (`category`, `urgency`, `search`, `sort`, `page`, `limit`).
* **Database Tables**:
  - `problem_interests`: Logs `problem_id`, `user_id`, `interest_type` (`upvote`, `volunteer`, `affected_resident`, `donor`), and timestamps.
  - `problem_reviews`: Civic/moderator evaluation records.

---

### 💼 Stage 4: Corporate / CSR / Sponsor Backing & University Adoption
* **Purpose**: Bridge grassroots civic problems with academic resources and corporate sponsorship (CSR capital, cloud credits, hardware devices, mentor stipends).
* **Key Capabilities**:
  - **University / College Department Adoption**: Faculty members or university departments adopt high-priority problems as semester capstones.
  - **Corporate & CSR Sponsorship**: Corporate sponsors pledge grants, bounties, cloud credits, or mentorship support.
  - **Project Access Policies**: Configures whether a project is open to any student, restricted to a university cohort, or invite-only.
* **Backend Routes & Endpoints**:
  - `POST /api/problems/:id/adopt`: Enables university/mentor to adopt a validated problem (`requireRole('mentor', 'university', 'admin')`).
  - `GET /api/problems/:id/adoptions`: Lists institutional backers and faculty leads.
  - `PUT /api/projects/:id/access-policy`: Sets `access_type` (`open`, `university_only`, `application_required`) and `allowed_domains`.
* **Database Tables**:
  - `problem_adoptions`: Links `problem_id`, `mentor_id`, `institution_name`, `adoption_notes`, `funding_commitment`, and `status`.
  - `project_access_policies`: Controls eligibility criteria, allowed colleges, and prerequisite skills.

---

### 👥 Stage 5: Student Team Matching & Forming
* **Purpose**: Assemble multi-disciplinary student teams (Frontend, Backend, DevOps, Data/AI, UI/UX, Domain/Civic Lead) based on skill readiness and passion.
* **Key Capabilities**:
  - **Skill-Based Application Engine**: Students apply for specific roles with their portfolio links, verified platform skills, and statement of interest.
  - **Application Review & Approval**: Mentor or student squad lead reviews applications, schedules screenings, and admits members.
  - **Role Matrix**: Granular team permissions (`lead`, `developer`, `qa_tester`, `civic_liaison`).
* **Frontend Components**:
  - `ProjectTeamPage.jsx`: Team formation board, open role slots, applicant evaluation modal, and active roster.
* **Backend Routes & Endpoints**:
  - `POST /api/projects/:id/apply`: Student submits application specifying target role and message (`requireRole('student')`).
  - `GET /api/projects/:id/applications`: Mentor lists incoming applicants with skill match score.
  - `PATCH /api/projects/:id/applications/:appId`: Accepts, rejects, or waitlists applicant. On acceptance, automatically inserts into `project_team_members`.
  - `GET /api/projects/:id/team`: Lists active squad members, roles, and online presence.
* **Database Tables**:
  - `project_student_applications`: `project_id`, `student_id`, `role_applied`, `statement`, `status` (`pending`, `accepted`, `rejected`, `withdrawn`).
  - `project_teams`: `project_id`, `team_name`, `max_members`, `formation_status`.
  - `project_team_members`: `team_id`, `user_id`, `role`, `joined_at`, `permissions`.

---

### 🎯 Stage 6: Milestone Generator & Task Planner
* **Purpose**: Deconstruct the civic challenge into an airtight, traceable software engineering specification (Architecture diagrams, DB Schemas, Milestones, and Atomic Tasks).
* **Key Capabilities**:
  - **AI Architecture Generator**: Synthesizes Mermaid component diagrams, ER diagrams, and system topology.
  - **Requirements Traceability Matrix (RTM)**: Every technical task directly links back to a specific citizen pain point.
  - **Automated Phased Milestones**:
    1. *Phase 1: Foundation & Data Contracts* (Schema, Auth, API skeletons)
    2. *Phase 2: Core Civic Workflows* (Reporting, Processing, CRUD engines)
    3. *Phase 3: Integration & Notifications* (SMS/WhatsApp civic alerts, Maps, Real-time feeds)
    4. *Phase 4: Field Testing & Hardening* (Offline capability, Low-bandwidth optimization)
* **Frontend Components**:
  - `ProjectArchitecturePage.jsx`: Interactive Mermaid diagrams, schema viewer, and architecture approval buttons.
  - `ProjectRequirementsPage.jsx`: Traceability matrix showing Citizen Need ↔ Technical Requirement ↔ Dev Tasks ↔ QA Status.
* **Backend Routes & Endpoints**:
  - `POST /api/projects/:id/architecture/generate`: AI generates structured Mermaid diagram, DB schema, and API contracts.
  - `POST /api/projects/:id/architecture/approve`: Mentor locks the architectural specification.
  - `GET /api/projects/:id/requirements`: Fetches full requirements tree with mapped tasks.
  - `POST /api/projects/:id/requirements`: Creates or synchronizes civic requirement specifications.
* **Database Tables**:
  - `project_architectures`: `mermaid_diagram`, `db_schema_sql`, `api_contracts_json`, `status` (`draft`, `approved`).
  - `requirements`: `problem_id`, `project_id`, `requirement_code` (e.g. `REQ-CIVIC-001`), `description`, `citizen_source_quote`.
  - `requirement_tasks`: Junction table joining `requirement_id` to technical `task_id`.
  - `milestones` & `tasks`: Phased execution breakdown.

---

### 🧑‍💻 Stage 7: Monaco IDE + Socratic Mentor Engine [Pipeline B]
* **Purpose**: Provide team members with an in-browser cloud IDE, live PTY terminal, and a customized Socratic Mentor engine that guides students to build the software without spoon-feeding answers.
* **Key Capabilities**:
  - **Pipeline B-Specific Socratic Engine**: Unlike Pipeline A (which focuses strictly on basic programming and generic concepts), Pipeline B's Socratic engine continuously reminds students of:
    - Civic constraints (e.g., "How does this API handle users in rural areas with intermittent 2G connectivity?").
    - Accessibility (WCAG 2.1, vernacular language support, high-contrast civic dashboards).
    - Security & PII protection (safeguarding citizen telephone numbers and private complaints).
  - **Integrated Monaco Workspace + Real-Time Execution**: File tree management, syntax checking, Git commits, and live preview.
  - **Progressive Hint Ladder**: Level 1 (Conceptual question) → Level 2 (Architectural pseudocode) → Level 3 (API structure check).
* **Frontend Components**:
  - `IdePage.jsx`: Multi-file code editor, tabbed workspaces, terminal console, and Socratic AI mentor panel.
* **Backend Services & Routes**:
  - `backend/src/services/terminalService.js`: Node-PTY shell sessions over WebSockets.
  - `backend/src/services/workspaceService.js`: File system abstraction in virtual/isolated directory trees.
  - `POST /api/tasks/:id/hint`: Generates stage-specific contextual hints.
  - `POST /api/projects/:id/chat`: Context-aware project chat with persistent project memory.
* **Database Tables**:
  - `workspace_files`: Virtual file paths, content hashes, and version history.
  - `conversation_turns` & `chat_history`: Conversation history with the Socratic AI.
  - `project_memory`: Project summaries, active architectural decisions, and current blockers.

---

### 🧪 Stage 8: Community Alpha Testing & Citizen Feedback
* **Purpose**: Validate software not just with technical unit tests, but with the actual citizens and civic officials who originated the problem.
* **Key Capabilities**:
  - **Dual-Axis QA Verification**:
    - *Axis 1: Technical Correctness* (Unit tests pass, no critical vulnerabilities, clean linting).
    - *Axis 2: Civic Alignment* (Does this actually solve the complaint logged in Stage 1?).
  - **Citizen Alpha Preview**: One-click preview links allowing reporting citizens to test mobile workflows, forms, and alerts.
  - **Direct Citizen Feedback Submissions**: Rating (1-5 stars), usability feedback, and bug reports routed directly back to the student squad's task board.
* **Frontend Components**:
  - `ProjectRequirementsPage.jsx` (QA Matrix tab): Dual-axis review dashboard.
  - `CitizenDashboardPage.jsx`: Alpha testing action cards for verified citizens.
* **Backend Routes & Endpoints**:
  - `POST /api/tasks/submit`: Code submission triggering automated QA critic.
  - `POST /api/projects/:id/execute/test`: Automated test suite execution in sandbox.
  - `POST /api/requirements/:id/qa`: Records dual-axis QA assessment.
* **Database Tables**:
  - `requirement_qa`: Logs `requirement_id`, `test_case_results`, `citizen_feedback_score`, `verified_by_citizen_id`, and `qa_status`.
  - `qa_reviews`: Automated AI critic output scoring code correctness, efficiency, and civic requirement satisfaction.

---

### 🚀 Stage 9: Real Deployment + Field Impact Metric
* **Purpose**: Graduate projects from local code into active civic infrastructure, tracking quantifiable real-world metrics and awarding students verified portfolio impact credits.
* **Key Capabilities**:
  - **Production Deployment Pipeline**: Automated deployment to cloud hosting (Docker, Firebase, Cloud Run, VPS) with live health telemetry.
  - **Impact Telemetry & Counter**: Live counters of real impact (e.g., "14,200 Liters of potable water distributed", "412 Potholes repaired", "1,850 Citizens served").
  - **Estimated vs. Measured Impact Delta**: Evaluates whether the deployed system achieved the initial Stage 2 AI projections.
  - **Immutable Portfolio Impact Certificate**: Cryptographically verifiable credential proving student contributions to civic engineering.
* **Frontend Components**:
  - `ProjectImpactPage.jsx`: Real-time impact gauges, citizen testimonial timeline, and performance metrics.
  - `CompletePage.jsx`: Project celebration, team badges, portfolio export, and GitHub release links.
* **Backend Routes & Endpoints**:
  - `GET /api/projects/:id/impact`: Retrieves current impact counters and field telemetry.
  - `POST /api/projects/:id/impact`: Submits verified field readings (by municipal officers, NGOs, or IoT webhooks).
* **Database Tables**:
  - `impact_metrics`: Stores `metric_name`, `target_value`, `current_value`, `unit_of_measure`, `verification_source`, `last_updated_at`.
  - `projects`: Transitioned to status `deployed` or `completed` with public impact showcase enabled.

---

## 3. Complete Relational Database Schema (Pipeline B)

```
┌───────────────────────────┐         1:N         ┌───────────────────────────┐
│     societal_problems     │ ─────────────────── │     problem_locations     │
│───────────────────────────│                     │───────────────────────────│
│ id (PK)                   │                     │ id (PK)                   │
│ title                     │                     │ problem_id (FK)           │
│ description               │                     │ latitude, longitude       │
│ category_id (FK)          │                     │ address, city, state      │
│ urgency_level             │                     └───────────────────────────┘
│ status                    │         1:N         ┌───────────────────────────┐
│ citizen_id (FK)           │ ─────────────────── │       problem_media       │
│ estimated_beneficiaries   │                     │───────────────────────────│
│ created_at                │                     │ id (PK)                   │
└─────────────┬─────────────┘                     │ problem_id (FK)           │
              │                                   │ file_path, mime_type      │
              │ 1:1                               └───────────────────────────┘
              ▼
┌───────────────────────────┐         1:N         ┌───────────────────────────┐
│    problem_ai_analysis    │                     │     problem_interests     │
│───────────────────────────│                     │───────────────────────────│
│ id (PK)                   │                     │ id (PK)                   │
│ problem_id (FK)           │                     │ problem_id (FK)           │
│ technical_feasibility     │                     │ user_id (FK)              │
│ complexity_score          │                     │ interest_type             │
│ solution_scope            │                     └───────────────────────────┘
│ estimated_effort_weeks    │
└─────────────┬─────────────┘
              │ 1:N (Adoption)
              ▼
┌───────────────────────────┐
│     problem_adoptions     │
│───────────────────────────│
│ id (PK)                   │
│ problem_id (FK)           │
│ mentor_id (FK)            │
│ institution_name          │
│ funding_commitment        │
└─────────────┬─────────────┘
              │ 1:1 (Spawns Project)
              ▼
┌───────────────────────────┐         1:N         ┌───────────────────────────┐
│         projects          │ ─────────────────── │   project_architectures   │
│───────────────────────────│                     │───────────────────────────│
│ id (PK)                   │                     │ id (PK), project_id (FK)  │
│ title, description        │                     │ mermaid_diagram, schema   │
│ problem_id (FK)           │                     └───────────────────────────┘
│ status, current_milestone │         1:1         ┌───────────────────────────┐
│ access_policy_id (FK)     │ ─────────────────── │       project_teams       │
└─────────────┬─────────────┘                     │───────────────────────────│
              │                                   │ id (PK), project_id (FK)  │
              │                                   │ team_name, max_members    │
              │                                   └─────────────┬─────────────┘
              │                                                 │ 1:N
              │                                                 ▼
              │                                   ┌───────────────────────────┐
              │                                   │   project_team_members    │
              │                                   │───────────────────────────│
              │                                   │ id (PK), team_id (FK)     │
              │                                   │ user_id (FK), role        │
              │                                   └───────────────────────────┘
              │ 1:N
              ├───────────────────────────────────┐
              ▼                                   ▼
┌───────────────────────────┐         1:N         ┌───────────────────────────┐
│       requirements        │ ─────────────────── │      impact_metrics       │
│───────────────────────────│                     │───────────────────────────│
│ id (PK), project_id (FK)  │                     │ id (PK), project_id (FK)  │
│ requirement_code          │                     │ metric_name, target_value │
│ description               │                     │ current_value, unit       │
│ civic_alignment_score     │                     │ verified_by               │
└─────────────┬─────────────┘                     └───────────────────────────┘
              │ 1:N
              ▼
┌───────────────────────────┐
│     requirement_tasks     │
│───────────────────────────│
│ requirement_id (FK)       │
│ task_id (FK)              │
└───────────────────────────┘
```

---

## 4. Complete REST & WebSocket API Specification

### 4.1 Citizen Problems & Intelligence API (`/api/problems`)

| Method | Endpoint | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/api/problems` | Optional | Paginated problem marketplace listing with filters (`category`, `urgency`, `search`). |
| `POST` | `/api/problems` | `citizen`, `admin` | Submit a new civic problem with location payload and media attachments. |
| `GET` | `/api/problems/my` | `citizen` | List all problems submitted by the authenticated citizen. |
| `GET` | `/api/problems/my/stats` | `citizen` | Aggregate statistics of citizen's reported and resolved issues. |
| `GET` | `/api/problems/categories` | Public | List all civic categories (Healthcare, Water, Mobility, etc.). |
| `GET` | `/api/problems/:id` | Public | Comprehensive problem dossier with location, media, and AI analysis. |
| `PATCH` | `/api/problems/:id` | Problem Owner / Admin | Modify problem details or update status. |
| `DELETE` | `/api/problems/:id` | Problem Owner / Admin | Withdraw or delete problem submission. |
| `POST` | `/api/problems/:id/analyze` | System / Auth | Execute AI Problem Synthesizer, deduplication, and feasibility scoring. |
| `POST` | `/api/problems/:id/review` | `mentor`, `admin` | Official civic or academic review of problem validity. |
| `POST` | `/api/problems/:id/publish` | `admin` | Transition problem from draft/review to public voting marketplace. |
| `POST` | `/api/problems/:id/interest` | Authenticated | Register community upvote, volunteer intent, or residency verification. |
| `POST` | `/api/problems/:id/adopt` | `mentor`, `university`, `admin` | Institutional adoption by faculty/university or sponsor. |
| `GET` | `/api/problems/:id/adoptions` | Authenticated | Fetch list of institutional adoptions and faculty mentors. |
| `POST` | `/api/problems/:id/create-project` | `mentor`, `admin` | Spin off a dedicated software project execution workspace from the problem. |

### 4.2 Project Extensions, Teams & Traceability API (`/api/projects`)

| Method | Endpoint | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/api/projects/:id/architecture` | Authenticated | Retrieve Mermaid architecture, DB schemas, and system design. |
| `POST` | `/api/projects/:id/architecture/generate` | `mentor`, `lead` | Trigger AI generation of architecture diagram and ER schema. |
| `POST` | `/api/projects/:id/architecture/approve` | `mentor` | Lock architecture for development. |
| `GET` | `/api/projects/:id/team` | Authenticated | Retrieve active student squad, assigned roles, and contributors. |
| `POST` | `/api/projects/:id/apply` | `student` | Submit application to join project team with target role. |
| `GET` | `/api/projects/:id/applications` | `mentor`, `lead` | Review pending student applications with skill metrics. |
| `PATCH` | `/api/projects/:id/applications/:appId` | `mentor`, `lead` | Accept or reject student application. |
| `GET` | `/api/projects/:id/my-application` | `student` | Check personal application status. |
| `GET` | `/api/projects/:id/requirements` | Authenticated | Fetch Requirements Traceability Matrix (RTM). |
| `POST` | `/api/projects/:id/requirements` | `mentor`, `lead` | Add or update traceable civic requirement. |
| `GET` | `/api/projects/:id/impact` | Public | Real-time field impact counters, testimonials, and verified readings. |
| `POST` | `/api/projects/:id/impact` | `mentor`, `admin`, `citizen` | Record new field telemetry or impact measurement. |
| `PUT` | `/api/projects/:id/access-policy` | `mentor`, `admin` | Configure eligibility restrictions and college domains. |

### 4.3 Real-Time WebSocket Protocols (`ws://host:port`)

Pipeline B leverages bidirectional WebSockets for collaborative execution:

1. **Terminal & PTY Stream** (`/terminal`):
   - Client sends keystrokes `{ type: 'input', data: 'npm test\r' }`.
   - Server streams live ANSI escape terminal output from containerized Node-PTY.
2. **Collaborative File Synchronization** (`/collab`):
   - Emits multi-cursor positions, active edits, and file lock releases across squad members.
3. **Civic Activity Live Stream** (`/civic-feed`):
   - Broadcasts real-time community upvotes, mentor adoptions, and milestone completions.

---

## 5. Frontend Screen & User Journey Architecture

```
[ Citizen Persona ]
       │
       ▼
ProblemSubmitPage ────────► CitizenDashboardPage
(Capture Problem, Geo, Media)   (Track Progress, Alpha Test Preview)

[ Community / Student / Mentor Personas ]
       │
       ▼
SocietalProblemsPage (Discovery Marketplace, Upvoting, Filters)
       │
       ▼
ProblemDetailPage (Dossier, AI Analysis, Institutional Adoption)
       │
       ▼
ProjectTeamPage (Squad Formation, Skill-Matched Applications)
       │
       ▼
ProjectArchitecturePage (Mermaid System Topology, DB Schemas)
       │
       ▼
ProjectRequirementsPage (Requirements Traceability Matrix)
       │
       ▼
IdePage [Pipeline B Mode] (Monaco Editor, PTY Terminal, Civic Socratic AI)
       │
       ▼
ProjectImpactPage ────────► CompletePage
(Field Metrics, Live Impact Telemetry)   (Verified Impact Portfolio Badge)
```

---

## 6. Socratic Mentor Engine: Pipeline A vs Pipeline B Comparison

| Feature | Pipeline A (Direct Execution) | Pipeline B (Civic Innovation) |
|---|---|---|
| **Primary Context** | The student's code and generic milestone description. | The citizen's pain point, the RTM, and civic field constraints. |
| **Architectural Scope** | Typical micro-apps (e.g., Todo App, Weather Dashboard). | Production distributed architectures (offline-first, SMS fallback, GIS). |
| **Hint Strategy** | Syntax nudges, standard design patterns, algorithmic optimization. | Civic edge cases, data privacy for vulnerable citizens, resilient networking. |
| **Verification Gate** | Single Axis: Does the code pass unit tests? | **Dual-Axis**: Does the code compile AND solve the original citizen complaint? |
| **End Result** | Individual portfolio project. | **Deployed community solution with measurable civic ROI.** |

---

## 7. Security, Privacy & Data Governance

1. **Citizen PII Anonymization**: Phone numbers, exact house addresses, and personal identifiers submitted in Stage 1 are encrypted at rest (AES-256) and masked on public marketplaces.
2. **Role-Based Access Control (RBAC)**: Strict route guards using `requireRole()` ensure citizens cannot alter technical architectures, and unapproved students cannot push code to team workspaces.
3. **Audit Trail & Traceability**: Every requirement modification and impact metric submission records immutable author IDs and timestamps.
4. **Code Execution Sandboxing**: Student commands run inside isolated terminal containers with CPU/memory quotas and restricted network access.

---

## 8. Summary Table: Pipeline B Lifecycle State Machine

```
  [SUBMITTED] ────────► [ANALYZED] ────────► [APPROVED] ────────► [ADOPTED]
       │                    │                    │                   │
  Citizen posts         AI cleans &         Moderator/votes      Mentor/sponsor
  civic problem         deduplicates        verify need          takes ownership
                                                                     │
                                                                     ▼
  [DEPLOYED]  ◄────── [ALPHA_TEST] ◄────── [IN_DEV]   ◄────── [TEAM_FORMED]
       │                    │                    │                   │
  Live civic           Citizen tests        Squad codes in       Students apply &
  metrics              working preview      Monaco IDE           squad is selected
```

---
*SOCRATES Pipeline B Architecture Document — Official Implementation Reference.*
