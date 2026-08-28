# AQ - Fix & Implementation Plan

> Audit date: 2026-08-22  
> Scope: read-only technical audit and implementation plan.  
> Source code modified during this audit: **NO**.

## 1. Executive Summary

AQ is implemented as AMIT-BODHIT / PROJECT-SKILL: an execution-first AI mentor that turns an idea into a clarified goal, milestones, daily tasks, guided coding, QA review, and project completion. The repository contains a substantial React/Vite frontend and Node/Express backend, but it combines a legacy project engine with a newer V2 course engine without a stable contract between them.

The application currently starts and the frontend production build succeeds, but the principal learning path is not production-ready. The highest-impact failures are V2 SQLite contract mismatches, an undeclared runtime variable in the learning controller, missing backend dependencies for dormant integrations, inconsistent frontend API paths, insufficient ownership checks, and an unauthenticated project preview. The terminal is a real host PTY rather than a sandbox, so it is a critical security and deployment risk.

The recommended order is: establish a reproducible baseline and schema migration strategy; repair auth/ownership boundaries; choose and consolidate one task/progress model; repair V2 learning handlers; normalize API contracts and frontend URLs; then add integration tests and harden execution, AI, and deployment.

## 2. Project Understanding

The intended product is a guided project-building platform, not a general chatbot:

1. A student authenticates with email OTP or Google.
2. The student submits a project idea.
3. AI clarifies the goal and extracts stack, scope, time, skill level, and deliverables.
4. AI generates milestones and tasks.
5. The student works in a browser IDE with a workspace and terminal.
6. The mentor provides progressive hints and guided questions.
7. The student submits code or an explanation for review.
8. QA marks work as passed, failed, or requiring more explanation.
9. Progress, memory, conversations, and interventions are persisted.
10. Mentors/admins can intervene, build courses, and manage platform data.

The actual source supports two overlapping models:

- Legacy projects use `projects`, `milestones`, `tasks`, `qa_reviews`, `conversation_turns`, and `workspace_files`.
- V2 courses use `courses`, `course_milestones`, `course_tasks`, `course_progress`, `behavior_logs`, `hint_requests`, and `user_skills`.

Both models are exposed through the same API and frontend, but several handlers assume columns and state transitions belonging to a third, partially migrated model.

## 3. Current Architecture

```text
React/Vite frontend
  App.jsx + React Router + Zustand
  Pages, IDE, Monaco, xterm.js, mentor UI
          |
          | fetch('/api/v1/...'), browser WebSockets
          v
Express backend
  server.js
  auth routes
  API routes
  FS routes
  preview route
          |
          +--> legacy engines/services
          |      goalClarifier, milestoneGenerator, taskPlanner,
          |      guidedExecution, qaCritic, progressTracker
          |
          +--> V2 course engines
          |      learningController, behaviorEngine, scaffoldEngine,
          |      skillEngine, TaskEngine, mentorEngine
          |
          +--> SQLite default database
          |      optional PostgreSQL file is not wired into server startup
          |
          +--> Groq shim / Ollama / dormant MCP, Redis, BullMQ, PTY
```

Important deployment facts:

- Express listens on `config.PORT`, default `3001`.
- Vite proxies `/api` to `127.0.0.1:3001`.
- The frontend normally uses relative `/api/v1` paths, but some IDE paths hardcode ports.
- SQLite uses Node's built-in `node:sqlite`; startup requires a Node version supporting `DatabaseSync`.
- The terminal launches PowerShell on Windows or Bash on other platforms directly on the host.
- Preview is mounted before authentication and serves workspace files.

## 4. Technology Stack

| Area | Actual implementation | Assessment |
|---|---|---|
| Frontend | React 18, Vite 5, React Router 6, Zustand | Builds successfully; no automated frontend tests. |
| Editor | `@monaco-editor/react` | Real UI integration; runtime flow unverified. |
| Terminal | xterm.js, xterm addon, `node-pty`, WebSocket | Real PTY, but host-level and weakly filtered. |
| Backend | Node.js, Express 4, CommonJS | Starts successfully with installed dependencies. |
| Database | Node built-in SQLite, WAL, foreign keys | Default path works; migrations are incomplete and non-transactional. |
| PostgreSQL | `backend/src/db/pg.js` | Not declared in backend dependencies and not used by server. |
| Auth | JWT, email OTP, Google tokeninfo | Real flow exists; session and abuse protections need hardening. |
| AI | Groq through `db/claude.js`; Ollama alternative | Naming/documentation are misleading; Groq key is required by default. |
| Realtime | `ws` project session and terminal sockets | Real code; project authorization and deployment behavior need tests. |
| Queue | BullMQ/ioredis source | Dormant/unavailable because packages are not declared/installed. |
| MCP | `@modelcontextprotocol/sdk` source | Dormant/unavailable because package is not declared/installed. |
| Tests | No test directory or test scripts | Missing. |
| Deployment | Dockerfile and docker-compose | Requires verification against actual services and environment. |

## 5. Application Flow

### Main student flow

```text
LoginPage
  -> /api/v1/auth/send-otp or /auth/google
  -> JWT stored in localStorage
  -> App rehydration
  -> GoalPage
  -> POST /goals/submit
  -> goalClarifier / AI
  -> ClarifyPage or SetupPage
  -> POST /goals/clarify
  -> PlanConfirmationPage
  -> POST /goals/confirm
  -> milestoneGenerator + taskPlanner
  -> DashboardPage / IdePage
  -> task start, ask, hint, file operations, terminal
  -> submitTask or learningProcess
  -> QA/progress update
  -> next task or CompletePage
```

### Marketplace/course flow

```text
MarketplacePage
  -> GET /marketplace
  -> ProjectDetailPage
  -> POST /marketplace/:id/start
  -> project + workspace
  -> course task/progress APIs
  -> POST /courses/tasks/:id/submit or POST /learning/process
```

The flow breaks when V2 learning handlers execute SQL against columns that are absent, when course submission calls nonexistent `WorkspaceService.getWorkspacePath()`, and when frontend/client endpoints do not match backend routes or expected response shapes.

### IDE flow

```text
IdePage
  -> GET /fs/tree and GET /fs/file
  -> Monaco edits
  -> POST /fs/file / upload / rename / delete
  -> WebSocket /api/v1/terminal
  -> host PTY in project directory
  -> POST /projects/:id/execute/run
  -> preview or download
```

Basic file operations are real and ownership checks exist in the FS route. Preview and terminal isolation are not sufficient for a production multi-user service.

