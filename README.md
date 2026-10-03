# SOCRATES (Project-Skill)

> **Execution-Driven AI Engineering Mentor, Civic Innovation Platform & Labour-Market Intelligence Engine**  
> *Translating concepts, community challenges, and real-world market demands into production-ready software through structured Socratic guidance.*

---

## 📌 Branch & Source Code Reference

> **Active Development Branch:** [`feature/labour-intelligence`](https://github.com/AnuragShivoham/P-S/tree/feature/labour-intelligence)  
> All source code, schema definitions, layered extraction engines, gap decision trees, evidence stores, and integration test suites for the Labour-Market Intelligence & Competency Alignment system are maintained in the **`feature/labour-intelligence`** branch.
>
> To check out this branch:
> ```bash
> git fetch origin
> git checkout feature/labour-intelligence
> ```

---

## Overview

**SOCRATES** is an educational, civic, and labour-alignment engineering platform designed to eliminate "tutorial hell" and bridge technical university talent with authentic community and industrial demands.

Rather than providing direct copy-paste code solutions, SOCRATES enforces genuine engineering capability by breaking goals into structured milestones, serving partial starter skeletons with `TODO` markers, offering progressive 3-tiered hints, and verifying implementations in a sandboxed cloud IDE with automated QA Critic audits.

With the addition of the **Labour-Market Intelligence Layer**, SOCRATES connects industry hiring signals directly to cloud IDE projects, closing the loop between curriculum, student evidence, and employer verification.

---

## Core Pillars & Architecture

```
                      ┌──────────────────────────────────────────────┐
                      │              SOCRATES PLATFORM               │
                      └──────────────────────┬───────────────────────┘
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      │                                      │                                      │
┌─────▼────────────────────────┐ ┌───────────▼──────────────────┐ ┌─────────────────▼────────────────┐
│         PIPELINE A           │ │          PIPELINE B          │ │        LABOUR INTELLIGENCE       │
│     Direct Project Track     │ │    Civic Innovation Track    │ │    Competency Alignment Track    │
├──────────────────────────────┤ ├──────────────────────────────┤ ├──────────────────────────────────┤
│ • Goal clarification dialog  │ │ • Citizen problem intake     │ │ • Industry JD & signal parser    │
│ • Deterministic milestones   │ │ • Magic-byte & geo validation│ │ • Canonical ontology normalizer  │
│ • Daily atomic tasks         │ │ • AI feasibility & analysis  │ │ • Multi-signal requirement matrix│
│ • Monaco Cloud IDE execution │ │ • Mentor problem adoption    │ │ • Expert & faculty review gate   │
│ • Socratic hint ladder       │ │ • Student team formation     │ │ • Multi-tier student evidence    │
│ • Sandboxed terminal         │ │ • Requirements traceability  │ │ • Intelligent gap decision tree  │
│ • Dual-axis QA critic audit  │ │ • Field impact verification  │ │ • Non-destructive project upgrade│
│                              │ │                              │ │ • Evidence-backed employer view  │
│                              │ │                              │ │ • Closed-loop placement feedback │
└──────────────────────────────┘ └──────────────────────────────┘ └─────────────────┬────────────────┘
                                                                                    │
                                                                                    ▼
                                                                ┌────────────────────────────────────┐
                                                                │   INJECTS UPGRADE MILESTONES       │
                                                                │   INTO MONACO CLOUD IDE & DB       │
                                                                └────────────────────────────────────┘
```

### 1. Pipeline A: Direct Project Track
- Student goal clarification through an interactive AI interview.
- Deterministic milestone and daily atomic task breakdown.
- Starter skeletons with strict `TODO` contracts.
- Progressive Socratic hint ladder:
  - **Tier 1**: Conceptual foundation.
  - **Tier 2**: Algorithmic direction and structural hints.
  - **Tier 3**: Partial skeleton code with syntax guidance (no direct copy-paste solutions).

### 2. Pipeline B: Civic Innovation Track
- Citizen problem reporting with geospatial metadata and magic-byte media verification.
- Automated AI feasibility scoring, category taxonomy, and duplicate detection.
- Mentor adoption workflows, student team formation, and milestone tracking.
- Requirements traceability matrix connecting citizen pain points to verified code deliverables.

### 3. Labour-Market Intelligence & Competency Alignment Track
- **Source Code Branch**: [`feature/labour-intelligence`](https://github.com/AnuragShivoham/P-S/tree/feature/labour-intelligence)
- **Continuous Industry Radar**: Ingests job descriptions, internship postings, employer partner briefs, and expert consultations.
- **Layered Extraction Engine**: Combines deterministic regex rules, experience parsing, and structured LLM fallbacks into a canonical skill ontology (e.g., normalizes *"Dockerfiles"*, *"Docker Containerization"* → `docker`).
- **Human Review Gate**: Expert faculty and hiring managers review, modify, or approve competencies before curriculum/student assignment.
- **Multi-Tier Student Evidence Profiles**:
  - `CLAIMED`: Self-reported on CV / LinkedIn.
  - `OBSERVED`: Detected in public repositories / Git commits.
  - `ASSESSED`: Verified via quizzes and coding challenges.
  - `VERIFIED`: Proven through sandboxed IDE compilation, passing test suites, and QA Critic sign-off.
- **Intelligent Gap Decision Engine**:
  - `NO_ACTION`: Verified evidence already exists in the immutable store.
  - `UPGRADE_EXISTING_PROJECT`: Injects targeted production milestones (e.g., Docker containerization & health probes) into existing repositories without destructive overwrites.
  - `NEW_IDE_PROJECT`: Scaffolds a new cloud IDE workspace when no relevant base project exists.
  - `COURSE`: Recommends foundational study for theoretical gaps.
- **Competency Evidence Store**: Immutable records with test logs, coverage percentages, health probe traces, and mentor notes.
- **Employer Candidate Explorer & Closed-Loop Feedback**: Employers inspect verifiable evidence and provide post-interview/hiring feedback, automatically updating market demand counters.

---

## Technical Stack

| Component | Technology |
|---|---|
| **Frontend** | React 18, Vite, React Router v6, Monaco Editor, xterm.js, Leaflet, Zustand, Lucide Icons, CSS Design Tokens |
| **Backend** | Node.js (v22.12.0+), Express 4, WebSocket (`ws`), `node-pty`, JWT Auth, Multer, Nodemailer |
| **Database** | SQLite via `node:sqlite` (`DatabaseSync` with WAL mode and foreign key enforcement) — zero native build dependencies |
| **AI Integration** | Centralized model adapter supporting Groq Cloud (`llama-3.3-70b`, `gpt-oss-120b`, `llama-3.2-vision`) and local Ollama (`phi3:mini`) |
| **Reference Branch**| [`feature/labour-intelligence`](https://github.com/AnuragShivoham/P-S/tree/feature/labour-intelligence) |

---

## Quickstart & Setup

### Prerequisites
- Node.js **22.12.0** or higher
- npm **10.0.0** or higher
- Git (switched to `feature/labour-intelligence`)

### 1. Clone & Switch Branch
```bash
git clone https://github.com/AnuragShivoham/P-S.git
cd P-S
git checkout feature/labour-intelligence
```

### 2. Install Dependencies
```bash
npm run install:all
```

### 3. Environment Configuration
Copy the sample environment file in `backend`:
```bash
cp backend/.env.example backend/.env
```
Configure your keys in `backend/.env`:
```env
PORT=3001
JWT_SECRET=your_jwt_secret_here
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
ENABLE_SOCIETAL_PROBLEMS=true
```

### 4. Running the Development Servers

Run backend (runs on `http://localhost:3001`):
```bash
npm run backend
```

In a separate terminal, run frontend (runs on `http://localhost:5173`):
```bash
npm run frontend
```

Navigate to:
- Core Platform: `http://localhost:5173`
- Labour Intelligence Dashboard: `http://localhost:5173/labour-intelligence`
- Civic Innovation Hub: `http://localhost:5173/societal-problems`

---

## Labour Intelligence API Endpoints (`/api/v1/labour`)

All Labour Intelligence routes are mounted at `/api/v1/labour` (source code in [`backend/src/routes/labourIntelligence.js`](file:///c:/Project-Skill/P-S/backend/src/routes/labourIntelligence.js) on branch `feature/labour-intelligence`):

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/signals/ingest` | Ingests and parses raw JD or industry hiring signals |
| `GET` | `/signals` | Lists ingested signals with provenance details |
| `GET` | `/signals/:id` | Detailed view of parsed signal sections and extracted skills |
| `GET` | `/ontology/skills` | Canonical skills ontology, aliases, and proficiency levels |
| `GET` | `/ontology/roles` | Canonical role hierarchy and categories |
| `POST` | `/ontology/normalize` | Normalizes arbitrary raw skill strings to canonical skill IDs |
| `GET` | `/requirements` | Multi-signal market requirement matrix with trend metrics |
| `POST` | `/requirements/:id/review` | Records human expert validation (`APPROVE`, `MODIFY`, `REJECT`) |
| `GET` | `/students/:id/evidence` | Student multi-tier evidence profile (`CLAIMED` through `VERIFIED`) |
| `POST` | `/students/:id/gap-analysis` | Runs intelligent gap decision tree against target role/skill |
| `POST` | `/projects/:id/upgrade-plan` | Previews non-destructive upgrade milestone and tasks |
| `POST` | `/projects/:id/apply-upgrade` | Injects upgrade milestone into the active project workspace/DB |
| `GET` | `/evidence` | Queries verified competency evidence records |
| `POST` | `/evidence/record` | Commits verified evidence record to immutable store |
| `GET` | `/employer/candidates` | Evidence-backed candidate talent explorer for hiring partners |
| `POST` | `/employer/feedback` | Submits candidate hiring outcomes to close the feedback loop |
| `GET` | `/institution/curriculum-analysis` | Institutional curriculum gap and candidate analytics |

---

## Verification & Test Suite

Verify the complete Labour-Market Intelligence and Competency Alignment system:

```bash
# Run Labour Intelligence test suite (12/12 passing integration tests)
node backend/tests/labour_intelligence_test.js

# Run Societal Problems civic track test suite
node backend/scripts/test_societal_problems.js

# Validate Frontend Production Build
cd frontend && npm run build
```

---

## Documentation Index

Explore the authoritative documentation in [`docs/`](file:///c:/Project-Skill/P-S/docs) (maintained on branch `feature/labour-intelligence`):

- [LABOUR_INTELLIGENCE_ARCHITECTURE.md](file:///c:/Project-Skill/P-S/LABOUR_INTELLIGENCE_ARCHITECTURE.md) — Comprehensive Labour Intelligence architecture, database schema, extraction pipeline & gap decision tree.
- [API_CONTRACT.md](file:///c:/Project-Skill/P-S/API_CONTRACT.md) — REST API specifications across all platform subsystems.
- [docs/PRD.md](file:///c:/Project-Skill/P-S/docs/PRD.md) — Product Requirements Document including Labour Intelligence specs.
- [docs/ARCHITECTURE.md](file:///c:/Project-Skill/P-S/docs/ARCHITECTURE.md) — Core system architecture and module boundaries.
- [docs/SYSTEM_ARCHITECTURE.md](file:///c:/Project-Skill/P-S/docs/SYSTEM_ARCHITECTURE.md) — High-level architecture, data flows, and subsystem maps.
- [docs/BACKEND_SCHEMA.md](file:///c:/Project-Skill/P-S/docs/BACKEND_SCHEMA.md) — Complete database schemas for projects, users, civic track, and labour intelligence.
- [docs/APP_FLOW.md](file:///c:/Project-Skill/P-S/docs/APP_FLOW.md) — User interface journey and state transition flows.
- [docs/API_DOCUMENTATION.md](file:///c:/Project-Skill/P-S/docs/API_DOCUMENTATION.md) — Full API reference guide with request/response schemas.
- [docs/PLAN.md](file:///c:/Project-Skill/P-S/docs/PLAN.md) — Complete implementation roadmap (Phases 0–12).
- [docs/SETUP_GUIDE.md](file:///c:/Project-Skill/P-S/docs/SETUP_GUIDE.md) — Developer setup, environment configuration, and verification.
- [docs/DEPLOYMENT_GUIDE.md](file:///c:/Project-Skill/P-S/docs/DEPLOYMENT_GUIDE.md) — Production split-deployment: Vercel frontend + Persistent Node/Container backend.
- [docs/PROJECT_SUMMARY.md](file:///c:/Project-Skill/P-S/docs/PROJECT_SUMMARY.md) — Executive project summary and milestone status.
- [docs/TRD.md](file:///c:/Project-Skill/P-S/docs/TRD.md) — Technical requirements, performance targets, and dependency audits.
- [docs/AI_RULES.md](file:///c:/Project-Skill/P-S/docs/AI_RULES.md) — Guardrails for AI mentors and prompt contracts.

