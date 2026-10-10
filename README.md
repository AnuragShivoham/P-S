# SOCRATES

Live project: https://p-s-socrates.vercel.app

Video Explanation : https://drive.google.com/file/d/1zapi9RkWijEOB_Q-FHRDI_wDa2wxSDSs/view?usp=drive_link

SOCRATES is an execution-first AI engineering platform that combines a browser IDE, guided project workflow, civic innovation tooling, and a labour-market intelligence layer designed to turn skills, project evidence, and hiring signals into a measurable learning system.

This repository is centered on the Labour Intelligence engine: turning raw job descriptions, employer signals, course requirements, and student evidence into a normalized, verified competency system that helps learners close skill gaps and helps institutions and employers assess real capability.

## Why SOCRATES exists

The core problem in modern learning is not a lack of content; it is a lack of execution, evidence, and feedback loops. Students often consume tutorials and AI-generated answers without demonstrating real-world capability. Employers and institutions need evidence that is testable, traceable, and aligned with market demand.

SOCRATES addresses that by combining:

- guided project execution in a real browser IDE
- milestone-based delivery with progressive hints
- AI-powered QA and mentor feedback
- civic problem-solving workflows
- labour-market intelligence and competency alignment
- evidence-backed upgrade recommendations for learners and teams

## Live platform

- Web app: https://p-s-socrates.vercel.app
- Public landing page: https://p-s-socrates.vercel.app/
- Problems directory: https://p-s-socrates.vercel.app/problems
- Labour intelligence dashboard: https://p-s-socrates.vercel.app/labour-intelligence

## Labour Intelligence: the core differentiator

SOCRATES does more than generate tasks. It infers what the market actually values and translates that into project work, evidence, and career progression.

### What the Labour Intelligence layer does

- ingests job descriptions, internship requirements, employer briefs, and expert signals
- normalizes raw terms into a canonical skill and role ontology
- maps signals to structured requirements and competency categories
- tracks observed, claimed, assessed, and verified evidence for each learner
- detects skill gaps against target roles and projects
- recommends non-destructive project upgrades or new workspaces
- stores immutable evidence for course, hiring, and institutional review

### Key capabilities

1. Signal Ingestion
   - Parses raw labour-market inputs into structured talent signals
   - Supports unstructured text, role descriptions, and requirement language

2. Skill Ontology and Normalization
   - Converts variants like "Dockerfile", "Docker containerization", and "container setup" into canonical competency nodes
   - Maintains normalized skill dependencies and aliases

3. Requirement Matrix
   - Combines multiple signals into a single view of what the market expects
   - Highlights trends, role-level requirements, and delivery evidence needs

4. Student Competency Profiles
   - Tracks evidence across claimed, observed, assessed, and verified states
   - Produces a transparent profile instead of opaque AI scores

5. Gap Engine
   - Finds missing capabilities and recommends targeted project upgrades
   - Decides between project enhancement, new project creation, or course intervention

6. Verified Evidence Store
   - Captures execution logs, test outcomes, code artifacts, and mentor review notes
   - Provides outcomes that are meaningful to employers, mentors, and institutions

## Platform architecture

```text
Public + product surfaces
      ↓
React frontend + browser IDE
      ↓
Express API + project services
      ↓
AI mentors, QA critic, task engine
      ↓
Labour Intelligence engine
      ↓
SQLite evidence + project state store
```

### Product tracks

- Project execution track: goal → milestones → tasks → implementation → verification
- Civic innovation track: problems → feasibility → team formation → delivery → impact review
- Labour intelligence track: signals → ontology → requirements → gaps → upgrade plan → evidence

## Core technology stack

### Frontend
- React 18 + Vite
- Monaco Editor
- xterm.js terminal
- React Router
- Zustand state management

### Backend
- Node.js + Express
- SQLite database
- JWT and OAuth security
- WebSocket project execution and terminal integration

### AI and automation
- Groq / model adapters
- custom prompt orchestration for mentoring and QA
- competence and project-upgrade logic tied to real evidence

## Why this matters

This system is designed to close the gap between learning and employment:

- learners get structured coaching and execution feedback
- projects become evidence-based rather than abstract tasks
- institutions can see where skills are missing
- employers evaluate real proof instead of resume claims

## Local setup

```bash
git clone https://github.com/AnuragShivoham/P-S.git
cd P-S
npm run install:all
```

Run backend:

```bash
npm run backend
```

Run frontend:

```bash
npm run frontend
```

Open the app at:

- http://localhost:5173
- http://localhost:5173/labour-intelligence

## Documentation

Detailed documentation is available in the repo under the docs folder and architecture references:

- LABOUR_INTELLIGENCE_ARCHITECTURE.md
- API_CONTRACT.md
- docs/ARCHITECTURE.md
- docs/API_DOCUMENTATION.md
- docs/DEPLOYMENT_GUIDE.md

## Repository status

This repository is aligned to the production deployment and the labour-intelligence-first vision of the platform. The live app is deployed at https://p-s-socrates.vercel.app and the README reflects the operational, evidence-driven platform scope.

## Project structure

```text
P-S/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── config.js
│   │   ├── routes/
│   │   │   ├── api.js
│   │   │   ├── auth.js
│   │   │   └── fs.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── db/
│   │   │   ├── database.js
│   │   │   └── labour_schema.js
│   │   ├── engines/
│   │   │   ├── goalClarifier.js
│   │   │   ├── milestoneGenerator.js
│   │   │   ├── taskPlanner.js
│   │   │   ├── guidedExecution.js
│   │   │   ├── qaCritic.js
│   │   │   ├── mentorEngine.js
│   │   │   └── labourIntelligenceEngine.js
│   │   ├── services/
│   │   ├── security/
│   │   └── tests/
│   ├── scripts/
│   ├── data/
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── pages/
│   │   ├── components/
│   │   ├── api/
│   │   ├── store/
│   │   └── hooks/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json
├── docs/
├── LABOUR_INTELLIGENCE_ARCHITECTURE.md
├── API_CONTRACT.md
├── README.md
├── package.json
├── render.yaml
└── TODO.md
```

## Summary

SOCRATES is an execution-driven AI mentor and engineering platform that turns ideas into demonstrable production work. Its labour-intelligence layer connects project execution, verified evidence, and market demand into a single system that helps learners, mentors, and institutions make better decisions.

│   │   ├── api/
│   │   │   └── client.js           => API communication layer
│   │   │
│   │   ├── store/
│   │   │   └── index.js            => Zustand state management
│   │   │
│   │   └── hooks/                 => Custom React hooks
│   │
│   ├── index.html
│   └── vite.config.js
│
├── docs/ (implicit via root files)
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── API_DOCUMENTATION.md
│   ├── SETUP_GUIDE.md
│   ├── FEATURE_IMPLEMENTATION.md
│   └── PROJECT_SUMMARY.md
│
├── package.json                    => Root scripts (monorepo)
└── README.md                       => Main project documentation
