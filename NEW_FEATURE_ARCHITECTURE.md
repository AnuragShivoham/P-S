# New Feature Architecture: Societal Problems → AI Project → Collaborative Solution

## 1. System Vision
This feature establishes a continuous pipeline from real-world citizen problems to AI-architected, university/mentor-guided student development teams:

```text
Citizen Problem
      │
      ▼
AI Problem Intelligence (Categorization, Deduplication, Requirements, Stakeholders, Skills)
      │
      ▼
Problem Discovery Marketplace (/problems)
      │
      ▼
Mentor / University Adoption & Conversion (POST /problems/:id/create-project)
      │
      ▼
P-S Project (projects.problem_id = societal_problem.id)
      │
      ├──────────────────────┬──────────────────────┐
      ▼                      ▼                      ▼
AI System Architect    Project Course         Student Team
(Visual diagrams,      (Learning modules,     (Role assignment,
 versions v1, v2...)   resources, guides)     collaboration)
      │                      │                      │
      └──────────────────────┴──────────────────────┘
                             │
                             ▼
                 AI Milestone & Task Planner
                             │
                             ▼
                      Collaborative IDE
             (Monaco + Terminal + Team Session)
                             │
                             ▼
                   Contextual AI Mentor
            (Informed by Citizen Problem Context)
                             │
                             ▼
                     Dual-Axis AI QA
           (Technical Correctness + Problem Alignment)
                             │
                             ▼
                      Impact Tracking
            (Estimated vs Measured Real-world Impact)
```

---

## 2. Component Directory Structure

```
backend/
  src/
    engines/
      problemIntelligence.js   <-- AI problem analysis, parsing & deduplication
      architectureGenerator.js <-- System architecture diagrams & versioning
      mentorEngine.js          <-- (Extended) Injects societal context
      qaCritic.js              <-- (Extended) Dual-axis verification
    routes/
      problems.js              <-- /api/v1/problems CRUD, moderation, discovery
      projectExtensions.js     <-- Architecture, Team, Requirements, Impact, VS Code API
    services/
      mediaService.js          <-- Safe image/video storage & retrieval
      locationService.js       <-- OpenStreetMap/Nominatim geocoding & privacy masking

frontend/
  src/
    pages/
      ProblemSubmitPage.jsx    <-- Citizen submission wizard + Leaflet map
      SocietalProblemsPage.jsx <-- Problem discovery grid + multi-filters
      ProblemDetailPage.jsx    <-- Overview, AI breakdown, project adoption modal
      ProjectArchitecturePage.jsx <-- System architecture viewer & versioning
      ProjectTeamPage.jsx      <-- Student team roles & member management
      ProjectRequirementsPage.jsx <-- Traceability matrix (Problem → Task → QA)
      ProjectImpactPage.jsx    <-- Estimated vs Measured impact dashboard
```

---

## 3. Integration Points with Existing Modules

| Module | Existing Role | Extension for Societal Problems |
|---|---|---|
| `database.js` | Schema & migrations | Adds 10 new tables + `projects.problem_id` (non-breaking) |
| `server.js` | Express app & WebSocket server | Mounts `/api/v1/problems`, `/api/v1/media`, and `/api/v1/projects` extensions |
| `milestoneGenerator.js` | Generic milestone planner | Consumes problem requirements and constraints to generate domain-specific milestones |
| `taskPlanner.js` | Task decomposition | Attaches requirements traceability and team roles to tasks |
| `mentorEngine.js` | Socratic mentor | Enriches prompt with citizen problem, stakeholders, and root causes |
| `qaCritic.js` | Technical validator | Adds Problem Alignment check (does implementation satisfy the citizen problem?) |
| `IdePage.jsx` | Monaco editor & terminal | Adds "Collaborate" button, Live Share session launcher, and Team Presence |
| `App.jsx` | Router & Navigation | Adds "Societal Problems" navigation button and protected routes |

---

## 4. Modularity & Kill-Switch Architecture

1. **Feature Flag**: `config.ENABLE_SOCIETAL_PROBLEMS` (configured via `.env`). If `false`, routes return 404 and frontend hides the navigation link.
2. **Branch Isolation**: All code resides in `feature/societal-problems`. `main` remains unpolluted.
3. **Additive Persistence**: New tables use `CREATE TABLE IF NOT EXISTS`. No columns from existing core tables are modified or dropped.
