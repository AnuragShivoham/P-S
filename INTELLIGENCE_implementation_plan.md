# SOCRATES Labour Intelligence: Complete Engineering & Architecture Specification

**Document Version:** 2.0.0 (Comprehensive Engineering Specification)  
**Repository:** `AnuragShivoham/P-S`  
**Status:** Approved Technical Plan with 6-Gate Implementation Roadmap  
**Scope:** Trustworthy AI Extraction, Safe Automated Ingestion, Durable Scheduling, 3-Level RBAC, and Role-Specific UI Workflows (Student, Institution, Employer, Admin) with Zero Dashboard Regressions.

---

## 1. Reported Baseline & Verification (Gate 1)

### 1.1 Verified Capabilities in Active Repository
- **Persistence Driver:** Direct Node.js native SQLite driver (`node:sqlite`) initialized with WAL mode and foreign key enforcement (`backend/src/db/database.js`).
- **Core Processing Engines:**
  - `backend/src/engines/labourIntelligenceEngine.js`: Layered JD processing (regex section parsing, experience extraction, deterministic alias normalization, ontology registry).
  - `backend/src/engines/competencyGapEngine.js`: Gap evaluator matching student projects and verified evidence against market competency criteria, generating automated project upgrade milestones.
- **Route Mount:** `backend/src/server.js` mounts the router at `/api/v1/labour` with `optionalAuth` middleware.
- **Existing Baseline Test Suite:** `backend/tests/labour_intelligence_test.js` passes 13/13 tests verifying:
  - Canonical ontology normalization (Docker variations, OOP, DSA, Observability).
  - JD text segmentation & experience extraction.
  - Requirement matrix ingestion & multi-signal counts.
  - Duplicate signal detection via hash & URL.
  - Human validation review workflow.
  - Gap evaluation across 3 core student scenarios.
  - Milestone project upgrades, verified evidence store, and employer placement feedback.

### 1.2 Audited Gaps Being Closed
1. **AI Extraction Transparency:** Extraction failure currently logs a console warning and falls back silently to regex rules. The API responses must attach unambiguous provenance & execution metadata (`llm` vs `deterministic_fallback`).
2. **Ingestion Lifecycle & Security:** No production-grade HTTP/RSS fetcher with SSRF prevention (DNS rebinding, private IP blocks, redirect controls, response limits, XXE defense), persistent run lease-locks, and durable retry limits.
3. **Multi-Tenant Scoping & 3-Level Authorization:** Scoping database queries strictly to `req.user.id`, verified `institution_memberships`, and consented profiles rather than trusting client IDs.
4. **Role Workflow Specialization:** Replacing the monolithic 2,147-line UI tab layout with clean, dedicated views tailored to Student (Pathly), Institution (TieOpp), Employer (TalentsForce), and Admin (Dataloka), leaving existing dashboards untouched.

---

## 2. Precise Operational States & Metadata Contract

### 2.1 Operational State Definitions
To eliminate ambiguity between connectivity, credentials, and inference quality:

| Signal / State | Diagnostic Verification | Meaning in System |
| :--- | :--- | :--- |
| `provider_connected` | TCP/TLS handshake to LLM host | Network connectivity established |
| `provider_authenticated` | API key validation probe | Credentials are valid and active |
| `extraction_request` | Response from inference engine | Request delivered to LLM |
| `output_validated` | JSON schema conformance test | Output contains required fields and valid types |
| `fallback_active` | Deterministic rules executed | Output derived from rules, NOT live LLM |
| `end_to_end_ready` | Full pipeline operational | Extraction, canonicalization, and matrix update passed |

### 2.2 Unambiguous Extraction Metadata Contract
Every extraction result returned by `processAndIngestSignal` or `/api/v1/labour/signals/ingest` attaches this standard block:

```json
{
  "extraction_engine": "llm", // "llm" | "deterministic_fallback"
  "provider_status": {
    "provider": "groq", // "groq" | "ollama" | "local"
    "model": "openai/gpt-oss-120b",
    "connected": true,
    "authenticated": true,
    "fallback_active": false,
    "fallback_reason": null
  },
  "provenance": {
    "source_url": "https://careers.example.com/jobs/123",
    "source_hash": "a8f5c...sha256",
    "retrieval_timestamp": "2026-10-17T14:30:00Z",
    "parser_version": "2.0.0",
    "canonical_signal_id": "sig_1729158...",
    "is_duplicate": false
  },
  "confidence_score": 0.94,
  "validation_passed": true
}
```

