# System Architecture — SOCRATES

## 1. High-Level Architecture

SOCRATES is architected as a modular, decoupled full-stack platform consisting of a React single-page frontend, an Express/Node.js backend, a native SQLite database with Write-Ahead Logging (WAL), an interactive WebSocket-based terminal sandbox, and an extensible AI engine layer.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Frontend (React 18 + Vite)                       │
│  - Monaco Editor (Code Editing)        - Leaflet (Geospatial Mapping)   │
│  - xterm.js (Interactive Terminal)     - Zustand (Reactive State Store) │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP REST / WebSocket
┌────────────────────────────────────▼────────────────────────────────────┐
│                    Backend Server (Node.js + Express)                   │
│                                                                         │
│  HTTP Routes (/api/v1):                 WebSocket Handlers:             │
│  ├── /auth (OTP, Google, Dev Login)     ├── /api/v1/terminal (node-pty) │
│  ├── /problems (Civic Marketplace)      └── /api/v1/session (Collab)    │
│  ├── /projects (Extensions, Arch)                                       │
│  ├── /labour (Labour Intelligence)      Middleware:                     │
│  ├── /fs (Sandboxed Workspace IO)       ├── JWT Authentication          │
│  ├── /media (Magic-byte Validation)     ├── RBAC Role Guard             │
│  └── / (Milestones, Tasks, QA, Hints)   └── Path Traversal Guard        │
│                                                                         │
│  Core Service Layer:                    AI Engine Layer:                │
│  ├── workspaceService                   ├── goalClarifier               │
│  ├── terminalService                    ├── milestoneGenerator          │
│  ├── socketService                      ├── taskPlanner                 │
│  ├── mediaService                       ├── guidedExecution             │
│  ├── executionService                   ├── qaCritic                    │
│  ├── progressTracker                    ├── problemIntelligence         │
│  └── courseService                      ├── architectureGenerator       │
│                                         ├── labourIntelligenceEngine    │
│                                         └── competencyGapEngine         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Native DatabaseSync
┌────────────────────────────────────▼────────────────────────────────────┐
│                    Persistence Layer (SQLite + WAL)                     │
│  - Built-in Node.js node:sqlite (zero external compilation dependencies)│
│  - Enforced Foreign Key Constraints (PRAGMA foreign_keys = ON)          │
│  - Tables: users, projects, goals, milestones, tasks, societal_problems,│
│    industry_signals, requirement_matrix, student_competencies, etc.     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Repository Layout & Module Boundaries