## 6. Feature Inventory

| ID | Feature | Frontend | Backend/data | Status | Evidence |
|---|---|---|---|---|---|
| F-001 | Email OTP login | `frontend/src/pages/LoginPage.jsx` | `backend/src/routes/auth.js`, OTP tables | PARTIALLY_WORKING | Real send/verify flow; dev fallback, no rate limit, and email config may be absent. |
| F-002 | Google login | Login page | `/auth/google`, Google tokeninfo | PARTIALLY_WORKING | Real verification exists; audience check is conditional on configured client ID. |
| F-003 | Session persistence | `App.jsx`, `store/index.js` | JWT middleware | PARTIALLY_WORKING | localStorage rehydration exists; expiry/refresh and stale state are weak. |
| F-004 | Goal clarification | Goal/Clarify/Setup pages | goalClarifier + `/goals/*` | PARTIALLY_WORKING | Real AI flow; refresh loses router state and provider config is required. |
| F-005 | Milestone/task generation | Plan confirmation/dashboard | milestoneGenerator/taskPlanner | PARTIALLY_WORKING | Real AI generation; no durable transaction around finalization. |
| F-006 | Legacy task guidance | Dashboard/IDE | guidedExecution, `/tasks/:id/ask`, hints | PARTIALLY_WORKING | Real path exists; mixed task models and ownership checks vary. |
| F-007 | Legacy QA submission | Dashboard | `/tasks/submit`, qaCritic, tracker | PARTIALLY_WORKING | Real QA path exists; runtime/API behavior needs integration tests. |
| F-008 | V2 behavior analysis | Dashboard/course UI | learningController + behavior_logs | BROKEN | Inserts nonexistent `paste_size`, `typing_speed`, `attempts`, `time_spent`. |
| F-009 | V2 scaffold/hints | Course UI | learningController + hint_requests | BROKEN | Reads/writes nonexistent `level` and `hint_text`; scaffold state is not consistently created. |
| F-010 | V2 code/explanation QA | Dashboard | `/learning/process`, qa_reviews/course_progress | BROKEN | SQL columns/state transitions do not match schema; `tracker` is undeclared in code path. |
| F-011 | Marketplace listing | Marketplace page | `/marketplace`, courses/community tables | WORKING | Listing path exists and is data-backed; runtime content depends on seed data. |
| F-012 | Course start | Project detail | `/marketplace/:id/start` | PARTIALLY_WORKING | Creates project/workspace; course and legacy state are not normalized. |
| F-013 | Course static submission | Dashboard | `/courses/tasks/:id/submit` | BROKEN | Calls nonexistent `getWorkspacePath()` and uses incompatible progress semantics. |
| F-014 | Workspace file CRUD | IDE | FS routes + WorkspaceService | PARTIALLY_WORKING | Ownership/path validation exists; route variants and runtime behavior lack tests. |
| F-015 | File download/upload | IDE | FS routes | PARTIALLY_WORKING | Download URL hardcodes port 3000; upload has no explicit size/quota validation. |
| F-016 | Git clone/push | IDE | FS routes and shell `exec` | BROKEN | Clone URL interpolation is unsafe; push can return success with `pushFailed`. |
| F-017 | Browser preview | WebPreview/IDE | unauthenticated preview route | BROKEN / SECURITY | No auth or ownership check; prefix path check is insufficient. |
| F-018 | Terminal | Terminal/IDE | PTY WebSocket | PARTIALLY_WORKING / SECURITY | Real host PTY; command denylist is bypassable and not a sandbox. |
| F-019 | Project session WebSocket | `useSocket`, mentor UI | socketService | PARTIALLY_WORKING / SECURITY | JWT path exists; secret fallback differs and project ownership is not bound. |
| F-020 | Mentor queue/intervention | Mentor pages | mentor/session routes | PARTIALLY_WORKING | Queue and intervention code exists; authorization checks are inconsistent. |
| F-021 | Course builder | CourseBuilderPage | builder routes | PARTIALLY_WORKING | CRUD exists with mentor checks; validation/publishing integrity needs tests. |
| F-022 | Admin management | AdminPage | admin routes/tables | PARTIALLY_WORKING | Most mutations use adminOnly; GET extensions is not explicitly admin-only. |
| F-023 | AI mentor provider selection | Multiple pages | `aiService`, Groq/Ollama | PARTIALLY_WORKING | Groq/Ollama code exists; docs claim Claude/Gemini support not reflected in active path. |
| F-024 | MCP tools | None evident in active UI | `mcpService.js` | INCOMPLETE | Source imports undeclared SDK and has no active lifecycle/config route. |
| F-025 | Redis/BullMQ queue | None evident in active flow | queue/redis services | INCOMPLETE | Dependencies absent; no verified worker startup or queue integration. |
| F-026 | PostgreSQL support | None | `db/pg.js` | MOCK/PLACEHOLDER | File exists but server uses SQLite and `pg` is not declared. |
| F-027 | Automated testing | None | package scripts | MISSING | No test script or test suite. |
| F-028 | Notifications/email reliability | Login | Nodemailer | PARTIALLY_WORKING | OTP email code exists; configuration, retry, delivery observability absent. |

## 7. Working Features

These are working at source/build or basic startup level, not fully end-to-end certified:

- Frontend production compilation: `npm run build` passed.
- Backend JavaScript syntax checks passed for entrypoint and critical route/service files.
- Backend startup passed and `/health` is implemented.
- Express route registration, static database initialization, and SQLite WAL setup are present.
- JWT verification middleware exists and is applied at `/api/v1` in `server.js`.
- FS routes generally use project ownership checks and `WorkspaceService` path validation.
- Course, marketplace, mentor, builder, admin, and project route surfaces exist.
- Google tokeninfo verification and OTP consumption logic exist.

No feature should be labeled fully production-working until it has an automated route/database test and a browser flow test.

## 8. Partially Working Features

- Authentication: functional code path, but OTP abuse controls, delivery configuration, known test OTP behavior, localStorage token handling, and token refresh are unresolved.
- Goal-to-plan: AI-backed and substantially implemented, but provider configuration and React Router state persistence make refresh/recovery unreliable.
- Legacy project execution: service and routes exist, but the current/legacy/V2 models overlap.
- IDE: file editing and terminal UI are real, but hardcoded URLs, runtime routing, security, and deployment assumptions remain.
- Mentor intervention: queue/context/join/leave are implemented but do not uniformly verify project ownership and mentor authorization.
- Admin/builder: CRUD is present, though request schemas and ownership constraints need explicit validation.
- AI: provider shim works conceptually, but active provider naming and fallback behavior are inconsistent.

