# SOCRATES Technical Documentation Suite

> **Authoritative Technical, Architectural, and Operational Documentation for SOCRATES (Project-Skill)**  
> **Source Code & Reference Branch:** [`feature/labour-intelligence`](https://github.com/AnuragShivoham/P-S/tree/feature/labour-intelligence)

---

## 📌 Branch & Repository Reference

All source code, schemas, and test suites for the **Labour-Market Intelligence & Competency Alignment Layer** are maintained on the **`feature/labour-intelligence`** branch:
- **Branch Name:** `feature/labour-intelligence`
- **Labour Intelligence API Routes:** [`backend/src/routes/labourIntelligence.js`](file:///c:/Project-Skill/P-S/backend/src/routes/labourIntelligence.js)
- **Labour Extraction & Ontology Engine:** [`backend/src/engines/labourIntelligenceEngine.js`](file:///c:/Project-Skill/P-S/backend/src/engines/labourIntelligenceEngine.js)
- **Competency Gap & Project Upgrader Engine:** [`backend/src/engines/competencyGapEngine.js`](file:///c:/Project-Skill/P-S/backend/src/engines/competencyGapEngine.js)
- **Labour Database Schema:** [`backend/src/db/labour_schema.js`](file:///c:/Project-Skill/P-S/backend/src/db/labour_schema.js)
- **Frontend Dashboard:** [`frontend/src/pages/LabourMarketPage.jsx`](file:///c:/Project-Skill/P-S/frontend/src/pages/LabourMarketPage.jsx)
- **Integration Test Suite:** [`backend/tests/labour_intelligence_test.js`](file:///c:/Project-Skill/P-S/backend/tests/labour_intelligence_test.js)

---

## Complete Documentation Index

| Document | Description |
|---|---|
| [LABOUR_INTELLIGENCE_ARCHITECTURE.md](file:///c:/Project-Skill/P-S/LABOUR_INTELLIGENCE_ARCHITECTURE.md) | Architectural spec for Labour-Market Intelligence, Ontology, Gap Engine, and Closed-Loop Feedback |
| [API_CONTRACT.md](file:///c:/Project-Skill/P-S/API_CONTRACT.md) | System API contracts including `/api/v1/labour`, `/api/v1/problems`, and `/api/v1/projects` |
| [docs/PRD.md](file:///c:/Project-Skill/P-S/docs/PRD.md) | Product Requirements Document: user personas, user journeys, feature requirements |
| [docs/ARCHITECTURE.md](file:///c:/Project-Skill/P-S/docs/ARCHITECTURE.md) | Repository structure, data flow, component boundaries, and security models |
| [docs/SYSTEM_ARCHITECTURE.md](file:///c:/Project-Skill/P-S/docs/SYSTEM_ARCHITECTURE.md) | Deep architectural overview covering all execution pipelines |
| [docs/API_DOCUMENTATION.md](file:///c:/Project-Skill/P-S/docs/API_DOCUMENTATION.md) | Full endpoint reference with authentication, request/response bodies, and status codes |
| [docs/BACKEND_SCHEMA.md](file:///c:/Project-Skill/P-S/docs/BACKEND_SCHEMA.md) | SQLite database schemas for projects, users, civic problems, and labour intelligence |
| [docs/APP_FLOW.md](file:///c:/Project-Skill/P-S/docs/APP_FLOW.md) | UI state transitions, routing, modal lifecycles, and page flows |
| [docs/PLAN.md](file:///c:/Project-Skill/P-S/docs/PLAN.md) | Platform implementation roadmap (Phases 0 through 12) |
| [docs/SETUP_GUIDE.md](file:///c:/Project-Skill/P-S/docs/SETUP_GUIDE.md) | Environment setup, dependency installation, and verification procedures |
| [docs/DEPLOYMENT_GUIDE.md](file:///c:/Project-Skill/P-S/docs/DEPLOYMENT_GUIDE.md) | Split-deployment architecture: Vercel frontend + Persistent Node/Container backend |
| [docs/PROJECT_SUMMARY.md](file:///c:/Project-Skill/P-S/docs/PROJECT_SUMMARY.md) | Executive system summary, architecture overview, and deployment posture |
| [docs/TRD.md](file:///c:/Project-Skill/P-S/docs/TRD.md) | Technical requirements, performance SLOs, and dependency audits |
| [docs/AI_RULES.md](file:///c:/Project-Skill/P-S/docs/AI_RULES.md) | Strict engineering rules and non-negotiable prompt guardrails |
| [docs/FEATURE_IMPLEMENTATION.md](file:///c:/Project-Skill/P-S/docs/FEATURE_IMPLEMENTATION.md) | Detailed breakdown of implemented modules and verification status |

---

## Tri-Pillar Platform Capabilities

### 1. Pipeline A: Direct Project Track
- Student goal intake and multi-round technical clarification interview.
- Deterministic milestone generation and daily atomic tasks.
- Sandboxed Monaco Cloud IDE paired with an interactive real-time pseudoterminal (`node-pty` / `xterm.js`).
- Progressive 3-tier Socratic hint ladder (Concept → Direction → Skeleton with `TODO` markers).
- Anti-cheat keystroke verification and clipboard paste interception.

### 2. Pipeline B: Civic Innovation Track
- Citizen problem reporting with geospatial metadata, reverse geocoding, and magic-byte media verification.
- Automated AI feasibility scoring, category taxonomy, and duplicate detection.
- Mentor adoption workflows, student team formation, and real-world impact tracking.
- Requirements Traceability Matrix linking citizen pain points to verified code deliverables.

### 3. Labour-Market Intelligence & Competency Alignment Track
- **Continuous Industry Radar**: Parsing real-world JDs, internship postings, and employer briefs.
- **Layered Skill Extractor**: Combining deterministic regex, experience parsing, and constrained LLM extraction normalized against a canonical skill ontology (`skills_ontology`, `skill_aliases`, `roles_ontology`).
- **Human Review Gate**: Expert faculty and hiring managers approve, modify, or reject requirements.
- **Multi-Tier Student Evidence**: Tracking `CLAIMED`, `OBSERVED`, `ASSESSED`, and `VERIFIED` states.
- **Intelligent Gap Decision Engine**: Decides between `NO_ACTION`, `UPGRADE_EXISTING_PROJECT`, `NEW_IDE_PROJECT`, or `COURSE`.
- **Non-Destructive Project Upgrades**: Injects targeted production milestones into active projects in SQLite and Cloud IDE workspaces.
- **Immutable Competency Evidence Store**: Persisting test output, coverage metrics, and mentor reviews.
- **Closed-Loop Employer Feedback**: Connecting employer hiring outcomes directly back to market demand counters.

---

## Running Verification Tests

```bash
# Verify Labour Intelligence & Competency Alignment (12/12 passing)
node backend/tests/labour_intelligence_test.js

# Verify Civic Track & Societal Problems
node backend/scripts/test_societal_problems.js
```

