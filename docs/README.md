# 🚀 PROJECT-SKILL (SOCRATES)

🧠 **AI-Powered Project Building & Civic Innovation Mentor System**  
*(Not Just Another ChatGPT — A Real-World Project Builder & Problem Solver)*

> **"Ideas are cheap. Execution is everything."**  
> This platform forces execution — step by step — from raw concept (or community challenge) to production-ready software with measured real-world impact.

---

## 🧩 Problem Statement

Most students, developers, and civic problem-solvers face major bottlenecks:
1. **Have ideas but lack structured roadmaps** or architectural decomposition
2. **Stuck in tutorial hell** without building production-grade solutions
3. **Use AI tools that spit out direct answers** rather than cultivating true engineering ability
4. **Citizens & communities face urgent real-world problems** (water, traffic, waste, healthcare, civic infrastructure) with no bridge connecting them to university tech talent
5. **Start projects… but never finish them**

👉 **Result**: Theoretical learning, empty portfolios, and unresolved real-world civic challenges.

---

## 💡 Our Solution: Dual-Pipeline Execution

**PROJECT-SKILL (SOCRATES)** is an execution-driven AI mentor and civic innovation hub that doesn't let you quit.

```
Pipeline A (Student Direct):
  💭 Idea ──► 🎯 Goal ──► 🧱 Milestones ──► 📅 Daily Tasks ──► 🧑‍💻 Guided Execution ──► ✅ Completion

Pipeline B (Societal Problem → Collaborative Solution):
  🏛️ Citizen Problem ──► 🧠 AI Problem Intelligence ──► 🌐 Marketplace ──► 🎓 Mentor Adoption ──►
  🏗️ AI System Architecture ──► 👥 Student Team Formation ──► 🔬 Traceable Execution ──►
  ⚖️ Dual-Axis QA ──► 📈 Real-World Impact
```

Unlike generic chatbots:
- ❌ **No full code dumps or spoon-feeding**
- ✅ **Progressive hint ladder & Socratic engineering guidance**
- ✅ **Forces authentic building and step-by-step verification**
- ✅ **Direct connection to real community needs & civic impact**

---

## ⚡ Key Innovations

### 🔥 1. Execution-First Multi-Agent AI System
The AI acts as an integrated engineering advisory board:
- 🧑‍💼 **Project Manager**: Scope boundary definition, milestone breakdown, and team role allocation
- 🏗️ **System Architect**: Interactive Mermaid diagrams, subsystem contracts, and immutable architecture versioning (v1, v2)
- 🧑‍🏫 **Socratic Mentor**: Guided problem-solving with context-aware hints informed by civic constraints
- 🔍 **Dual-Axis QA Reviewer**: Evaluates both technical code correctness and real-world citizen requirement alignment
- 🧠 **Problem Intelligence Engine**: Extracts root causes, stakeholder impact, urgency/severity, and performs deduplication

### 🏛️ 2. Societal Problems to Solution Pipeline (New)
Bridges everyday citizens with student developers and university mentors:
- **Citizen Problem Reporting**: Citizens report issues with rich descriptions, severity/urgency, people affected, photo/video evidence with magic-byte validation, and privacy-preserving geocoding (OpenStreetMap / Nominatim).
- **AI Problem Intelligence**: Automatically categorizes issues, assesses feasibility, extracts functional requirements, identifies target stakeholders, and detects duplicate/similar reports.
- **Discovery Marketplace (`/problems`)**: Multi-faceted filtering by category, status, urgency, location/district, and keyword search.
- **University / Mentor Adoption**: Mentors adopt verified problems and convert them directly into structured team engineering projects.
- **Student Team Formation & Role Allocation**: Supports collaborative roles (Frontend, Backend, DevOps, Data/AI, QA, Project Lead) with application workflows.
- **Requirements Traceability Matrix**: End-to-end traceability linking original citizen pain points to specific development tasks and QA criteria.
- **Measured vs. Estimated Impact Tracking**: Real-world metrics dashboard comparing projected beneficiaries with validated post-launch outcomes.
- **Citizen Dashboard**: Dedicated hub for community members to monitor resolution progress, view assigned teams, and engage through votes and comments.

### 🧠 3. Strict Learning Mode
- ❌ Zero direct solution copy-pasting
- ✅ 3-Tier progressive hints (Concept → Direction → Code snippet)
- ✅ Step-by-step Socratic thinking prompts
- ✅ Eliminates tutorial hell and builds genuine engineering muscle

