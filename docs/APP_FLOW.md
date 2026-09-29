# UI Page Flow & Application State Graph — SOCRATES

## 1. Route Map & Access Hierarchy

The SOCRATES frontend is an SPA running React 18, React Router v6, and Zustand for unified client state.

```
Public Routes:
  /login                 -> LoginPage (Email OTP, Google OAuth, Dev Fast-Login)
  /signup                -> SignupPage (User registration with role selection)
  /problems              -> SocietalProblemsPage (Public civic problem discovery)
  /problems/:id          -> ProblemDetailPage (Public problem dossier & AI analysis)

Authenticated Routes (General - ProtectedRoute):
  /                      -> HomeRedirect (Routes to role-specific default view)
  /projects              -> ProjectsPage (Student project hub and active builds)
  /goal                  -> GoalPage (Initial project goal formulation)
  /clarify               -> ClarifyPage (Multi-turn Socratic technical interview)
  /setup                 -> SetupPage (Stack & architectural configuration)
  /confirm-plan          -> PlanConfirmationPage (Review planned milestones/tasks)
  /onboarding            -> OnboardingPage (Baseline profile setup)
  /dashboard             -> DashboardPage (Milestone timeline, daily tasks, hint ladder)
  /ide                   -> IdePage (Monaco Editor, interactive xterm.js terminal)
  /marketplace           -> MarketplacePage (Curated guided courses & projects)
  /marketplace/:id       -> ProjectDetailPage (Course syllabus & enrollment)
  /complete              -> CompletePage (Project certificate & outcome review)
  /problems/submit       -> ProblemSubmitPage (Intake form with map picker & media)
  /projects/:id/architecture   -> ProjectArchitecturePage (Mermaid diagram visualizer)
  /projects/:id/team           -> ProjectTeamPage (Student role roster & applications)
  /projects/:id/requirements   -> ProjectRequirementsPage (Requirements Traceability Matrix)
  /projects/:id/impact         -> ProjectImpactPage (Beneficiary & outcome metrics)
  /labour-intelligence         -> LabourMarketPage (Industry signals, matrix & gap engine)

Role-Specific Protected Routes:
  /citizen-dashboard     -> CitizenDashboardPage (Guarded by CitizenRoute: role === 'citizen')
  /mentor                -> MentorPage (Guarded by MentorRoute: mentor, university, admin)
  /builder               -> CourseBuilderPage (Guarded by MentorRoute)
  /builder/:id           -> CourseBuilderPage (Guarded by MentorRoute)
  /admin                 -> AdminPage (Guarded by AdminRoute: role === 'admin')
```

---

## 2. User State Transitions & Navigation Flows

### 2.1 Authentication & Session Rehydration Flow
```
User visits site
       │
       ▼
Token exists in localStorage?
  ├── NO  ──► Redirect to /login
  └── YES ──► Validate token via GET /api/v1/auth/me
                │
                ├── Valid: Rehydrate user profile, active project, and role
                │          Execute HomeRedirect based on role:
                │          - citizen   ──► /citizen-dashboard
                │          - mentor    ──► /mentor
                │          - admin     ──► /admin
                │          - student   ──► /projects
                └── Invalid: Clear token and redirect to /login
```

---

### 2.2 Student Direct Project Flow (Pipeline A)
```
1. /goal:
   Student enters unrefined project concept (e.g., "Real-time Chat App with Redis").
       │
       ▼
2. /clarify:
   GoalClarifier conducts multi-turn interactive questionnaire (up to 10 rounds)
   to resolve ambiguity, define non-goals, and select architectural patterns.
       │
       ▼
3. /setup:
   System generates project configuration options (database, runtime, dependencies).
       │
       ▼
4. /confirm-plan:
   MilestoneGenerator and TaskPlanner output 3–5 milestones broken into daily tasks.
   Student reviews and accepts the project plan.
       │
       ▼
5. /dashboard:
   Timeline of milestones. Student views active task, concepts taught, CLI commands,
   and partial starter template code with TODO markers.
       │
       ▼
6. /ide:
   Embedded Monaco code editor + xterm.js terminal connected to sandboxed workspace.
   - Socratic Hints: Request Level 1 (Concept), Level 2 (Direction), Level 3 (Skeleton).
   - Code Verification: Submit task to QACritic engine. Pass score (>= 0.70) unlocks next task.
       │
       ▼
7. /complete:
   All milestones completed. Verified competency evidence recorded in user_skills.
```

---

### 2.3 Civic Innovation Flow (Pipeline B)
```
1. Citizen: /problems/submit
   - Fills problem title, category, description, urgency, severity, and people affected.
   - Pinpoints coordinates on Leaflet map (privacy level: exact, locality, district).
   - Attaches photo/video evidence verified via magic-byte inspection on upload.
       │
       ▼
2. System AI: ProblemIntelligence
   - Evaluates feasibility, generates urgency score, extracts technical requirements,
     and executes semantic deduplication check.
       │
       ▼
3. Public / Mentor: /problems & /problems/:id
   - Listed in public marketplace. Community upvotes and comments.
   - Mentor clicks "Adopt Problem" -> provisions linked engineering project.
       │
       ▼
4. Student Team: /projects/:id/team & /projects/:id/architecture
   - Students apply for roles (Frontend, Backend, DevOps, Data/AI, QA).
   - Mentor accepts applicants and approves AI-generated Mermaid architecture.
       │
       ▼
5. Traceability & Impact: /projects/:id/requirements & /projects/:id/impact
   - Tasks are linked directly to citizen requirements.
   - Post-launch verification compares estimated metrics to measured field impact.
```

---

### 2.4 Labour-Market Intelligence & Competency Alignment Flow
```
1. Industry Signals Ingestion:
   - System receives and normalizes company job descriptions into SkillOntology.
       │
       ▼
2. Faculty / Expert Review:
   - Expert verifies requirement matrix via /labour-intelligence.
       │
       ▼
3. Student Gap Analysis:
   - Compares student's completed projects and verified competencies against target role.
       │
       ├── Gap status: NO_ACTION (Skill already verified in portfolio)
       ├── Gap status: UPGRADE_EXISTING_PROJECT (Appends new milestone/tasks to existing project)
       └── Gap status: NEW_IDE_PROJECT (Spins up targeted project in Monaco Cloud IDE)
       │
       ▼
4. Evidence Verification & Placement Loop Closure:
   - Passing QA on upgrade tasks writes immutable proof into competency_evidence table.
   - Placement feedback updates industry signal weights.
```

---

## 3. Anti-Cheat & Pedagogical Safety States

- **Monaco Inputarea Guard:**
  - Event listeners on `paste`, `beforeinput`, and `keydown` (`Ctrl+V`, `Cmd+V`, `Shift+Insert`) intercept and prevent clipboard pasting into code editor panes.
  - Displays user alert: `"Code pasting is disabled. Type the implementation yourself."`
- **Behavioral Telemetry:**
  - Keystroke timing and task execution duration monitored by `behaviorEngine.js` to distinguish human typing cadence from scripted automation.