*Rule:* If `fallback_active` is `true`, `extraction_engine` is strictly `"deterministic_fallback"`. UI displays an ambient Degraded Mode warning informing the user that deterministic rules processed the input.

---

## 3. Data Architecture, Schema & Migration Design (Gate 2)

### 3.1 New & Extended Persistence Structures
Migrations are declared non-destructively in `backend/src/db/labour_schema.js` via `ensureLabourColumns` and `initLabourSchema`.

```sql
-- Source Feed Registry with schedule and provider type
CREATE TABLE IF NOT EXISTS source_feeds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'job_description',
  url TEXT NOT NULL,
  organization TEXT,
  provider TEXT DEFAULT 'rss', -- 'rss', 'json_api', 'manual'
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'error', 'archived'
  polling_interval_minutes INTEGER DEFAULT 1440,
  last_run_at TEXT,
  last_status TEXT DEFAULT 'idle',
  error_count INTEGER DEFAULT 0,
  approved_by TEXT REFERENCES users(id),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Durable Ingestion Runs with Run-Level & Record-Level Lifecycle
CREATE TABLE IF NOT EXISTS source_ingestion_runs (
  id TEXT PRIMARY KEY,
  feed_id TEXT REFERENCES source_feeds(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  status TEXT DEFAULT 'queued', -- 'queued', 'running', 'success', 'duplicate', 'failed'
  items_discovered INTEGER DEFAULT 0,
  items_ingested INTEGER DEFAULT 0,
  items_duplicated INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  run_started_at TEXT,
  run_finished_at TEXT,
  duration_ms INTEGER DEFAULT 0,
  error_summary TEXT,
  run_log TEXT DEFAULT '[]', -- JSON array of checkpoint messages
  created_at TEXT DEFAULT (datetime('now'))
);

-- Employer Job Requisitions (Scoped to Employer Organizations)
CREATE TABLE IF NOT EXISTS employer_job_postings (
  id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL REFERENCES users(id),
  organization TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES roles_ontology(id),
  title TEXT NOT NULL,
  location TEXT DEFAULT 'Remote Eligible',
  required_skills TEXT DEFAULT '[]', -- JSON array of canonical skill_ids
  preferred_skills TEXT DEFAULT '[]', -- JSON array of canonical skill_ids
  min_experience_years REAL DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'closed', 'draft'
  signal_id TEXT REFERENCES industry_signals(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Candidate Consent for Evidence Sharing
CREATE TABLE IF NOT EXISTS student_evidence_shares (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  grantee_type TEXT NOT NULL, -- 'institution', 'employer', 'public'
  grantee_id TEXT, -- user_id or institution_id (NULL if public)
  purpose TEXT DEFAULT 'placement_verification',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performant scoped lookups
CREATE INDEX IF NOT EXISTS idx_signals_source_hash ON industry_signals(source_hash);
CREATE INDEX IF NOT EXISTS idx_signals_source_url ON industry_signals(source_url);
CREATE INDEX IF NOT EXISTS idx_requirements_role ON labour_requirements(role_id);
CREATE INDEX IF NOT EXISTS idx_requirements_skill ON labour_requirements(skill_id);
CREATE INDEX IF NOT EXISTS idx_evidence_learner ON competency_evidence_store(learner_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_feed ON source_ingestion_runs(feed_id);
```

### 3.2 Provenance & Demand Lineage
Each row in `labour_requirements` maintains foreign key `signal_id REFERENCES industry_signals(id)` and `evidence_quote`. Every signal preserves:
- Canonical `source_url` and normalized canonical URL.
- `source_hash` = SHA-256 of `(normalized_url | organization | role_title | clean_body)`.
- If an existing signal has matching hash or URL, `is_duplicate = 1` and `canonical_signal_id` points to original.
- **Zero Double-Counting:** Duplicate signals are rejected before updating `labour_requirements` counts (`job_signal_count`).

---

## 4. Ingestion Security, Parsing & Durable Scheduling (Gate 3)

