# SOCRATES (Project-Skill)

Execution-Driven AI Engineering Mentor and Civic Innovation Platform
Translating concepts and community challenges into production-ready software through structured Socratic guidance.

Overview

SOCRATES is an educational and civic engineering platform designed to eliminate tutorial hell and bridge university technical talent with real-world problems.

Rather than generating direct copy-paste code solutions, SOCRATES enforces genuine engineering capability by breaking complex goals into structured milestones, serving partial starter skeletons with TODO markers, offering progressive 3-tiered hints, and verifying implementations in a sandboxed cloud IDE with automated QA.

Key Features

Dual-Pipeline Architecture:
- Pipeline A (Direct Project Track): Student goal clarification, deterministic milestone breakdown, daily atomic tasks, Monaco Cloud IDE, and Socratic guidance.
- Pipeline B (Civic Innovation Track): Citizen problem intake with geospatial and magic-byte media validation, AI feasibility and requirement analysis, mentor problem adoption, student team formation, requirements traceability, and real-world impact tracking.

Labour-Market Intelligence and Competency Alignment:
- Ingests real-world job descriptions (industry signals), maps them to a canonical skill ontology, facilitates faculty and expert human reviews, performs gap analysis against student portfolios, and generates targeted project upgrades or new cloud IDE projects with verified evidence stores.

Embedded Monaco Cloud IDE and Sandboxed Terminal:
- Multi-file code editor running in the browser, paired with an interactive pseudoterminal (node-pty and xterm.js) connected via WebSocket with command filtering denylists and strict directory traversal prevention.

Strict Anti-Cheat and Physical Typing Guards:
- Clipboard paste interception on editor inputs to ensure active code typing, supplemented by keystroke cadence analysis.

Progressive Socratic Hint Ladder:
- Tier 1: Conceptual foundation.
- Tier 2: Algorithmic direction and structure.
- Tier 3: Partial skeleton code with syntax guidance. Complete solutions are not provided directly.

Dual-Axis QA Critic:
- Evaluates both technical code correctness and alignment with original citizen or user requirements.

See docs/ for full documentation:

PRD.md — Product requirements
ARCHITECTURE.md — Repository structure and module boundaries
PLAN.md — Build roadmap (phases 0–11)
BACKEND_SCHEMA.md — Data shapes and JSON schemas
APP_FLOW.md — UI page flow and states
TRD.md — Technical requirements and dependency audit
AI_RULES.md — Non-negotiable engineering rules

Tech Stack

Frontend: React 18, Vite, React Router v6, Monaco Editor, xterm.js, Leaflet, Zustand, CSS design tokens.
Backend: Node.js (version 22.12.0 or higher), Express, WebSocket, node-pty, JWT authentication, nodemailer.
Database: SQLite (node:sqlite DatabaseSync with WAL mode and foreign key enforcement).
AI Integration: Centralized model adapter supporting Groq Cloud (llama-3.3-70b, gpt-oss-120b, llama-3.2-vision) and local Ollama (phi3:mini).

Quickstart

Prerequisites:
- Node.js 22.12.0 or higher
- npm 10.0.0 or higher

1. Installation
Install dependencies across both backend and frontend:
npm run install:all

2. Configuration
Copy the sample environment file in backend:
cp backend/.env.example backend/.env
Provide your GROQ_API_KEY in backend/.env for cloud reasoning, or set LLM_PROVIDER=ollama for local inference.

3. Running Locally
Run the backend server:
npm run backend
Backend runs on http://localhost:3001

In a separate terminal, run the frontend:
npm run frontend
Frontend runs on http://localhost:5173

Verification and Tests

Run the backend integration test suites:
node backend/tests/labour_intelligence_test.js
node backend/scripts/test_societal_problems.js

Verify the frontend production build:
cd frontend
npm run build