## 9. Broken Features

### F-008/F-009/F-010 - V2 learning controller contract failures

Priority: P0. Severity: CRITICAL.

Current behavior: V2 behavior, hint, and code/explanation actions reach `learningController.js` and then issue SQL using columns absent from the live schema. The observed live columns are:

- `behavior_logs`: `id,user_id,task_id,cheat_score,paste_score,typing_pattern,created_at`
- `hint_requests`: `id,user_id,task_id,requested_at`
- `qa_reviews`: `id,task_id,attempt_number,verdict,score,passed_checks,failed_checks,corrections,feedback_text,created_at`
- `course_progress`: migration-added columns exist in the current DB, but base schema and migrations are conditional/incomplete.

Root cause: the controller was written for a newer schema than `database.js` creates. In addition, `processSubmission` calls `tracker.getProject()` without importing or defining `tracker` in module scope.

Fix: select one canonical V2 schema, add versioned idempotent migrations, update all queries and response states to that schema, import `progressTracker` explicitly, and test each action against a fresh database.

### F-013 - Course static submission

Priority: P0. Severity: CRITICAL.

Current behavior: `POST /courses/tasks/:id/submit` verifies a course project, then calls `WorkspaceService.getWorkspacePath(projectId)`. The service exposes `getProjectPath(projectId)`, not `getWorkspacePath`.

Root cause: stale service method name during refactoring, compounded by two separate course submission implementations.

Fix: use one submission service and one method name; resolve project/task ownership and persist progress in a transaction.

### F-017 - Preview

Priority: P0. Severity: CRITICAL.

Current behavior: `server.js` mounts `/api/v1/preview` without `authMiddleware`; `preview.js` takes any project ID and serves files. It only uses `fullPath.startsWith(workspacePath)` for traversal defense.

Root cause: preview was treated as a public static server and has no project/user authorization boundary. A prefix comparison also accepts sibling paths sharing a string prefix.

Fix: authenticate preview or issue short-lived signed preview tokens; verify project ownership/access; use `path.relative` boundary checks; deny sensitive files; apply content type and caching controls.

### F-016 - Git integration

Priority: P1. Severity: HIGH.

Current behavior: Git clone interpolates a user-controlled URL into a shell command. Git push may return HTTP success while setting `{ pushFailed: true }`.

Root cause: shell execution is used instead of argument-safe process spawning, and error semantics were made non-failing.

Fix: use `spawnFile`/`execFile` with argument arrays, validate supported URL schemes/hosts, set timeouts and output limits, and return non-2xx on failure.

## 10. Mock / Placeholder Features

- `backend/src/db/pg.js` is PostgreSQL-ready-looking code but is not wired, and `pg` is not declared.
- `backend/src/services/mcpService.js` is an unfinished integration: undeclared SDK, no configured server registry, no active caller, and `disconnectAll()` does not close transports.
- `backend/src/services/queue.js` and `redis.js` are infrastructure stubs relative to the active app because required packages are absent and no verified boot path exists.
- Preview live reload is explicitly described as “Simulated” and injects polling JavaScript into HTML.
- Seed course starter templates intentionally contain TODOs. This is expected product content, but must not be confused with incomplete platform implementation.
- UI fallback skill data in `learningController.getProjectProgress()` is static when no automation suggestions exist.

## 11. Missing Features

- Automated unit, integration, API contract, security, and browser tests.
- A single canonical course/task/progress data model or an explicit adapter boundary.
- Durable, versioned, transactional database migrations.
- Production-safe sandboxing for terminal and user code execution.
- Reliable preview authorization/token issuance.
- Password reset or account recovery flow beyond OTP resend behavior.
- Rate limiting for OTP, Google verification, AI, chat, terminal, and mutation endpoints.
- Formal API schema validation and consistent error envelope.
- Production deployment configuration with non-local URLs, secrets, health/readiness, and service dependencies verified.
- Verified active MCP, Redis/BullMQ, or PostgreSQL functionality.

## 12. Build & Runtime Issues

Verified:

- `npm run build` in `frontend` passes with Vite 5.4.21.
- Backend syntax checks pass for `server.js`, API/auth/FS/preview routes, workspace/terminal services, and learning controller.
- `npm start` in `backend` starts successfully and initializes SQLite.
- Node emits an experimental warning for `node:sqlite`.
- Frontend bundle is approximately 776 kB minified before gzip and triggers Vite's 500 kB chunk warning.
- `GROQ_API_KEY` is not set in the current backend environment, so default Groq AI operations fail.
- `npm ls @modelcontextprotocol/sdk bullmq ioredis pg --depth=0` reports none installed.

Unverified:

- Browser runtime behavior, WebSocket connection in the browser, real OTP delivery, Google OAuth, Groq/Ollama responses, Git credentials, Docker startup, and production build deployment.
- `npm test` and `npm run lint` are not available because no scripts exist.

Environment/checkout note: existing user changes were present before this audit in `backend/.env.example`, `backend/src/routes/api.js`, and `backend/src/routes/fs.js`. They were not reverted or modified.

## 13. API Integration Issues

| Integration | Current contract | Problem | Required action |
|---|---|---|---|
| Frontend API | Mostly relative `/api/v1` | `IdePage.jsx` hardcodes `http://localhost:3000` for download while backend defaults to 3001. | Centralize API base URL and use it for all HTTP/WebSocket/download paths. |
| Auth | JSON JWT bearer token | Token stored in localStorage; no refresh/revocation; 30-day token. | Define session lifecycle, expiry handling, and storage policy. |
| Groq | `groqClient.js` -> `db/claude.js` | Misleading Claude naming; missing key causes failure. | Rename/provider abstraction and return structured provider errors. |
| Ollama | Configured URL/model | No verified availability or timeout/fallback policy across all engines. | Add health check, timeout, provider fallback, and tests. |
| Google | tokeninfo endpoint | Audience validation is skipped if client ID is empty. | Require configured audience in production and validate issuer/email claims. |
| Email | Nodemailer SMTP | Missing credentials produce dev success and console OTP. | Fail closed outside explicit local mode; rate-limit and monitor delivery. |
| MCP | SDK imports | Package not declared/installed; no active route/config. | Either remove dormant integration or fully declare/configure/test it. |
| Git | shell `exec` | User URL interpolation and misleading success status. | Use argument-safe subprocess and strict validation. |
| Preview | unauthenticated file serving | Any caller can request a project workspace. | Add auth/signed token and ownership checks. |