### 💻 4. Embedded Cloud IDE & Terminal Sandbox
- **Monaco Editor**: VS Code core running inside the browser with syntax highlighting and multi-file tree
- **Real-Time Terminal**: WebSocket-powered interactive terminal (`node-pty` + `xterm.js`)
- **Sandboxed Workspace**: Isolated file-system operations protected against command injection and directory traversal
- **Live Collaboration**: Team presence indicators and live session coordination

### 🔐 5. Robust Multi-Layer Security
1. **Magic-Byte Media Validation**: Verifies binary headers (PNG, JPEG, WebP, MP4) preventing disguised malware
2. **Command Filtering Engine**: Denylist blocks destructive commands (`rm -rf`, `mkfs`, fork bombs, reverse shells)
3. **Path Traversal Guards**: Strict workspace sandboxing (`path.relative` containment checks)
4. **Location Privacy Masking**: Coordinates obfuscated to locality/district level depending on user privacy preference
5. **Role-Based Access Control (RBAC)**: Distinct permissions for `student`, `mentor`, `citizen`, and `admin`

---

## 🏗️ Architecture Overview

```
Frontend (React 18 + Vite + Monaco + Leaflet)
   │
   ▼
API Gateway Layer (Express + JWT Auth + RBAC Guards)
   │
   ├───────────────────────┬────────────────────────┐
   ▼                       ▼                        ▼
AI Engines            Core Services           Security Layer
├── Goal Clarifier    ├── Terminal (node-pty) ├── Magic-Byte Validator
├── Milestone Gen     ├── Workspace Sandbox   ├── Command Denylist
├── Task Planner      ├── Progress Tracker    ├── Path Sanitizer
├── Mentor Engine     ├── Media Storage       └── Privacy Masking
├── QA Critic         └── Geocoding Service
├── Problem Intel
└── Arch Generator
   │
   ▼
Database Persistence Layer
├── Core Tables (users, projects, goals, milestones, tasks, logs)
└── Societal Tables (societal_problems, problem_locations, problem_media,
                     problem_ai_analysis, problem_reviews, problem_adoptions,
                     student_applications, project_architecture,
                     project_requirements, project_impact_metrics)
```

---

## 🧠 AI Engine System

| Engine | Role & Capabilities |
|---|---|
| **Goal Clarifier** | Transforms vague user prompts into precise, actionable technical specifications |
| **Milestone Generator** | Breaks complex projects into phased, logical developmental milestones |
| **Task Planner** | Decomposes milestones into atomic daily tasks with traceable requirement links |
| **Guided Execution (Mentor)** | Socratic hints and progressive guidance without revealing complete code answers |
| **QA Critic (Dual-Axis)** | Validates code for technical correctness and verifies alignment with citizen requirements |
| **Problem Intelligence** | Analyzes citizen submissions, classifies severity/urgency, extracts requirements & deduplicates |
| **Architecture Generator** | Formulates system architecture diagrams (Mermaid), API blueprints, and tracks revisions (v1, v2) |
| **Automation Advisor** | Suggests workflow automations, CI/CD integrations, and performance optimizations |

---

## 🛠️ Tech Stack

### 🔹 Frontend
- **Framework**: React 18 + Vite
- **Code Editor**: Monaco Editor (`@monaco-editor/react`)
- **Terminal Emulator**: xterm.js + WebLinks Addon
- **Maps & Geocoding**: Leaflet + React-Leaflet + OpenStreetMap (Nominatim API)
- **State Management**: Zustand
- **Styling**: Vanilla CSS with custom glassmorphism design system & CSS variables

### 🔹 Backend
- **Runtime**: Node.js (v18+) + Express
- **Real-Time Terminal**: WebSocket (`ws`) + `node-pty`
- **Security & Media**: Binary signature sniffing (magic-bytes), path sanitization, command denylist
- **Authentication**: JWT tokens + Google OAuth compatibility + RBAC middleware

### 🔹 AI & LLM Providers
- **Models**: Google Gemini, Groq, Anthropic Claude
- **Prompts**: Structured JSON-mode extraction, multi-agent persona prompts, few-shot schema validation

### 🔹 Database
- **Engine**: SQLite (`node:sqlite` or `better-sqlite3`) for lightweight local dev; PostgreSQL-ready
- **Migrations**: Additive DDL with automatic schema synchronization on startup

---

## ✨ Feature Matrix