### 4.1 Safe Fetcher & SSRF Defense (`backend/src/services/sourceIngestionService.js`)
To prevent SSRF, DNS rebinding, and denial of service:
1. **Protocol Restriction:** Only `http:` and `https:` schemes allowed. No `file:`, `gopher:`, or local protocol schemes.
2. **Private & Loopback IP Blacklist:**
   - IPv4: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16` (Cloud metadata endpoint `169.254.169.254`), `0.0.0.0/8`.
   - IPv6: `::1`, `fc00::/7`, `fe80::/10`.
   - Pre-flight DNS resolution inspects resolved IPs before initiating TCP connection.
3. **Redirect Limits:** Maximum 3 redirects; each redirect destination is re-validated through the IP blacklist.
4. **Response Bounds:** Enforce `maxContentLength` of 2 MB (2,097,152 bytes) and 10,000 ms timeout via `AbortController`.
5. **XML Defense:** RSS XML parser configured with `sax`/regex or non-expansive DOM parser; disable DTD processing and external entity resolution (`no-xxe`).

### 4.2 Durable Scheduler & Crash Recovery
- **Lease Lock:** When an ingestion run begins, `status` is set to `'running'` with `run_started_at`.
- **Worker Crash Recovery:** On server startup, any runs stuck in `'running'` for > 30 minutes are marked `'failed'` with error `Worker restart recovery: job timed out or crashed`.
- **Bounded Retries:** Feeds encountering transient network errors increment `error_count` up to 3 times before setting feed status to `'error'`.
- **Concurrency Isolation:** An atomic `UPDATE source_feeds SET last_status = 'running' WHERE id = ? AND last_status != 'running'` ensures multiple workers never fetch the same feed simultaneously.

---

## 5. 3-Level RBAC & Scoped API Routes (Gate 4)

### 5.1 The 3-Level Authorization Framework
1. **Level 1 — Role Authorization:** Verified via `requireRole('student', 'university', 'employer', 'admin')`.
2. **Level 2 — Resource Ownership:**
   - Student can only read/mutate their own profile & projects (`req.user.id === studentId`).
   - Employer can only edit or view requisitions created by their own user or organization.
3. **Level 3 — Data-Scope Authorization:**
   - Institutions query student aggregates ONLY for students who have an active row in `institution_memberships` for that university.
   - Employers can view detailed student evidence ONLY if the student has published or consented to sharing.
   - Default-deny on all unlisted operations.

### 5.2 Structured Route Organization

```
/api/v1/labour
  ├── /health/provider                     GET (All: Safe diagnostic probe)
  ├── /market
  │     ├── /trends                        GET (Public/Auth: Aggregate demand)
  │     ├── /ontology/skills               GET (Public/Auth: Canonical skills)
  │     └── /ontology/roles                GET (Public/Auth: Canonical roles)
  ├── /student
  │     ├── /profile                       GET (Student: Own competency profile)
  │     ├── /gap-analysis                  POST (Student: Own gap evaluation)
  │     └── /upgrade-project               POST (Student: Attach IDE upgrade to own project)
  ├── /institution
  │     ├── /analytics                     GET (University/Admin: Campus ERI & Department trends)
  │     └── /curriculum-reviews            GET (University/Admin: Gaps & curriculum recommendations)
  ├── /employer
  │     ├── /requisitions                  GET/POST (Employer/Admin: Own job requisitions)
  │     ├── /candidates                    GET (Employer/Admin: Verified candidate explorer)
  │     └── /feedback                      POST (Employer/Admin: Placement outcome feedback)
  └── /admin
        ├── /source-feeds                  GET/POST (Admin: Configure feeds)
        ├── /source-feeds/:id/trigger      POST (Admin: Run ingestion)
        ├── /source-ingestion-runs         GET (Admin: View run history & logs)
        └── /requirements/:id/review       POST (Admin/Mentor: Human review on emerging skills)