## 14. Database Issues

1. `behavior_logs` schema and `learningController.analyzeBehavior()` disagree.
2. `hint_requests` schema and V2 hint ladder disagree.
3. `qa_reviews` schema and V2 QA persistence disagree.
4. `course_progress` has columns added only under conditional branches, so an existing database can miss later columns while migrations report success.
5. Migrations are executed during module import, are not versioned, and are not wrapped in a migration transaction.
6. Foreign keys exist but many logical relationships are not enforced, such as `hint_requests.task_id` and several mentor IDs.
7. There are no indexes visible for common user/project/task lookup patterns, despite high-frequency progress and conversation queries.
8. The project model contains legacy and V2 fields in one table without a documented state machine.
9. No uniqueness constraint prevents duplicate `course_progress` rows for the same project/task. The `ON CONFLICT(id)` clause therefore does not upsert the logical record.
10. No cleanup/retention policy exists for OTP requests, chat, command logs, or workspace content.

## 15. Authentication & Authorization Issues

- Server-level `authMiddleware` is correctly mounted before `/api/v1`; the inner `router.use` is redundant, not a bypass.
- `GET /api/v1/preview` is outside auth and lacks ownership checks.
- Some route handlers retrieve project/task IDs without consistently calling `verifyProjectAccess`, including progress, memory, current task, and several mentor/help paths.
- `POST /goals/confirm` passes a caller-supplied project ID to finalization without an explicit ownership check in that handler.
- `POST /projects/:id/chat` and `GET /projects/:id/chat` need a common project ownership/mentor authorization helper.
- Session WebSocket verifies a JWT using a different fallback secret and does not verify project ownership against the requested project ID.
- Terminal ownership is checked, but terminal access remains host-level execution.
- `/admin/extensions` GET is not explicitly guarded by `adminOnly`.
- `PUT /auth/role` manually authenticates and should use shared middleware plus server-side role policy.
- There is no OTP attempt limit, resend limit, account lockout, token revocation, or audit trail sufficient for production.
- The fixed `test@example.com` OTP is unsafe outside an isolated local test mode.

## 16. Security Issues

### Critical

- Host-level PowerShell/Bash PTY allows arbitrary code execution if an account/project is compromised; denylist filtering is not a sandbox.
- Unauthenticated preview can expose project files.
- Project/session authorization is inconsistent across routes and WebSockets.
- Secrets/defaults are present in environment configuration: `backend/.env` contains set sensitive values, and `backend/.env.example` also reports set values for key/secret/password fields. Values are intentionally not reproduced here. Rotate any real credentials and replace examples with placeholders.

### High

- JWT fallback secret is hardcoded in `backend/src/config.js`; session service uses a different fallback string.
- Git clone uses shell command interpolation.
- Base64 upload has no explicit decoded size/quota check.
- AI prompts receive active file/project content without a uniformly enforced size/redaction policy.
- Admin settings accept arbitrary keys/values.
- No rate limiting on authentication, AI, chat, or mutation endpoints.
- CORS uses a fixed localhost allowlist and does not use the documented `ALLOWED_ORIGINS` setting.

## 17. AI/ML Issues

Current classification: **PARTIAL / REAL when configured**.

- Active default provider is Groq through a module named `claude.js`; this is a naming and documentation defect.
- Ollama is a real alternate client but availability and fallback are unverified.
- Gemini is listed as a dependency/documented provider but is not part of the active `aiService` path.
- Prompt construction is distributed across engines, making token limits, system policy, and output validation inconsistent.
- JSON generation relies on model output parsing; malformed or partial responses need schema validation and retry behavior.
- `learningController` determines QA pass by substring matching for `pass` or `correct`, which can accept a negative sentence containing those words.
- There is no consistent provider timeout, retry/backoff, rate limit, cost budget, or correlation ID.
- Conversation history and active file content may grow without a hard context budget.
- AI-generated action plans can trigger terminal/file actions from `IdePage.jsx`; these require explicit validation, user confirmation for destructive actions, and server-side policy enforcement.
- Prompt injection defenses are described in documentation but must be tested against file contents and user messages rather than assumed from prompt text.

## 18. UI/UX Issues

- There are loading/error states in some pages, but coverage is inconsistent and several handlers use `alert()`.
- The app has no verified browser test for route redirects, rehydration, mentor flows, or IDE operations.
- Router state carries clarification/setup data, so browser refresh can lose the active flow.
- `applyResponse` can leave stale project/chat/milestone state when switching projects.
- `learningProcess` response expectations differ from the V2 controller response (`verdict` versus `action/feedback/passed`).
- IDE download and terminal URLs are not consistently derived from the configured backend origin.
- Large frontend bundle should be split after correctness is restored.
- Empty/fallback data is sometimes presented as real skill data.
- Accessibility, keyboard behavior, mobile IDE layout, and screen-reader semantics are unverified.

## 19. Code Quality Issues

- Legacy and V2 logic are mixed in `api.js` and share tables with incompatible assumptions.
- `wrap()` always returns 500 for unexpected errors, including database contract failures, without a stable error code or request ID.
- Several services are dynamically required inside handlers, obscuring dependency ownership.
- Console logging includes request details and development OTPs; structured redacted logging is needed.
- Empty catches and simulated polling hide failures.
- Duplicate/obsolete API surfaces exist, including multiple task submission and conversation models.
- `setupTerminalWS(wss, authenticate)` accepts an unused `authenticate` parameter.
- Unused or dormant imports and package claims indicate incomplete cleanup.
- No type/schema layer protects frontend/backend contracts.

## 20. Dependency Issues

- Backend source imports `@modelcontextprotocol/sdk`, `bullmq`, `ioredis`, and `pg`, but these are not declared in `backend/package.json` and are not installed in the current backend package.
- `@google/generative-ai` is declared but not used by the active provider selection.
- Frontend declares both scoped and unscoped xterm packages, which may duplicate functionality and increase bundle size.
- Root scripts use Windows `cd` chaining and are not portable to all shells.
- No engine version is declared even though Node built-in SQLite requires a sufficiently new Node release.
- No lint/test dependencies or scripts are present.

## 21. Complete Bug Matrix

