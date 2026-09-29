# 🚀 SOCRATES (PROJECT-SKILL) — Full System Architecture

> **AI-Powered Project Building & Civic Innovation Mentor System**  
> *A dual-pipeline execution platform bridging students, mentors, and citizens through real-world impact.*

---

## 1. 🧩 Problem Statement

| # | Pain Point | Who Suffers |
|---|---|---|
| 1 | Students have ideas but lack structured roadmaps or architectural decomposition | Students & Developers |
| 2 | "Tutorial Hell" — consuming learning content without ever shipping real software | Students |
| 3 | AI tools that spoon-feed code instead of cultivating genuine engineering ability | Students & Educators |
| 4 | Communities face urgent civic challenges (water, traffic, waste, healthcare) with no connection to technical talent | Citizens & Communities |
| 5 | Projects are started but never finished — no accountability or structured execution loop | All roles |

> **Root Cause**: A broken loop where theoretical learning, empty portfolios, and unresolved real-world problems coexist with no structural bridge connecting them.

---

## 2. 💡 Solution: Dual-Pipeline Execution Architecture

SOCRATES implements **two execution pipelines** that converge at a single civic innovation hub:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PIPELINE A — Student Direct Execution
─────────────────────────────────────
  💭 Raw Idea
     │
     ▼
  🎯 AI Goal Clarifier (Structured scope)
     │
     ▼
  🧱 Milestone Generator (3-5 phased milestones)
     │
     ▼
  📅 Task Planner (Atomic daily tasks)
     │
     ▼
  🧑‍💻 Monaco IDE + PTY Terminal (Live execution)
     │
     ▼
  🎓 Socratic Mentor Engine (Progressive hints)
     │
     ▼
  🔍 Dual-Axis QA Critic (Code + Requirement alignment)
     │
     ▼
  ✅ Completion + Portfolio Impact

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PIPELINE B — Societal Problem → Community Solution
───────────────────────────────────────────────────
  🏛️ Citizen Problem Submission (+ Location + Evidence)
     │
     ▼
  🧠 AI Problem Intelligence Engine (Classify, Analyze, Deduplicate)
     │
     ▼
  🌐 Discovery Marketplace (Community votes & filters)
     │
     ▼
  🎓 University / Mentor Adoption
     │
     ▼
  🏗️ AI Architecture Generator (Mermaid + DB Schema + v1/v2)
     │
     ▼
  👥 Student Team Formation (Role-based applications)
     │
     ▼
  🔬 Traceable Execution (Citizen req → Dev task → QA check)
     │
     ▼
  ⚖️ Dual-Axis QA (Technical Correctness + Civic Alignment)
     │
     ▼
  📈 Real-World Impact Dashboard (Estimated vs. Measured)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 3. 🏗️ High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (Browser)                              │