| Feature | Student | Mentor | Citizen | Admin |
|---|:---:|:---:|:---:|:---:|
| Submit Project Idea & Goal Clarification | ✅ | ✅ | — | ✅ |
| Milestone & Daily Task Generation | ✅ | ✅ | — | ✅ |
| In-Browser Monaco IDE & Sandboxed Terminal | ✅ | ✅ | — | ✅ |
| Socratic AI Mentor & Progressive Hints | ✅ | ✅ | — | ✅ |
| Submit Societal Problem with Location & Evidence | — | — | ✅ | ✅ |
| Citizen Problem Tracking Dashboard | — | — | ✅ | ✅ |
| Problem Discovery Marketplace (`/problems`) | ✅ | ✅ | ✅ | ✅ |
| Upvote & Community Engagement on Problems | ✅ | ✅ | ✅ | ✅ |
| Apply to Join Problem Solution Team | ✅ | — | — | ✅ |
| Adopt Problem & Convert to Engineering Project | — | ✅ | — | ✅ |
| AI System Architecture Generator & Viewer | ✅ | ✅ | — | ✅ |
| Student Team Roster & Role Assignment | ✅ | ✅ | — | ✅ |
| Requirements Traceability Matrix | ✅ | ✅ | — | ✅ |
| Real-World Impact Tracking Dashboard | ✅ | ✅ | ✅ | ✅ |

---

## 🎯 User Flows

### Flow 1: Student Project Execution
1. **Submit Idea**: Student enters a raw project concept (e.g., "AI Resume Screener").
2. **Clarify**: AI asks targeted questions to establish scope, tech stack, and boundaries.
3. **Milestones & Tasks**: System plans 3–5 milestones broken down into daily atomic tasks.
4. **Code in Sandbox**: Monaco IDE + interactive terminal with real file system manipulation.
5. **Socratic Guidance**: When stuck, student requests hints (hints increase in specificity).
6. **Submit & Review**: AI QA reviews code against test criteria before marking task complete.

### Flow 2: Societal Problem → Community Solution (New)
1. **Citizen Submission (`/problems/new`)**:
   - Citizen enters problem details (water contamination, transit gap, garbage accumulation).
   - Pinpoints location on interactive map with privacy masking.
   - Uploads photo/video evidence verified by server-side magic-byte inspection.
2. **AI Problem Intelligence**:
   - Analyzes severity, urgency, people affected, and technical feasibility.
   - Extracts formal engineering requirements and identifies matching skills.
   - Flags similarity/duplicates against existing registered problems.
3. **Marketplace Discovery (`/problems`)**:
   - Community members upvote and comment on issues.
   - Problem appears in public discovery marketplace.
4. **Mentor Adoption (`/problems/:id`)**:
   - University professor or industry mentor adopts problem and approves project conversion.
5. **Architecture Generation (`/projects/:id/architecture`)**:
   - AI generates interactive Mermaid architecture diagrams, database schemas, and system components.
   - Version-controlled architecture documents (v1 baseline, v2 revisions).
6. **Student Team Formation (`/projects/:id/team`)**:
   - Students apply with their preferred roles (Frontend, Backend, DevOps, Data/AI, QA).
   - Mentor accepts applicants and assigns team positions.
7. **Traceable Execution & Dual-Axis QA**:
   - Development tasks directly reference original citizen requirements.
   - QA validates technical logic **AND** verifies problem alignment with citizen needs.
8. **Impact Measurement (`/projects/:id/impact`)**:
   - Tracks metrics (households served, latency reduced, resources saved).
   - Citizen sees verified real-world solution deployed in their dashboard.

---

## 📡 API Endpoints

### 🔐 Auth & Citizen Profile
| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register user (`student`, `mentor`, `citizen`) | Public |
| `POST` | `/api/v1/auth/login` | Authenticate user and issue JWT | Public |
| `GET` | `/api/v1/auth/me` | Retrieve authenticated user profile | Authenticated |
| `GET` | `/api/v1/citizen/dashboard` | Get citizen submitted problems, stats & updates | Citizen / Admin |

### 🏛️ Societal Problems Marketplace
| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/problems` | List problems with multi-filtering (category, urgency, search) | Public / Optional Auth |
| `GET` | `/api/v1/problems/categories` | Get all problem categories with icon metadata | Public |
| `GET` | `/api/v1/problems/:id` | Get detailed problem info, AI analysis, media & location | Public / Optional Auth |
| `POST` | `/api/v1/problems` | Submit new societal problem with location & media | Citizen / Admin |
| `POST` | `/api/v1/problems/:id/vote` | Toggle upvote on a problem | Authenticated |
| `POST` | `/api/v1/problems/:id/comments` | Post a comment or update on a problem | Authenticated |
| `POST` | `/api/v1/problems/:id/adopt` | Mentor/University adopts problem for project | Mentor / Admin |
| `POST` | `/api/v1/problems/:id/apply` | Student applies to join solution development team | Student |
| `POST` | `/api/v1/problems/:id/create-project` | Convert adopted problem into full P-S project | Mentor / Admin |

### 📁 Media & Evidence
| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/v1/media/upload` | Upload evidence media (with magic-byte validation) | Authenticated |
| `GET` | `/api/v1/media/:filename` | Stream stored media asset | Public |