```
*Note:* Legacy endpoints (`/signals`, `/requirements`, `/evidence`, etc.) remain mounted as secure backward-compatible aliases.

---

## 6. Role-Based Dedicated UI Views (Gate 5)

### 6.1 Dashboard Preservation Guarantee
- `DashboardPage.jsx` (Student Dashboard), `UniversityDashboardPage.jsx` (Institution Dashboard), and `AdminPage.jsx` (Admin Dashboard) **remain completely untouched in their core layout and behavior**.
- If a dashboard lacks an entry point, only a clean, non-intrusive action button `[📊 Labour Intelligence →]` is added.
- The dedicated role workflows are rendered cleanly at `/labour-intelligence`.

### 6.2 Specialized View Implementations
1. **Student View (`StudentLabourView.jsx`) — Pathly Mockup Reference:**
   - Current Skills matrix cards categorized by proficiency (`beginner`, `intermediate`, `advanced`).
   - Counter tags for each skill showing Certificates, IDE Projects, and Courses.
   - Personal Gap Analysis drawer showing target role readiness and 1-click "Upgrade Project in IDE".
2. **Institution View (`InstitutionLabourView.jsx`) — TieOpp Mockup Reference:**
   - Campus ERI Average KPI Card (e.g., 68/100, +4 pts year-on-year).
   - Placement Rate (72%, +5%), Strongest Competency, Critical Gap.
   - Six Campus Competencies comparison (Problem Solving, Technical, Soft Skills, Communication, Domain Knowledge, Industry Readiness).
   - Department Performance bar chart (CS/IT, ECE, Mech, Civil, Mgmt, Chem) and 5-Year Longitudinal trend.
3. **Employer View (`EmployerLabourView.jsx`) — TalentsForce Mockup Reference:**
   - Metric header: Total Profiles with Skills, Total Jobs Requiring Skills, Total Hired.
   - Requisitions vs Candidate Profiles comparison chart.
   - Job Requisition creator and candidate match cards with verified IDE test artifacts.
   - Candidate Placement Feedback modal closing the loop into industry signals.
4. **Admin View (`AdminLabourView.jsx`) — Dataloka Mockup Reference:**
   - Data Sources table with platform badges (RSS, JSON API, Webhook, Manual).
   - Schedules (`Manual`, `Daily at 00:00`), Owner tags, Last Run timestamp, Status badges (`Success`, `Completed (warnings)`, `Failed`).
   - Add Source Feed modal, Ingestion Run History drawer, and Live Provider Health badge.

For multi-role users (e.g. Admin or Mentor), a top role-preview bar allows toggling between Student, Institution, Employer, and Admin views without altering backend security.

---

## 7. Metrics & Analytics Calculation Definitions

- **ERI (Employability Readiness Index) Average:**
  $$\text{ERI} = \frac{1}{N} \sum_{i=1}^N \left( \sum_{s \in S} w_s \cdot \text{proficiency\_score}(i, s) \right)$$
  Where $S$ is the set of required market skills for target role, $w_s$ is market demand weight, and proficiency is 100 for `VERIFIED`, 70 for `ASSESSED`, 40 for `OBSERVED`, and 20 for `CLAIMED`.
- **Student Coverage Percentage:**
  $$\text{Coverage \%} = \frac{\text{Count of enrolled students with VERIFIED evidence in skill}}{\text{Total active enrolled students}} \times 100$$
- **Placement Rate:**
  $$\text{Placement Rate \%} = \frac{\text{Placed students in cohort window}}{\text{Total eligible graduating students in cohort}} \times 100$$

---

## 8. Test Matrix & Release Gates (Gate 6)

### 8.1 Expanded Test Suite (`backend/tests/labour_rbac_test.js`)
1. **Authentication & RBAC:**
   - Unauthenticated request to `/api/v1/labour/student/profile` -> `401 Unauthorized`.
   - Student accessing another student's evidence record -> `403 Forbidden`.
   - Employer attempting to add an ingestion feed -> `403 Forbidden`.
   - Non-admin attempting to access source ingestion runs -> `403 Forbidden`.
   - Institution accessing analytics -> Scoped only to students of that institution.
2. **Ingestion & Fetcher Security:**
   - Request to `http://127.0.0.1:8080/feed` -> `400 Blocked: Private/loopback target`.
   - Request to `http://169.254.169.254/latest/meta-data` -> `400 Blocked: Metadata target`.
   - Ingesting duplicate feed items -> `duplicate` status, zero increment in `job_signal_count`.
3. **Provider Health & Fallback Transparency:**
   - Probe when key is missing/invalid -> Returns `status: 'degraded'`, `fallback_active: true`.
   - Extraction execution -> Metadata accurately reflects `extraction_engine: 'deterministic_fallback'`.
4. **Regression Guarantee:**
   - Existing 13/13 tests in `labour_intelligence_test.js` continue to pass.
   - Frontend bundle compiles cleanly (`npm run build`).

---

## 9. Phased Execution Order

1. **Gate 1:** Verify repository baseline and run existing test suite (Completed: 13/13 tests pass).
2. **Gate 2:** Update `labour_schema.js` with non-destructive migrations (feeds, runs, employer jobs, indexes).
3. **Gate 3:** Implement `sourceIngestionService.js` (safe fetcher, RSS/JSON parsers, deduplication, scheduler) and update `claude.js` + `labourIntelligenceEngine.js` with health probe and extraction metadata.
4. **Gate 4:** Implement 3-level RBAC middleware and structured route handlers in `labourIntelligence.js`.
5. **Gate 5:** Create modular frontend role views (`StudentLabourView`, `InstitutionLabourView`, `EmployerLabourView`, `AdminLabourView`) and update `LabourMarketPage.jsx`.
6. **Gate 6:** Add `backend/tests/labour_rbac_test.js`, execute test suite, run frontend build, and verify release readiness.
