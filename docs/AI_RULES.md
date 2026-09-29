# Non-Negotiable AI & Engineering Rules — SOCRATES

To protect pedagogical authenticity and platform integrity, all engines, services, and developers working on SOCRATES must strictly obey the following core engineering rules.

---

## Rule 1: No Direct Code Dumps (The Socratic Principle)
- **Engine Constraint:** AI engines (`guidedExecution`, `mentorEngine`, `taskPlanner`) must **NEVER** return a complete, copy-pasteable solution for student tasks.
- **Hint Ladder Progression:**
  - **Tier 1 (Concept):** Explain the theoretical mechanism, design pattern, or algorithm in conceptual terms.
  - **Tier 2 (Structural Direction):** Provide architectural breakdown, method signatures, pseudo-code, and documentation pointers.
  - **Tier 3 (Partial Skeleton):** Provide skeleton code with function declarations and explicit `TODO` markers. Maximum 10 lines of scaffold code.
- **Enforcement:** Automated response filters reject responses containing complete function implementations exceeding the skeleton limit.

---

## Rule 2: Strict Starter Templates with TODO Comments
- **Constraint:** All generated tasks must include a `starter_template` containing only structural scaffolding and explicit `// TODO:` directives.
- **Bad Example:**
  ```javascript
  // Disallowed: Fully implemented endpoint
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  ```
- **Required Example:**
  ```javascript
  // Allowed: Scaffold requiring student implementation
  const express = require('express');
  const app = express();

  // TODO: Add express.json() middleware
  // TODO: Implement GET /health returning { status: 'ok' }
  // TODO: Start server on process.env.PORT or 3001

  module.exports = app;
  ```

---

## Rule 3: Verifiable Competency Progression
- **Constraint:** A student skill or competency status (`MISSING`, `IN_PROGRESS`, `VERIFIED`) can **ONLY** be transitioned to `VERIFIED` when backed by verified task execution and passing QA scores.
- Unearned, manual, or purely time-based skill promotions are prohibited.
- Every competency verification must record a corresponding row in `competency_evidence` referencing the project ID, task ID, and artifact verification timestamp.

---

## Rule 4: Anti-Cheat & Physical Typing Enforcement
- **Constraint:** Students must type implementations themselves to build genuine muscle memory and conceptual mastery.
- **Mechanisms:**
  - Frontend Monaco editor actively blocks clipboard paste events (`paste`, `beforeinput`, `Ctrl+V`, `Cmd+V`, `Shift+Insert`).
  - `behaviorEngine.js` tracks keystroke cadence to detect automated paste simulations.
  - Submissions failing cadence validation flag the task for mentor review.

---

## Rule 5: Architecture Immutability & Version Tracking
- **Constraint:** System architectures generated for Pipeline B projects cannot be silently overwritten.
- Any revision or refinement produces a new incremental version (`v1`, `v2`, etc.) in the `project_architecture` table.
- A project must maintain a permanently traceable history of architectural changes linked to mentor approvals.

---

## Rule 6: Dual-Axis QA Validation
- **Constraint:** Code evaluation via `qaCritic.js` must measure two distinct axes:
  1. **Technical Correctness:** Does the code run, handle edge cases, follow language conventions, and pass syntax validation?
  2. **Requirement Fidelity:** Does the implementation satisfy the specific citizen or user requirement (`REQ-xx`) it was mapped to?
- Passing threshold is strictly enforced at `>= 0.70` (70%).

---

## Rule 7: Zero Fabricated Claims & Grounded Metrics
- **Constraint:** No platform documentation, AI reasoning, or marketing output may claim unverified benchmarks, fake user counts, non-existent database drivers, or simulated industry partnerships.
- All numbers displayed in the impact dashboard (`project_impact_metrics`) must distinguish between `estimated_value` and `actual_value` verified by field telemetry or mentor sign-off.