### 🏗️ Project Extensions (Architecture, Team, Traceability, Impact)
| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/projects/:id/architecture` | Get system architecture diagrams and version history | Project Members |
| `POST` | `/api/v1/projects/:id/architecture` | Generate or update architecture revision (v1, v2...) | Mentor / Project Lead |
| `POST` | `/api/v1/projects/:id/architecture/approve` | Formally approve architecture baseline | Mentor / Admin |
| `GET` | `/api/v1/projects/:id/team` | List team members, open roles, and pending applications | Project Members |
| `POST` | `/api/v1/projects/:id/team/applications/:appId` | Accept or reject student application | Mentor / Project Lead |
| `GET` | `/api/v1/projects/:id/requirements` | Requirements traceability matrix (Problem → Tasks) | Project Members |
| `GET` | `/api/v1/projects/:id/impact` | View estimated vs. measured real-world impact metrics | Public / Members |
| `POST` | `/api/v1/projects/:id/impact` | Record measured real-world post-deployment metric | Mentor / Citizen |

### 🎯 Core Guided Project Execution
| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/v1/goals/submit` | Submit raw student goal | Authenticated |
| `POST` | `/api/v1/goals/clarify` | Submit answers to clarification questions | Authenticated |
| `GET` | `/api/v1/projects/:id` | Get overall project state and checkpoint | Authenticated |
| `GET` | `/api/v1/projects/:id/milestones` | Fetch project milestone tree | Authenticated |
| `GET` | `/api/v1/milestones/:id/tasks` | Get all tasks belonging to milestone | Authenticated |
| `POST` | `/api/v1/tasks/:id/start` | Start work on atomic task | Authenticated |
| `POST` | `/api/v1/tasks/:id/hint` | Request progressive hint ladder (1, 2, 3) | Authenticated |
| `POST` | `/api/v1/tasks/submit` | Submit code for automated QA review | Authenticated |

---

## 📂 Project Structure