| ID | Feature | Location | Status | Severity | Root cause | Fix |
|---|---|---|---|---|---|---|
| B-001 | V2 behavior log | `backend/src/engines/learningController.js` | BROKEN | CRITICAL | Insert columns absent from `behavior_logs`. | Migrate/schema-align and test fresh DB. |
| B-002 | V2 hint ladder | `learningController.js`, `database.js` | BROKEN | CRITICAL | `level`/`hint_text` absent. | Add canonical columns or use JSON/current schema. |
| B-003 | V2 QA persistence | `learningController.js` | BROKEN | CRITICAL | `passed`/`feedback` absent from `qa_reviews`. | Map to `verdict`/`feedback_text`; add state tests. |
| B-004 | V2 controller runtime | `learningController.js` | BROKEN | CRITICAL | `tracker` is not defined in `processSubmission`. | Import tracker once and test code path. |
| B-005 | Course static submit | `api.js` | BROKEN | CRITICAL | Calls nonexistent `getWorkspacePath`. | Consolidate submission service and method. |
| B-006 | Preview access | `server.js`, `preview.js` | BROKEN | CRITICAL | Public mount/no ownership. | Auth/signed preview and boundary-safe paths. |
| B-007 | Terminal isolation | `terminalService.js` | BROKEN/SECURITY | CRITICAL | Host PTY with denylist only. | Container/sandbox, quotas, allowlist policy. |
| B-008 | Session WebSocket auth | `socketService.js` | PARTIAL/SECURITY | CRITICAL | Different JWT fallback; no project ownership. | Shared auth verifier and project access check. |
| B-009 | Git clone | `fs.js` | BROKEN/SECURITY | HIGH | User URL interpolated into shell. | `execFile` argument array and validation. |
| B-010 | Git push | `fs.js` | BROKEN | HIGH | Failure returned as successful response. | Correct status/error contract. |
| B-011 | IDE download | `IdePage.jsx` | BROKEN in non-port-3000 setups | HIGH | Hardcoded localhost:3000. | Central URL helper. |
| B-012 | Ownership consistency | `api.js` | PARTIAL/SECURITY | HIGH | Several project/task handlers lack shared check. | Require `assertProjectAccess` everywhere. |
| B-013 | OTP security | `auth.js` | PARTIAL/SECURITY | HIGH | Fixed test OTP/dev console fallback/no limits. | Explicit local mode, limits, redacted logs. |
| B-014 | JWT defaults | `config.js`, `socketService.js` | PARTIAL/SECURITY | HIGH | Hardcoded and inconsistent secrets. | Require production secret; shared verifier. |
| B-015 | Missing integrations | `mcpService.js`, queue/redis, `pg.js` | INCOMPLETE | HIGH | Dependencies absent and no active wiring. | Remove or fully provision/test. |
| B-016 | API response contract | Dashboard/client/controller | PARTIAL | HIGH | `verdict` and `action` models differ. | Define and enforce versioned response schema. |
| B-017 | State refresh | `App.jsx`, `store/index.js` | PARTIAL | MEDIUM | Router-only state and stale Zustand values. | Persist/reload server state by project ID. |
| B-018 | Migration reliability | `database.js` | INCOMPLETE | HIGH | Conditional ad hoc migrations. | Versioned transactional migrations. |
| B-019 | Missing tests | root/backend/frontend | MISSING | HIGH | No scripts/suite. | Add test layers and CI commands. |
| B-020 | Bundle size | frontend build | PARTIAL | LOW | Single large chunk. | Route-level lazy loading/manual chunks. |

## 22. Root Cause Analysis

### Root cause group A: parallel product versions

The repository evolved from a legacy project/task engine into a V2 course engine. Tables, state names, response payloads, and service methods were extended in place rather than separated behind adapters. The result is code that is individually plausible but incompatible at runtime.

### Root cause group B: schema changes without migration discipline

`CREATE TABLE IF NOT EXISTS` does not update existing tables. Later columns are added via conditional checks during import, with related columns sometimes grouped under one condition. There is no migration version table, no migration transaction, and no fresh/old database compatibility test.

### Root cause group C: frontend contracts are implicit

The frontend client defines many endpoints and payloads manually, while pages also call `api.req()` and direct `fetch()`. This permits hardcoded origins, duplicate paths, and response-shape drift.

### Root cause group D: security added locally rather than at boundaries

Some FS and task paths validate ownership, but preview, WebSockets, mentor interventions, and several project reads do not share one mandatory authorization helper. Terminal safety is implemented as a command denylist rather than an execution boundary.

### Root cause group E: documentation and code diverged

Documentation claims Prisma, rate limiting, Claude/Gemini, sandboxing, and complete security hardening, while the source contains SQLite, Groq/Ollama, no rate-limit middleware, and host PTY execution. The source and runtime checks must become the authority.

## 23. Priority Matrix

| Priority | Meaning | Items |
|---|---|---|
| P0 | Blocker/security/data loss | B-001 through B-008, secret rotation, preview, terminal execution boundary |
| P1 | Major journey or reliability failure | B-009 through B-019, auth limits, migrations, API contracts |
| P2 | Important quality and maintainability | ownership audit completion, AI schema validation, error/loading coverage |
| P3 | Medium product quality | state refresh, admin validation, observability, accessibility |
| P4 | Polish/optimization | bundle splitting, cleanup, documentation refinements |

## 24. Fix Implementation Plan

### Phase 0 - Baseline & Environment

1. Record supported Node version, package-manager version, OS support, and required services.
2. Replace sensitive values in tracked example files with placeholders; rotate any real values found in `backend/.env` or other committed files.
3. Add explicit `engines`, `lint`, `test`, and `test:integration` scripts.
4. Decide whether Redis, BullMQ, MCP, PostgreSQL, Gemini, and Docker are supported now or deferred. Remove dormant imports if deferred.
5. Add a safe local fixture database/workspace for tests.
6. Preserve the current user edits in `backend/.env.example`, `backend/src/routes/api.js`, and `backend/src/routes/fs.js` while reviewing their intent before implementation.

Acceptance criteria: clean install is reproducible; backend and frontend commands are documented; no secret values are in tracked examples; unsupported integrations are explicitly marked.

### Phase 1 - Critical Infrastructure & Authorization

1. Create shared `assertProjectAccess(projectId, user, options)` and `assertTaskAccess(taskId, user)` helpers.
2. Apply them to every project/task/milestone/conversation/memory/progress/mentor route.
3. Add auth to preview or replace it with short-lived signed preview tokens tied to user/project/expiry.
4. Replace all JWT fallback secrets with required configuration in production and one shared verifier.
5. Protect role changes with shared auth middleware and server-side role policy.
6. Add rate limits and attempt counters for OTP, Google auth, AI, chat, and sensitive mutations.
7. Add stable 401/403/404/409 error codes without leaking internal messages.