│     React 18 + Vite SPA | Monaco Editor | xterm.js | Leaflet Maps          │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │  HTTP REST + WebSocket (ws://)
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                      API GATEWAY / EXPRESS SERVER                           │
│   ┌────────────────────────────────────────────────────────────┐            │
│   │  Middleware Stack                                          │            │
│   │  ├── CORS (Allowlist: localhost:5173, localhost:3000)      │            │
│   │  ├── JWT Authentication (authMiddleware)                   │            │
│   │  ├── Optional Auth (optionalAuth — public endpoints)       │            │
│   │  └── RBAC Role Guards (student / mentor / citizen / admin) │            │
│   └────────────────────────────────────────────────────────────┘            │
│                                                                             │
│   ┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐      │
│   │ /auth    │ /problems│ /projects│ /media   │ /fs      │ /preview │      │
│   └──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘      │
└──────────┬─────────────────────┬───────────────────────┬─────────────────────┘
           │                     │                       │
  ┌────────▼─────────┐  ┌────────▼──────────┐  ┌────────▼─────────────┐
  │   AI ENGINE LAYER │  │  SERVICES LAYER   │  │  WEBSOCKET SERVERS   │
  │                   │  │                   │  │                      │
  │ goalClarifier     │  │ terminalService   │  │ /api/v1/terminal     │
  │ milestoneGen      │  │ workspaceService  │  │ (node-pty PTY shell) │
  │ taskPlanner       │  │ mediaService      │  │                      │
  │ mentorEngine      │  │ progressTracker   │  │ /api/v1/session      │
  │ guidedExecution   │  │ memoryService     │  │ (collaboration sync) │
  │ qaCritic          │  │ aiService         │  │                      │
  │ problemIntel      │  │ socketService     │  └──────────────────────┘
  │ archGenerator     │  │ executionService  │
  │ automationAdvisor │  │ courseService     │
  │ learningCtrl      │  └───────────────────┘
  └───────────────────┘
           │
  ┌────────▼─────────────────────────────────────────┐
  │              DATABASE LAYER (SQLite / WAL Mode)   │
  │                                                   │
  │  CORE TABLES              SOCIETAL TABLES         │
  │  ├── users                ├── societal_problems   │
  │  ├── projects             ├── problem_locations   │
  │  ├── milestones           ├── problem_media       │
  │  ├── tasks                ├── problem_ai_analysis │
  │  ├── qa_reviews           ├── problem_reviews     │
  │  ├── conversation_turns   ├── problem_adoptions   │
  │  ├── workspace_files      ├── student_applications│
  │  ├── automation_sugg.     ├── project_architecture│
  │  ├── otp_requests         ├── project_requirements│
  │  └── courses              └── project_impact_metr.│
  └───────────────────────────────────────────────────┘
           │
  ┌────────▼──────────────────────┐
  │       EXTERNAL SERVICES       │
  │  ├── Google Gemini API (LLM)  │
  │  ├── Groq API (LLM fallback)  │
  │  ├── Anthropic Claude API     │
  │  └── OpenStreetMap (Nominatim)│
  └───────────────────────────────┘
```

---

## 4. 🧠 Methodology

### 4.1 Engineering Philosophy
The platform is built on three core philosophical pillars:

| Pillar | Description |
|---|---|
| **Execution-First** | No passive learning — every interaction produces a verifiable artifact |
| **Socratic Guidance** | AI never gives direct answers; uses progressive hints + questioning |
| **Civic-Techno Bridge** | Technology talent is explicitly channeled toward community problem-solving |

### 4.2 Multi-Agent AI Architecture

Each AI "engine" is a distinct agent with a specific persona, tool access, and output contract:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AI PERSONA BOARD                                │
│                                                                     │
│  🧑‍💼 Project Manager        → Scope, milestones, role allocation    │
│  🏗️  System Architect        → Mermaid diagrams, API contracts       │
│  🧑‍🏫 Socratic Mentor         → Context-aware hints, no spoilers      │
│  🔍 Dual-Axis QA Reviewer   → Code + Civic requirement alignment    │
│  🧠 Problem Intel Engine    → Root cause, urgency, deduplication    │
│  🤖 Automation Advisor      → CI/CD, workflow, optimizations        │
└─────────────────────────────────────────────────────────────────────┘
```

#### AI Engine Details

| Engine File | Responsibility | Output Format |
|---|---|---|
| `goalClarifier.js` | Transforms vague ideas into structured technical specs | JSON: `{ title, techStack, scope, clarifyingQuestions[] }` |
| `milestoneGenerator.js` | Decomposes goals into 3–5 phased milestones | JSON: `{ milestones[{ title, description, durationDays, measurableOutput }] }` |
| `taskPlanner.js` | Breaks milestones into atomic daily tasks | JSON: `{ tasks[{ title, day, estimatedHours, commands[], concepts[] }] }` |
| `mentorEngine.js` | Socratic conversational mentor | Markdown: Guided Socratic dialogue |
| `guidedExecution.js` | 3-tier progressive hint ladder | JSON: `{ hint_level, hint_text, next_available_at }` |
| `qaCritic.js` | Dual-axis code + problem-alignment review | JSON: `{ verdict, score, passedChecks[], failedChecks[], corrections[] }` |
| `problemIntelligence.js` | Citizen problem classification + requirements extraction | JSON: `{ category, urgency, severity, stakeholders, requirements[], duplicates[] }` |
| `architectureGenerator.js` | System architecture + Mermaid + version control | JSON: `{ mermaid_diagram, components[], api_blueprint, version }` |
| `automationAdvisor.js` | CI/CD and workflow automation suggestions | JSON: `{ tool, description, scriptSnippet, benefit }` |
| `learningController.js` | Adaptive learning path management | JSON: `{ nextTask, skillGaps[], recommendations[] }` |

### 4.3 Strict Learning Mode (Anti-Spoon-Feeding)

```
Student Asks For Help
        │
        ▼
   Hint Level 1 ──► Conceptual explanation (What to think about)
        │ (if still stuck)
        ▼
   Hint Level 2 ──► Directional guidance (How to approach)
        │ (if still stuck)
        ▼
   Hint Level 3 ──► Minimal code snippet (partial reference)
        │
        ▼
   QA Critic validates submission
   (Cannot bypass — no direct copy-paste path)
```

---

## 5. 🛠️ Technology Stack

### 5.1 Frontend

| Technology | Purpose | Why |
|---|---|---|
| **React 18** | UI framework | Concurrent rendering, SPA routing |
| **Vite** | Build tool | Fast HMR, ESM native |
| **Monaco Editor** | In-browser code editor | VS Code core — syntax highlighting, IntelliSense |
| **xterm.js** | Terminal emulator | PTY session rendering in browser |
| **Leaflet + React-Leaflet** | Interactive maps | OSM-based, free, privacy-respecting |
| **Zustand** | Global state management | Minimal boilerplate, reactive |
| **Vanilla CSS** | Styling | Full glassmorphism system via CSS variables |
| **React Router DOM v6** | Client-side routing | Declarative, code-split friendly |
| **@react-oauth/google** | Google OAuth | Social login integration |

### 5.2 Backend

| Technology | Purpose | Why |
|---|---|---|
| **Node.js v18+** | Runtime | Non-blocking I/O, WebSocket native |
| **Express.js** | HTTP Framework | Minimal, middleware-composable |
| **ws (WebSocket)** | Real-time communication | Binary + text frame support |
| **node-pty** | Pseudo-terminal | Spawns real shell sessions for interactive terminal |
| **JWT** | Authentication | Stateless, scalable auth tokens |
| **node:sqlite** | Database | Built-in from Node 22 — zero dependencies |
| **Multer** | File upload handling | Streaming multipart/form-data |
| **dotenv** | Config management | 12-factor app compliance |

### 5.3 AI / LLM Layer

| Provider | When Used |
|---|---|
| **Google Gemini** | Primary — structured JSON extraction, architecture generation |
| **Groq** | Speed-critical paths — hint generation, quick mentor replies |
| **Anthropic Claude** | Complex reasoning — QA critic, problem intelligence |

### 5.4 External APIs

| API | Purpose |
|---|---|
| **OpenStreetMap Nominatim** | Reverse geocoding for problem location (privacy-preserving, free) |
| **Google OAuth 2.0** | Social login compatibility |

---

## 6. 📂 Directory Structure

```
P-S/
├── backend/
│   ├── src/
│   │   ├── server.js                   ← Express app + WebSocket routing
│   │   ├── config.js                   ← Environment + feature flags
│   │   │
│   │   ├── routes/
│   │   │   ├── api.js                  ← Core student execution (goals/tasks/milestones)
│   │   │   ├── auth.js                 ← Registration, login, profile, RBAC
│   │   │   ├── problems.js             ← Societal problems CRUD + voting + adoption
│   │   │   ├── projectExtensions.js    ← Architecture, team, requirements, impact
│   │   │   ├── media.js                ← Media upload + serve (magic-byte validated)
│   │   │   ├── fs.js                   ← Sandboxed filesystem operations
│   │   │   └── preview.js              ← Project preview rendering
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.js                 ← JWT verification
│   │   │   ├── optionalAuth.js         ← Graceful auth fallback (public + auth)
│   │   │   └── role_middleware.js      ← RBAC guards
│   │   │
│   │   ├── db/
│   │   │   ├── database.js             ← SQLite schema + auto-migration
│   │   │   ├── claude.js               ← Claude DB adapter
│   │   │   ├── pg.js                   ← PostgreSQL adapter (prod-ready)
│   │   │   └── seedCourses.js          ← Course data seeder
│   │   │
│   │   ├── engines/                    ← Multi-Agent AI Engines
│   │   │   ├── goalClarifier.js
│   │   │   ├── milestoneGenerator.js
│   │   │   ├── taskPlanner.js
│   │   │   ├── mentorEngine.js
│   │   │   ├── guidedExecution.js
│   │   │   ├── qaCritic.js
│   │   │   ├── problemIntelligence.js
│   │   │   ├── architectureGenerator.js
│   │   │   ├── automationAdvisor.js
│   │   │   ├── learningController.js
│   │   │   ├── behaviorEngine.js
│   │   │   ├── scaffoldEngine.js
│   │   │   ├── skillEngine.js
│   │   │   └── taskEngine.js
│   │   │
│   │   └── services/                   ← Infrastructure Services
│   │       ├── terminalService.js      ← PTY shell management
│   │       ├── workspaceService.js     ← Sandboxed FS isolation
│   │       ├── mediaService.js         ← Media storage + validation
│   │       ├── progressTracker.js      ← Checkpoint management
│   │       ├── memoryService.js        ← Conversation memory
│   │       ├── socketService.js        ← WebSocket collaboration
│   │       ├── executionService.js     ← Task execution management
│   │       ├── aiService.js            ← LLM provider switch
│   │       ├── courseService.js        ← Course management
│   │       ├── groqClient.js           ← Groq API client
│   │       ├── ollamaClient.js         ← Local LLM fallback
│   │       ├── redis.js                ← Optional caching layer
│   │       ├── queue.js                ← Task queue management
│   │       └── mcpService.js           ← MCP protocol integration
│   │
│   └── scripts/
│       └── test_societal_problems.js   ← E2E integration test suite
│
└── frontend/
    └── src/
        ├── App.jsx                     ← Root router + role-aware guards
        ├── main.jsx                    ← Bootstrap
        │
        ├── pages/
        │   ├── LoginPage.jsx           ← Unified login with role badges
        │   ├── SignupPage.jsx          ← Registration with role selector
        │   ├── OnboardingPage.jsx      ← First-run experience
        │   ├── SetupPage.jsx           ← Environment setup
        │   ├── GoalPage.jsx            ← Idea submission
        │   ├── ClarifyPage.jsx         ← AI clarification interview
        │   ├── PlanConfirmationPage.jsx← Milestone review & confirm
        │   ├── DashboardPage.jsx       ← Student task dashboard
        │   ├── IdePage.jsx             ← Monaco IDE + Terminal
        │   ├── MentorPage.jsx          ← Mentor management UI
        │   ├── ProjectsPage.jsx        ← Projects list
        │   ├── ProjectDetailPage.jsx   ← Project details
        │   ├── MarketplacePage.jsx     ← Skills/courses marketplace
        │   ├── CourseBuilderPage.jsx   ← Admin course builder
        │   ├── AdminPage.jsx           ← Admin control panel
        │   ├── CompletePage.jsx        ← Completion screen
        │   │
        │   │── [SOCIETAL FEATURES]
        │   ├── SocietalProblemsPage.jsx     ← Problems marketplace
        │   ├── ProblemSubmitPage.jsx        ← Citizen submission wizard
        │   ├── ProblemDetailPage.jsx        ← Problem detail + adoption
        │   ├── CitizenDashboardPage.jsx     ← Citizen tracking hub
        │   ├── ProjectArchitecturePage.jsx  ← Mermaid arch viewer
        │   ├── ProjectTeamPage.jsx          ← Team roster + applications
        │   ├── ProjectRequirementsPage.jsx  ← Traceability matrix
        │   └── ProjectImpactPage.jsx        ← Impact metrics dashboard
        │
        ├── components/
        │   ├── UI.jsx                  ← Glassmorphic design system
        │   ├── Terminal.jsx            ← xterm.js wrapper
        │   ├── MarkdownRenderer.jsx    ← MD rendering
        │   ├── ide/                    ← IDE sub-components
        │   ├── mentor/                 ← Mentor UI components
        │   └── problems/
        │       └── LocationPicker.jsx  ← Leaflet map + reverse geocoding
        │
        ├── api/
        │   └── client.js              ← Axios interceptor + token management
        │
        ├── store/
        │   └── index.js               ← Zustand global state
        │
        └── index.css                  ← CSS variable design tokens
```

---

## 7. 🗄️ Database Architecture

### 7.1 Entity Relationship Overview

```
users ─────────┬──────────────────────────────────────────────────────┐
               │ (1:N)                                                │
               ▼                                                      │
          projects ──────────────────────────────────────────────────┤
               │ (1:N)                                                │
               ▼                                                      │
          milestones ─────────────────────────────────────────────── │
               │ (1:N)                                                │
               ▼                                                      │
            tasks ──► qa_reviews                                      │
                  ──► conversation_turns                              │
                  ──► automation_suggestions                          │
                                                                      │
societal_problems ──────────────────────────────────────────────────┘
       │
       ├──► problem_locations
       ├──► problem_media
       ├──► problem_ai_analysis
       ├──► problem_reviews (comments + upvotes)
       ├──► problem_adoptions (mentor adoption)
       ├──► student_applications
       ├──► project_architecture (Mermaid versions)
       ├──► project_requirements (traceability matrix)
       └──► project_impact_metrics (estimated vs measured)
```

### 7.2 Core Tables

| Table | Key Columns | Purpose |
|---|---|---|
| `users` | `id, email, name, role, skill_level, tech_stack` | All user accounts (student/mentor/citizen/admin) |
| `projects` | `id, user_id, raw_goal, status` | Student execution projects |
| `milestones` | `id, project_id, ord, title, status` | Phased project milestones |
| `tasks` | `id, milestone_id, day, title, status, attempts` | Atomic daily tasks |
| `qa_reviews` | `id, task_id, verdict, score, passed_checks` | AI QA review results |
| `conversation_turns` | `id, project_id, task_id, role, content` | Chat memory per project/task |

### 7.3 Societal Problem Tables

| Table | Key Columns | Purpose |
|---|---|---|
| `societal_problems` | `id, title, description, category, urgency, status` | Citizen problem submissions |
| `problem_locations` | `problem_id, lat, lng, district, privacy_level` | Privacy-masked geolocation |
| `problem_media` | `problem_id, filename, mimetype, file_size` | Photo/video evidence |
| `problem_ai_analysis` | `problem_id, category, urgency, requirements, skills` | AI intelligence output |
| `problem_adoptions` | `problem_id, mentor_id, project_id, adopted_at` | Mentor adoption record |
| `student_applications` | `problem_id, student_id, role, status, motivation` | Team role applications |
| `project_architecture` | `project_id, version, mermaid_diagram, approved_at` | Versioned arch diagrams |
| `project_requirements` | `project_id, citizen_req, dev_task, qa_criteria` | Traceability matrix |
| `project_impact_metrics` | `project_id, metric_name, estimated, measured, unit` | Impact tracking |

---

## 8. 🔐 Security Architecture

### 8.1 Multi-Layer Security Stack

```
┌─────────────────────────────────────────────────────────┐
│                   SECURITY LAYERS                       │
│                                                         │
│  Layer 1: Media Magic-Byte Validation                   │
│  ├── Reads first 4-12 bytes of uploaded binary          │
│  ├── Validates: PNG (89 50 4E 47), JPEG (FF D8 FF)      │
│  ├── Validates: WebP (52 49 46 46), MP4 (00 00 00 xx)   │
│  └── Rejects: Spoofed files with wrong extension        │
│                                                         │
│  Layer 2: Command Denylist (Terminal Security)          │
│  ├── Blocks: rm -rf, mkfs, dd, fork bombs (:(){})       │
│  ├── Blocks: Reverse shells (nc -e, bash -i)            │
│  └── Blocks: Privilege escalation (sudo, su)            │
│                                                         │
│  Layer 3: Path Traversal Prevention                     │
│  ├── path.relative() containment verification           │
│  ├── Workspace boundary enforcement                     │
│  └── Rejects: ../../ directory escapes                  │
│                                                         │
│  Layer 4: JWT Authentication                            │
│  ├── All protected routes verify Bearer token           │
│  ├── Optional auth for public-facing endpoints          │
│  └── Token expiry + refresh flow                        │
│                                                         │
│  Layer 5: Role-Based Access Control (RBAC)              │
│  ├── student: Goal/task execution, team applications    │
│  ├── mentor: Problem adoption, architecture approval    │
│  ├── citizen: Problem submission, tracking dashboard    │
│  └── admin: All access + admin panel                    │
│                                                         │
│  Layer 6: Location Privacy Masking                      │
│  ├── Exact coords → District/locality approximation     │
│  └── User-controlled privacy level selection            │
└─────────────────────────────────────────────────────────┘
```

---

## 9. 🔄 WebSocket Architecture

```
Browser Client
     │
     ├──► WS: ws://localhost:5000/api/v1/terminal
     │         │
     │         └── terminalWss (WebSocketServer)
     │               │
     │               └── terminalService.js
     │                     └── node-pty (spawns real shell)
     │                           └── PTY → xterm.js (rendered in browser)
     │
     └──► WS: ws://localhost:5000/api/v1/session
               │
               └── projectWss (WebSocketServer)
                     └── socketService.js
                           ├── handleConnection() → room management
                           └── initHeartbeat() → keep-alive pings
                                 └── Live collaboration + presence sync
```

---

## 10. 🎯 User Roles & Feature Matrix

| Feature | Student | Mentor | Citizen | Admin |
|---|:---:|:---:|:---:|:---:|
| Submit project idea + AI goal clarification | ✅ | ✅ | — | ✅ |
| Milestone & daily task generation | ✅ | ✅ | — | ✅ |
| Monaco IDE + sandboxed terminal | ✅ | ✅ | — | ✅ |
| Socratic AI mentor + progressive hints | ✅ | ✅ | — | ✅ |
| Submit societal problem + evidence + map | — | — | ✅ | ✅ |
| Citizen problem tracking dashboard | — | — | ✅ | ✅ |
| Problem discovery marketplace | ✅ | ✅ | ✅ | ✅ |
| Community upvote + comment | ✅ | ✅ | ✅ | ✅ |
| Apply to solution team | ✅ | — | — | ✅ |
| Adopt problem → create engineering project | — | ✅ | — | ✅ |
| AI architecture generator + versioning | ✅ | ✅ | — | ✅ |
| Student team roster + role assignment | ✅ | ✅ | — | ✅ |
| Requirements traceability matrix | ✅ | ✅ | — | ✅ |
| Real-world impact tracking | ✅ | ✅ | ✅ | ✅ |
| Admin panel + course builder | — | — | — | ✅ |

---

## 11. 📡 Complete API Reference

### Auth Endpoints
| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/auth/register` | Public |
| POST | `/api/v1/auth/login` | Public |
| GET | `/api/v1/auth/me` | Authenticated |
| GET | `/api/v1/citizen/dashboard` | Citizen / Admin |

### Societal Problems Endpoints
| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/problems` | Public / Optional Auth |
| GET | `/api/v1/problems/categories` | Public |
| GET | `/api/v1/problems/:id` | Public / Optional Auth |
| POST | `/api/v1/problems` | Citizen / Admin |
| POST | `/api/v1/problems/:id/vote` | Authenticated |
| POST | `/api/v1/problems/:id/comments` | Authenticated |
| POST | `/api/v1/problems/:id/adopt` | Mentor / Admin |
| POST | `/api/v1/problems/:id/apply` | Student |
| POST | `/api/v1/problems/:id/create-project` | Mentor / Admin |

### Project Extensions Endpoints
| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/projects/:id/architecture` | Project Members |
| POST | `/api/v1/projects/:id/architecture` | Mentor / Lead |
| POST | `/api/v1/projects/:id/architecture/approve` | Mentor / Admin |
| GET | `/api/v1/projects/:id/team` | Project Members |
| POST | `/api/v1/projects/:id/team/applications/:appId` | Mentor / Lead |
| GET | `/api/v1/projects/:id/requirements` | Project Members |
| GET | `/api/v1/projects/:id/impact` | Public / Members |
| POST | `/api/v1/projects/:id/impact` | Mentor / Citizen |

### Core Execution Endpoints
| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/goals/submit` | Authenticated |
| POST | `/api/v1/goals/clarify` | Authenticated |
| GET | `/api/v1/projects/:id` | Authenticated |
| GET | `/api/v1/projects/:id/milestones` | Authenticated |
| GET | `/api/v1/milestones/:id/tasks` | Authenticated |
| POST | `/api/v1/tasks/:id/start` | Authenticated |
| POST | `/api/v1/tasks/:id/hint` | Authenticated |
| POST | `/api/v1/tasks/submit` | Authenticated |

### Media Endpoints
| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/media/upload` | Authenticated |
| GET | `/api/v1/media/:filename` | Public |

---

## 12. ⚙️ Deployment & Infrastructure

### 12.1 Development Setup
```
Port 5000  → Backend Express server + WebSocket handlers
Port 5173  → Frontend Vite dev server (HMR enabled)
```

### 12.2 Database
- **Development**: SQLite (`node:sqlite` — zero npm dependency, built into Node 22+)
- **Production-Ready**: PostgreSQL adapter (`pg.js`) available with identical schema
- **Persistence**: WAL (Write-Ahead Logging) mode enabled for concurrent reads
- **Migrations**: Additive `CREATE TABLE IF NOT EXISTS` — zero-downtime schema sync

### 12.3 Feature Flags
| Flag | Default | Purpose |
|---|---|---|
| `ENABLE_SOCIETAL_PROBLEMS` | `true` | Kill-switch for the civic pipeline feature |

### 12.4 Docker Support
```
backend/
├── Dockerfile
└── docker-compose.yml
```

---

## 13. 🔑 Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **SQLite with `node:sqlite`** | Zero npm dependencies, built into Node 22+; PostgreSQL adapter available for production scaling |
| **WebSocket isolation** (terminal vs. session) | Separate WSS instances prevent terminal I/O from leaking into collaboration sessions |
| **Feature-toggle kill switch** | `ENABLE_SOCIETAL_PROBLEMS=false` disables entire civic pipeline without code changes |
| **Optional Auth Middleware** | Problem marketplace is publicly browsable; logged-in users get enriched data |
| **Magic-byte validation over extension check** | Extension can be spoofed; binary header cannot — true security for evidence media |
| **Zustand over Redux** | Minimal boilerplate, atomic subscriptions, and simpler async patterns |
| **Multi-provider AI** | Gemini for structured JSON, Groq for speed, Claude for reasoning — best tool per task |
| **Privacy-preserving geocoding** | District-level masking protects citizen identity; configurable precision |
| **Additive DDL migrations** | `IF NOT EXISTS` guards allow schema evolution without migration files or downtime |

---

## 14. 📊 System Quality Attributes

| Attribute | Implementation |
|---|---|
| **Security** | 6-layer security stack (RBAC, JWT, magic-byte, command denylist, path sanitizer, privacy masking) |
| **Scalability** | PostgreSQL-ready DB adapter; stateless JWT; horizontal scaling via WSS load balancing |
| **Reliability** | WAL mode SQLite; WebSocket heartbeat; graceful 404/500 error handlers |
| **Maintainability** | Engine-per-file AI agents; feature toggle for new features; clean route separation |
| **Testability** | Dedicated E2E integration test suite (`scripts/test_societal_problems.js`) with 10 suites |
| **Performance** | Vite (fast HMR); WAL mode DB; Monaco lazy-loads; terminal streams via PTY pipe |

---

## 15. 📈 Impact Vision

> *"We don't want developers to spend months reading tutorials only to build trivial toy apps. We want them to ship real, production-ready software that solves genuine societal challenges — combining deep disciplined learning with real-world civic impact."*

**Measurable Outcomes:**
- Students complete projects rather than abandoning them
- Citizens see their reported problems converted into real technical solutions
- Universities build verifiable portfolios of civic impact  
- Communities get access to software engineering talent they previously couldn't reach

---

*Document auto-generated from live codebase analysis — reflects actual implementation in `c:\Project-Skill\P-S`*