```
P-S/
├── backend/                             # Node.js + Express Server
│   ├── src/
│   │   ├── server.js                    # Express app, WebSocket terminal & route mounts
│   │   ├── config.js                    # Environment & feature-flag configuration
│   │   │
│   │   ├── routes/                      # API routing modules
│   │   │   ├── api.js                   # Core student goal/task execution routes
│   │   │   ├── auth.js                  # User registration, login, profile & RBAC
│   │   │   ├── problems.js              # Societal problems CRUD, voting & adoption
│   │   │   ├── projectExtensions.js     # Architecture, Team, Requirements & Impact
│   │   │   ├── media.js                 # Media evidence upload & serving
│   │   │   └── fs.js                    # Sandboxed file system operations
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.js                  # JWT token validation
│   │   │   ├── optionalAuth.js          # Graceful authentication fallback
│   │   │   └── role_middleware.js       # RBAC role guards (student, mentor, citizen)
│   │   │
│   │   ├── db/
│   │   │   └── database.js              # SQLite database schema, tables & migrations
│   │   │
│   │   ├── engines/                     # Multi-Agent AI Core Engines
│   │   │   ├── problemIntelligence.js   # Problem breakdown, requirements & deduplication
│   │   │   ├── architectureGenerator.js # System architecture generator (Mermaid & v1/v2)
│   │   │   ├── goalClarifier.js         # Student idea clarification
│   │   │   ├── milestoneGenerator.js    # Milestone decomposition engine
│   │   │   ├── taskPlanner.js           # Atomic task planning & role tagging
│   │   │   ├── guidedExecution.js       # Progressive hint generation
│   │   │   ├── qaCritic.js              # Dual-axis QA engine (Technical + Problem Alignment)
│   │   │   └── mentorEngine.js          # Socratic conversational mentor
│   │   │
│   │   └── services/                    # Infrastructure services
│   │       ├── mediaService.js          # Safe media storage with magic-byte validation
│   │       ├── terminalService.js       # Interactive PTY terminal (node-pty)
│   │       ├── workspaceService.js      # File-system isolation & sandboxing
│   │       ├── progressTracker.js       # Checkpoints & progress calculation
│   │       └── aiService.js             # LLM provider switch (Gemini/Groq/Claude)
│   │
│   ├── scripts/
│   │   └── test_societal_problems.js    # Comprehensive end-to-end integration test suite
│   ├── .env.example
│   └── package.json
│
├── frontend/                            # React 18 + Vite Single Page Application
│   ├── src/
│   │   ├── App.jsx                      # Navigation, role-aware routing & guards
│   │   ├── main.jsx                     # Application bootstrap
│   │   │
│   │   ├── pages/                       # Application Views
│   │   │   ├── SocietalProblemsPage.jsx # Problems marketplace with filters & search
│   │   │   ├── ProblemSubmitPage.jsx    # Citizen submission wizard + Leaflet map
│   │   │   ├── ProblemDetailPage.jsx    # AI breakdown, adoption & team applications
│   │   │   ├── CitizenDashboardPage.jsx # Citizen profile, submitted problems & tracking
│   │   │   ├── ProjectArchitecturePage.jsx # Visual architecture diagrams & version control
│   │   │   ├── ProjectTeamPage.jsx      # Student team roster & role applications
│   │   │   ├── ProjectRequirementsPage.jsx # Traceability matrix (Problem → Task → QA)
│   │   │   ├── ProjectImpactPage.jsx    # Real-world estimated vs measured impact
│   │   │   ├── DashboardPage.jsx        # Student main dashboard & project overview
│   │   │   ├── IdePage.jsx              # In-browser Monaco editor & terminal
│   │   │   ├── GoalPage.jsx             # Goal entry screen
│   │   │   ├── ClarifyPage.jsx          # Clarification interview screen
│   │   │   ├── MentorPage.jsx           # Dedicated mentor interface
│   │   │   ├── LoginPage.jsx            # Unified login with role badges
│   │   │   └── SignupPage.jsx           # Unified registration with role selector
│   │   │
│   │   ├── components/
│   │   │   ├── problems/
│   │   │   │   └── LocationPicker.jsx   # Interactive Leaflet map with reverse geocoding
│   │   │   ├── Terminal.jsx             # xterm.js terminal integration
│   │   │   └── UI.jsx                   # Glassmorphic cards, badges, buttons, alerts
│   │   │
│   │   ├── api/
│   │   │   └── client.js                # Axios/Fetch API client with token interceptor
│   │   │
│   │   ├── store/
│   │   │   └── index.js                 # Zustand state management
│   │   └── index.css                    # Glassmorphism tokens & typography
│   │
│   ├── index.html
│   └── vite.config.js
│
├── API_CONTRACT.md                      # Complete REST specification for Societal Problems
├── ARCHITECTURE_BASELINE.md             # Baseline architecture documentation
├── DATABASE_MIGRATION.md                # Schema migration guide & table references
├── NEW_FEATURE_ARCHITECTURE.md          # In-depth architectural design for the civic feature
└── README.md                            # Main project documentation
```

---

## ⚙️ Quick Start & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**

### 2. Clone the Repository
```bash
git clone https://github.com/AnuragShivoham/P-S.git
cd P-S
```

### 3. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` in `backend/`:
```bash
cd ../backend
cp .env.example .env
```
Ensure your `.env` contains:
```env
PORT=5000
JWT_SECRET=your_super_secret_jwt_key
GEMINI_API_KEY=your_gemini_api_key_here
ENABLE_SOCIETAL_PROBLEMS=true
```

### 5. Run Integration Tests
Verify the database schema and all societal problem pipelines:
```bash
cd backend
node scripts/test_societal_problems.js
```
*(All 10 integration suites should pass with 100% success).*

### 6. Start Development Servers
In two separate terminals:

**Terminal 1 (Backend API & WebSocket):**
```bash
cd backend
npm run dev
# Running on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd frontend
npm run dev
# Running on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📚 Technical Reference Documentation

For deep technical specifications, refer to:
- 📖 [NEW_FEATURE_ARCHITECTURE.md](file:///c:/Project-Skill/P-S/NEW_FEATURE_ARCHITECTURE.md): Multi-agent pipeline design, kill-switch architecture, and sub-systems.
- 📜 [API_CONTRACT.md](file:///c:/Project-Skill/P-S/API_CONTRACT.md): Comprehensive request/response schema specifications and HTTP status codes.
- 🗄️ [DATABASE_MIGRATION.md](file:///c:/Project-Skill/P-S/DATABASE_MIGRATION.md): SQL table schemas, foreign key cascades, and migration protocols.
- 📐 [ARCHITECTURE_BASELINE.md](file:///c:/Project-Skill/P-S/ARCHITECTURE_BASELINE.md): Architectural baseline and isolation boundary documentation.

---

## 👨‍💻 Team Vision

> *"We don't want developers to spend months reading tutorials only to build trivial toy apps. We want them to ship real, production-ready software that solves genuine societal challenges — combining deep disciplined learning with real-world civic impact."*