Acceptance criteria: a user cannot read or mutate another user's project through HTTP, preview, or WebSocket; missing production secrets prevent startup; abuse tests pass.

### Phase 2 - Database & State Model

1. Choose canonical models: either adapt legacy tasks to V2 or isolate V2 course records behind a service. Do not let handlers issue cross-model SQL directly.
2. Add `schema_migrations` and numbered, idempotent migrations.
3. Add all required V2 columns deliberately, including completion/state fields, or rewrite handlers to existing names.
4. Add a logical unique constraint/index for `(project_id, task_id)` in `course_progress` and correct upsert conflict targets.
5. Add indexes for project owner, course task, progress, chat, and created-at lookups.
6. Define valid status transitions for project, task, course progress, and QA review.
7. Wrap plan finalization and submission updates in transactions.
8. Add fresh-database and upgrade-existing-database tests.

Acceptance criteria: a fresh database and a copy of the current database support the same tested API actions without “no such column” errors.

### Phase 3 - Core API Contract

1. Define request/response schemas for auth, goals, projects, tasks, course progress, QA, chat, and FS operations.
2. Use one API client/base-origin helper for HTTP, downloads, preview, and WebSockets.
3. Remove direct hardcoded `localhost:3000`/`:3001` usage from pages.
4. Consolidate duplicate chat routes and task submission routes.
5. Return one QA response shape, with explicit `action`, `passed`, `verdict`, `feedback`, and next-state fields.
6. Validate request bodies, IDs, path fields, lengths, encodings, and upload size before business logic.

Acceptance criteria: frontend client types/schemas match backend responses; all API URLs honor environment configuration; invalid requests return 4xx.

### Phase 4 - V2 Learning Engine

1. Import `progressTracker` explicitly into `learningController.js`.
2. Repair behavior persistence and map frontend fields to the canonical table.
3. Repair hint ladder storage and enforce per-user/per-task/project scope.
4. Repair QA review persistence using canonical `verdict`/`feedback_text` fields or a documented migration.
5. Implement explicit state transitions: pending -> in_progress -> awaiting_explanation -> completed, with failure retry behavior.
6. Scope behavior, progress, hints, and reviews to the authenticated user's project.
7. Replace substring QA pass detection with structured JSON schema validation and a conservative verdict.
8. Add deterministic tests for normal, suspicious, restricted, failed, passed, repeated-hint, and concurrent-submit cases.

Acceptance criteria: behavior, hint, code, and explanation actions work against a fresh DB; repeated submission cannot double-complete a task; every response renders correctly in DashboardPage.

### Phase 5 - Goal, Marketplace & Progress Flows

1. Add ownership validation to `/goals/confirm` before finalization.
2. Make plan generation/finalization transactional and idempotent.
3. Persist clarification/setup state server-side so refresh can recover.
4. Normalize course start, active project, current task, and progress pointers.
5. Remove or adapt the static course submission path so only one validator updates progress.
6. Ensure next-task and completed-project responses update frontend and backend pointers consistently.

Acceptance criteria: new project, clarification, plan confirmation, resume, course start, task completion, and project completion work after refresh.

### Phase 6 - IDE, FS, Git & Preview

1. Consolidate FS route variants and use `WorkspaceService` as the only path resolver.
2. Use `path.relative` boundary checks and reject absolute paths, traversal, symlinks, and protected files.
3. Add upload byte limits, workspace quotas, and content-type/encoding validation.
4. Replace shell interpolation in Git with `execFile`/`spawn` argument arrays, allowlisted URL schemes, timeout, and bounded output.
5. Return non-2xx on Git failures and persist command results consistently.
6. Implement authenticated preview with signed, expiring access and safe content handling.
7. Add integration tests for nested paths, traversal, sibling-prefix paths, symlinks, Git failures, and unauthorized projects.

Acceptance criteria: authorized users can edit/download/clone/push/preview their workspace; unauthorized and malicious paths fail safely.

### Phase 7 - Terminal & External Integrations

1. Decide the execution model: isolated container per job/project, or disable terminal execution in production.
2. Add CPU/memory/time/process/file/network limits and lifecycle cleanup.
3. Replace command denylist with server-side allowed operations where possible; never trust AI authorization strings as a sandbox.
4. Authenticate WebSocket upgrade before accepting connections and bind project ID to the authenticated user.
5. Fully provision or remove MCP/Redis/BullMQ/PostgreSQL integrations.
6. Add provider health, timeout, retry, fallback, and structured output handling for AI.

Acceptance criteria: no user command can access host secrets or unrelated projects; external integration startup is deterministic and documented.

### Phase 8 - UI & Error Handling

1. Replace `alert()` and console-only errors with shared inline/toast error states.
2. Add loading, retry, empty, unauthorized, and offline states to all major pages.
3. Make project switching clear all project-scoped state before applying new state.
4. Recover clarification/setup state from the server after refresh.
5. Ensure DashboardPage handles the canonical QA response and all action states.
6. Remove simulated/fallback data from user-facing “real” progress or label it clearly.

Acceptance criteria: every primary action has visible pending/success/failure behavior and no stale project data appears after navigation.

### Phase 9 - Security & Observability

1. Add structured redacted logs with request ID, user ID, project ID, and duration.
2. Add security headers, strict CORS from environment configuration, and safe production error responses.
3. Add audit logs for role changes, preview, terminal, Git, file mutations, and mentor access.
4. Add secret scanning to pre-commit/CI and rotate exposed credentials.
5. Add retention and deletion policies for OTPs, logs, chat, and workspaces.
6. Document threat model and sandbox assumptions.

Acceptance criteria: security tests cover auth bypass, IDOR, path traversal, command execution, secret leakage, rate limits, and error disclosure.

### Phase 10 - Testing & Final Verification

1. Unit-test engines/services and path/auth helpers.
2. Integration-test every API route with a disposable SQLite database.
3. Add migration upgrade tests from the current schema.
4. Add frontend component tests for auth, goal flow, dashboard QA, IDE, marketplace, and admin permissions.
5. Add Playwright smoke tests for login fixture, project creation, resume, course task, file edit, and logout.
6. Run clean install, lint, tests, production builds, and security scans in CI.

Acceptance criteria: critical journeys are automated, CI is reproducible, and no P0/P1 issue remains.