```
P-S/
├── backend/
│   ├── data/                   # SQLite database directory (socrates.db)
│   ├── scripts/                # Verification, migration, and test scripts
│   ├── src/
│   │   ├── config.js           # Environment variables, ports, model configurations
│   │   ├── server.js           # Server bootstrap, route mounting, WebSocket routing
│   │   ├── db/
│   │   │   ├── database.js     # Primary SQLite DDL schema and connection
│   │   │   ├── labour_schema.js# Labour intelligence DDL and seed personas
│   │   │   ├── seedCourses.js  # Baseline guided projects and tasks
│   │   │   └── claude.js       # Centralized LLM fetch wrapper (Groq / Ollama)
│   │   ├── engines/            # Pedagogical and analytical reasoning engines
│   │   │   ├── architectureGenerator.js  # Mermaid diagram & subsystem architect
│   │   │   ├── automationAdvisor.js      # CI/CD & automation advice generator
│   │   │   ├── behaviorEngine.js         # Anti-cheat typing cadence analyzer
│   │   │   ├── competencyGapEngine.js    # Gap analyzer & project upgrade generator
│   │   │   ├── goalClarifier.js          # Socratic requirements clarifying engine
│   │   │   ├── guidedExecution.js        # Tiered hint ladder & guidance
│   │   │   ├── labourIntelligenceEngine.js # JD parsing & matrix matching
│   │   │   ├── learningController.js     # Course progression & mastery logic
│   │   │   ├── mentorEngine.js           # Priority queue & intervention scoring
│   │   │   ├── milestoneGenerator.js     # Phased milestone generation
│   │   │   ├── problemIntelligence.js    # Civic problem extraction & deduplication
│   │   │   ├── qaCritic.js               # Dual-axis technical and civic QA
│   │   │   ├── scaffoldEngine.js         # Code skeleton & TODO generator
│   │   │   ├── skillEngine.js            # Adaptive skill level profiler
│   │   │   ├── taskEngine.js             # Atomic task creator
│   │   │   └── taskPlanner.js            # Daily task sequence breakdown
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verification & RBAC enforcement
│   │   │   └── optionalAuth.js # Permissive token parser for public endpoints
│   │   ├── routes/
│   │   │   ├── api.js          # Primary project, milestone, task, and mentor APIs
│   │   │   ├── auth.js         # Authentication endpoints (OTP, Google, token renewal)
│   │   │   ├── fs.js           # Sandboxed file tree, file IO, and ZIP exports
│   │   │   ├── labourIntelligence.js # Signals, matrix, and student gap endpoints
│   │   │   ├── media.js        # Magic-byte upload validation and streaming
│   │   │   ├── preview.js      # Project HTML/app preview serving
│   │   │   ├── problems.js     # Civic problem intake, voting, and adoptions
│   │   │   └── projectExtensions.js # Team rosters, traceability, impact tracking
│   │   └── services/
│   │       ├── aiService.js        # Single-toggle interface for Groq / Ollama
│   │       ├── courseService.js    # Course catalog and enrolment manager
│   │       ├── executionService.js # In-memory task execution state
│   │       ├── groqClient.js       # Official Groq API client interface
│   │       ├── mcpService.js       # External Model Context Protocol adapters
│   │       ├── mediaService.js     # Magic-byte header verification engine
│   │       ├── memoryService.js    # Project conversational context windowing
│   │       ├── ollamaClient.js     # Local model HTTP client interface
│   │       ├── progressTracker.js  # Real-time milestone progress metrics
│   │       ├── socketService.js    # Real-time WebSocket session broadcaster
│   │       ├── terminalService.js  # PTY process manager with command filtering
│   │       └── workspaceService.js # Sandboxed directory initializer and manager
│   ├── tests/
│   │   └── labour_intelligence_test.js # End-to-end integration test suite
│   ├── workspace/              # Project isolation sandbox directories
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/client.js       # Unified Axios/Fetch API client with auth interceptors
│   │   ├── components/         # Reusable UI components (Badges, Terminal, Editors)
│   │   ├── hooks/              # Custom React hooks (WebSockets, Window resize)
│   │   ├── pages/              # Route views (IDE, Dashboard, Problems, Labour)
│   │   ├── store/index.js      # Zustand global state (User, Active Project, Session)
│   │   ├── App.jsx             # React Router routing table & route guards
│   │   ├── main.jsx            # React root mount
│   │   └── index.css           # Custom design system tokens and glassmorphism UI
│   ├── package.json
│   └── vite.config.js
├── docs/                       # Authoritative documentation specifications
└── README.md                   # Project overview and index
```

---

## 3. Subsystem Breakdown

### 3.1 Authentication & RBAC Layer
- Authentication uses JSON Web Tokens (JWT) signed using a server-side secret (`JWT_SECRET`) with a 30-day validity window.
- The system supports passwordless email OTP verification via `nodemailer` or Google OAuth token exchange.
- Five distinct roles are enforced via `backend/src/middleware/auth.js`:
  - `student`: Default role for building projects.
  - `mentor`: Faculty/mentor access to intervention queues and problem adoption.
  - `citizen`: Focused access on problem reporting and dashboard tracking.
  - `university`: Course authoring and institutional project oversight.
  - `admin`: Superuser role restricted to addresses in `ADMIN_EMAILS`.

### 3.2 Sandboxed Workspace & Terminal Subsystem
- For every project, `workspaceService` provisions an isolated folder under `./workspace/<projectId>`.
- Any filesystem operation (read, write, delete, list) undergoes strict relative path validation (`path.relative(root, requested)` must not start with `..`) preventing directory traversal attacks.
- Terminal sessions run via native `node-pty` spawned processes connected to an interactive WebSocket stream (`/api/v1/terminal`).
- Destructive commands (`rm -rf /`, `mkfs`, fork bombs, netcat reverse shells) are intercepted and rejected prior to process execution by the command denylist filter in `terminalService.js`.

### 3.3 Media Verification Layer
- `mediaService.js` performs binary signature inspection (magic bytes) on raw buffers during upload:
  - PNG: `89 50 4E 47 0D 0A 1A 0A`
  - JPEG: `FF D8 FF`
  - WebP: `52 49 46 46 ... 57 45 42 50`
  - MP4: `.... 66 74 79 70`
- Rejects payload spoofing where executable binaries are disguised with image extensions.

### 3.4 AI Reasoning Pipeline
- LLM interaction is handled via `backend/src/db/claude.js` and `backend/src/services/aiService.js`, offering zero-vendor lock-in:
  - **Cloud:** Groq API (`openai/gpt-oss-120b`, `llama-3.3-70b-versatile`, `llama-3.2-11b-vision-preview`).
  - **Local:** Ollama API (`phi3:mini`, `llama3.2`).
- Prompts enforce strict JSON schemas with automatic markdown codeblock stripping and repair routines.