## 25. File-by-File Modification Plan

| File | Current purpose | Problem | Required change | Priority |
|---|---|---|---|---|
| `backend/src/db/database.js` | SQLite schema/migrations | Ad hoc incomplete migrations and missing V2 columns | Add versioned migrations, constraints, indexes, transactions | P0 |
| `backend/src/engines/learningController.js` | V2 behavior/scaffold/QA controller | SQL mismatch and undefined `tracker` | Align schema, import tracker, enforce state machine | P0 |
| `backend/src/routes/api.js` | Most business routes | Mixed models and inconsistent ownership/contracts | Split services, shared access checks, canonical responses | P0/P1 |
| `backend/src/server.js` | Express/WebSocket entrypoint | Public preview, fixed CORS, upgrade auth gaps | Secure preview, config-driven CORS, upgrade auth | P0 |
| `backend/src/routes/preview.js` | Static project preview | No auth/ownership and weak path boundary | Signed/authenticated preview and safe resolver | P0 |
| `backend/src/services/terminalService.js` | PTY terminal | Host-level execution and denylist | Isolated runner or disable production terminal | P0 |
| `backend/src/services/socketService.js` | Project realtime socket | Different JWT fallback/no project binding | Shared auth/project authorization | P0 |
| `backend/src/routes/fs.js` | File/Git APIs | Shell interpolation, inconsistent errors, quota gaps | Safe subprocess, validation, consistent errors | P1 |
| `backend/src/services/workspaceService.js` | Workspace path/file operations | Boundary checks and API naming need one contract | Canonical resolver and quota/symlink rules | P1 |
| `backend/src/routes/auth.js` | OTP/Google/role auth | No rate limits, fixed test OTP, manual auth duplication | Harden auth and shared middleware | P1 |
| `backend/src/config.js` | Environment config | Hardcoded secrets/defaults and provider ambiguity | Validate production config, normalize origins/providers | P1 |
| `frontend/src/api/client.js` | API wrapper | Relative base only; pages bypass it | Central origin, error schema, upload/download helpers | P1 |
| `frontend/src/pages/IdePage.jsx` | IDE workflow | Hardcoded port and direct API/WS calls | Use client helpers and canonical contracts | P1 |
| `frontend/src/pages/DashboardPage.jsx` | Main task workflow | V2 response mismatch and weak error UX | Adapt to canonical QA state and error handling | P1 |
| `frontend/src/App.jsx` | Rehydration/routing | Router state loss and stale recovery | Server-backed flow recovery | P1 |
| `frontend/src/store/index.js` | Global state | Project switch/stale chat state | Explicit project reset and scoped state | P2 |
| `backend/src/services/groqClient.js`, `backend/src/db/claude.js` | AI provider shim | Misleading names and weak provider contract | Rename/abstract provider and structured results | P1 |
| `backend/src/services/mcpService.js` | MCP client | Undeclared dependency/incomplete lifecycle | Fully provision or remove | P2 |
| `backend/src/services/queue.js`, `redis.js`, `db/pg.js` | Optional infrastructure | Not installed/not wired | Decide support and make deterministic | P2 |
| `backend/package.json` | Backend dependencies/scripts | Missing imported packages; no tests/lint/engine | Declare supported deps and scripts | P1 |
| `frontend/package.json` | Frontend deps/scripts | No tests/lint and duplicate xterm families | Add checks and remove unused duplicates | P2 |
| `README.md`, `FEATURE_IMPLEMENTATION.md`, `PROJECT_SUMMARY.md`, `PRE_COMMIT_AUDIT_REPORT.md` | Product/setup claims | Claims exceed actual implementation | Update after fixes to match source/runtime | P2 |
| `TODO.md` | Known work list | Stale/partially implemented status | Reconcile with this plan | P2 |

Actions: **MODIFY** the files above as needed. **CREATE** shared authorization, migration, validation, test, and config files described below. **DELETE/RENAME** none until usage analysis confirms a dormant module can be retired.

## 26. New Files Required

Recommended files:

- `backend/src/middleware/projectAccess.js` - shared project/task ownership checks.
- `backend/src/middleware/requestValidation.js` - request schema validation.
- `backend/src/services/courseProgressService.js` - one canonical V2 progress/state service.
- `backend/src/services/previewTokenService.js` - expiring preview authorization if preview remains enabled.
- `backend/src/services/processRunner.js` - safe argument-based subprocess execution.
- `backend/src/db/migrations/001_initial_contract.sql` and subsequent numbered migrations, or an equivalent migration runner.
- `backend/test/` API, service, migration, and security tests.
- `frontend/src/api/config.js` or equivalent URL helper.
- `frontend/src/components/ErrorState.jsx` and shared loading/notification primitives.
- `frontend/test/` component and browser smoke tests.
- `.github/workflows/ci.yml` or the repository's equivalent CI configuration.

Do not create files for optional MCP/Redis/PostgreSQL support until the support decision in Phase 0 is made.

## 27. Database Changes

Required before V2 work can be considered functional:

- Make behavior event fields match the controller, preferably with explicit numeric fields and validation.
- Add hint ladder fields (`level`, `hint_text`) or rewrite the service to use a separate canonical hint table.
- Map QA writes to `verdict`, `feedback_text`, `failed_checks`, and related existing fields.
- Add `completed_at`, `failure_consistency`, `last_error_hash`, and `interventions_count` through independent migrations where needed.
- Add unique `(project_id, task_id)` to `course_progress` and change upsert logic to target it.
- Add indexes for `projects.user_id`, `course_progress.project_id/task_id`, chat project/user, and task/milestone lookups.
- Add migration version tracking and run migrations atomically.
- Verify foreign keys and define delete behavior for all project-owned records.

No database change was made during this audit.

## 28. API Contract Changes

Standardize all responses around:

```json
{
  "success": true,
  "action": "retry|next|explain|completed",
  "passed": false,
  "verdict": "pass|fail|partial",
  "feedback": [],
  "data": {},
  "error": null,
  "requestId": "..."
}
```

Use a versioned contract if legacy clients must continue to work. Do not silently accept arbitrary project IDs, task IDs, admin settings, file paths, or AI action objects.

## 29. Environment Variable Changes

Required/documented variables should include:

- `NODE_ENV`
- `PORT`
- `FRONTEND_URL` / `ALLOWED_ORIGINS`
- `JWT_SECRET` with production startup failure when absent or weak
- `DB_PATH` or an explicit database provider setting
- `LLM_PROVIDER`, `GROQ_API_KEY`, `OLLAMA_BASE_URL`, `LOCAL_MODEL`
- Google client ID and, if needed, issuer/audience settings
- SMTP host/port/user/password/from
- `WORKSPACE_PATH`
- Redis/BullMQ variables only if that infrastructure is enabled
- Preview signing secret only if signed previews are retained

Never commit actual values. The current audit detected set sensitive fields in `backend/.env` and `backend/.env.example`; rotate real credentials and replace example values with placeholders without recording values in this plan.

## 30. Testing Strategy

Minimum test layers:

- Unit: path boundary, ownership, auth token verification, command policy, provider response parsing, behavior scoring, scaffold progression.
- Database: fresh schema, current-schema upgrade, foreign keys, unique progress upsert, transaction rollback.
- API integration: auth, goals, resume, course start, course submit, learning process, chat, FS, Git failure, preview, mentor/admin authorization.
- WebSocket: terminal/session auth, ownership, disconnect cleanup, malformed messages, origin/deployment behavior.
- Frontend: login, rehydration, goal clarification, dashboard submission, error/loading states, IDE URL construction.
- Browser E2E: student journey from login fixture through completion; mentor intervention; admin authorization.
- Security: IDOR matrix, path traversal/symlink, command injection, secret leakage, rate limit, oversized upload, prompt/action injection.

Every bug in the matrix should receive a regression test before implementation is marked complete.

## 31. End-to-End Verification Checklist

- [ ] Clean install completes for the documented Node version.
- [ ] Backend starts with required configuration and fails safely when production secrets are absent.
- [ ] Frontend production build succeeds without unexpected errors.
- [ ] Lint and automated tests pass.
- [ ] Health/readiness checks report database and required provider status.
- [ ] Student can request and verify OTP with rate limits.
- [ ] Google login validates configured audience and issuer.
- [ ] Session survives refresh and expires/redirects correctly.
- [ ] Student submits a goal and recovers clarification after refresh.
- [ ] AI generates a plan or returns a clear provider error.
- [ ] Plan confirmation verifies project ownership and is idempotent.
- [ ] Marketplace listing and course start create the correct project/workspace.
- [ ] Dashboard loads the correct current task and real progress.
- [ ] Behavior logging succeeds against a fresh and upgraded database.
- [ ] Hints progress, cap, and persist correctly.
- [ ] Code QA and explanation QA use one response/state contract.
- [ ] Task completion cannot be double-applied.
- [ ] Project completion updates all pointers and UI state.
- [ ] File CRUD, nested paths, upload, download, rename, and delete work.
- [ ] Git clone/push safely handle success and failure.
- [ ] Preview requires authorized access and cannot traverse or expose protected files.
- [ ] Terminal is isolated or disabled in production, with resource limits.
- [ ] Session/terminal WebSockets enforce project ownership.
- [ ] Chat, memory, progress, mentor, builder, and admin routes enforce access.
- [ ] AI provider timeout/fallback/output validation works.
- [ ] No critical browser console/network errors occur in primary flows.
- [ ] Docker/deployment configuration is verified, if supported.
- [ ] Documentation matches actual implementation.

## 32. Acceptance Criteria

The implementation is acceptable only when:

- V2 learning operations produce no SQL schema errors.
- All project/task data access is authorized by authenticated identity.
- Preview, Git, uploads, and terminal cannot cross project or host boundaries.
- Frontend and backend share one tested API contract.
- Login, goal planning, course/legacy task completion, IDE, mentor, and logout flows work end to end.
- AI failures are explicit, bounded, retried only where safe, and never interpreted by unsafe substring checks.
- Fresh and existing databases migrate successfully.
- Critical journeys have automated regression coverage.

## 33. Risks & Possible Regressions

- Consolidating legacy and V2 task models may break existing seeded data; migration/backfill must be tested first.
- Tightening preview/terminal authorization may break current local demo flows; provide explicit local-development configuration rather than bypasses.
- Removing dormant providers/packages may conflict with undocumented deployment expectations; inventory consumers before deletion.
- Changing QA response shapes requires coordinated frontend/backend rollout or a temporary compatibility adapter.
- Rotating secrets invalidates existing sessions and external integrations.
- Adding unique progress constraints may expose duplicate rows that require a one-time cleanup migration.
- Sandboxing terminal execution may change available commands and require course template updates.
- AI output validation may increase latency and reject previously accepted ambiguous responses; this is preferable to silent incorrect progression but needs UX messaging.

## 34. Recommended Implementation Order

1. Rotate/remove secrets and establish supported environment/runtime.
2. Add migration framework and repair V2 schema contracts.
3. Add shared auth/ownership checks, including preview and WebSockets.
4. Repair V2 learning controller and canonical progress state machine.
5. Consolidate course/legacy submission and response contracts.
6. Fix frontend URL/state/response mismatches.
7. Harden FS/Git/upload and decide terminal sandbox strategy.
8. Stabilize AI provider abstraction and dormant integration decisions.
9. Add unit/integration/security/browser tests.
10. Update documentation, optimize bundle, and complete production verification.

## 35. Definition of Done

AQ is production-ready only when:

- Clean installation, lint, tests, and production builds pass.
- Core student, mentor, and admin journeys work end to end.
- No P0 or P1 issue remains open.
- Authentication, session expiry, role authorization, and project ownership are verified.
- API contracts and database schemas are consistent and migration-tested.
- Critical security issues, secret exposure, IDOR, preview exposure, command execution, and unsafe Git execution are resolved.
- Terminal/code execution is genuinely isolated or intentionally disabled outside local development.
- AI integrations have bounded context, structured output validation, timeout/retry/fallback behavior, and safe action handling.
- Loading, empty, error, and unauthorized UI states are implemented for primary workflows.
- Critical flows have automated regression tests and browser smoke coverage.
- Environment configuration and deployment prerequisites are documented without secrets.
- No important product feature is accidentally mocked or described beyond its implementation.
- Documentation reflects the actual source and verified runtime behavior.

---

## Audit Summary

```text
AQ CODEBASE AUDIT COMPLETE

Working Features: 8 (verified at build/start/source level; not full E2E certified)
Partially Working: 13
Broken: 7
Mock/Placeholder: 3
Missing: 4
Incomplete/Unknown: 3

Critical Issues: 8
High Priority Issues: 12
Medium Priority Issues: 6
Low Priority Issues: 1

Implementation Plan:
FIX_IMPLEMENTATION_PLAN.md

Source code modified: NO
```
