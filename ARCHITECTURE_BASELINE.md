# P-S Architecture Baseline (R0)

## Overview
**AMIT-BODHIT (P-S)** is an AI-powered project mentoring and skill acceleration platform combining project planning, code editing, terminal execution, live learning scaffolding, and automated QA reviews.

---

## 1. System Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    React + Vite Frontend                   │
│                                                             │
│  • Zustand Store (Auth, Project, Milestones, Current Task)  │
│  • Monaco Code Editor + Virtual FS Tree Sync                │
│  • Xterm.js Interactive Terminal                            │
│  • ProgressPanel, ExtensionHub, WebPreview, ExplainModal   │
└──────────────┬───────────────────────────────┬──────────────┘
               │ HTTP REST (fetch)             │ WebSocket (ws)
               ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Node.js + Express Backend                 │
│                                                             │
│  • REST API: /api/v1 (auth, goals, projects, tasks, fs)     │
│  • WebSockets:                                              │
│      - /api/v1/terminal (node-pty terminal streaming)       │
│      - /api/v1/session (project rooms, chat, live sync)     │
│  • DB: Node 22 native node:sqlite (WAL mode)                │
└──────────────┬──────────────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────────────┐
│                     P-S AI Engines Layer                    │
│                                                             │
│  • goalClarifier.js      → Intent extraction & Q&A clarify   │
│  • milestoneGenerator.js → Roadmap & feature milestones     │
│  • taskPlanner.js        → Daily tasks with partial starter │
│  • mentorEngine.js       → Socratic tutor & secure guidance │
│  • qaCritic.js           → Automated submission grader      │
│  • learningController.js → Scaffold levels & hint control   │
│  • workspaceService.js   → Sandboxed project filesystem     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Existing Entities & State

### Database Schema (SQLite: `./data/amitbodhit.db`)
- `users`: User profiles, role (`student`, `mentor`, `admin`), active project pointers, skills.
- `projects`: Primary project record (`raw_goal`, `title`, `tech_stack`, `scope`, `deadline_days`, `status`, `is_course`, `course_id`).
- `milestones`: Ordered milestones belonging to a project (`duration_days`, `measurable_output`, `status`).
- `tasks`: Actionable sub-tasks under a milestone (`commands`, `folder_structure`, `starter_template`, `concepts_taught`, `status`, `attempts`).
- `qa_reviews`: Graded attempts on tasks (`verdict`, `score`, `passed_checks`, `failed_checks`, `corrections`, `feedback_text`).
- `courses`, `course_milestones`, `course_tasks`, `course_progress`: V2 Course curriculum engine.
- `workspace_files`: Virtual filesystem files stored per project.
- `chat_history`: Per-project mentor/student chat turns.

---

## 3. Existing Project Creation & Execution Workflow

1. **Goal Submission**: Student enters raw goal (`POST /goals/submit`).
2. **Clarification**: `goalClarifier.js` runs up to rounds of Q&A or infers parameters (`POST /goals/clarify`).
3. **Milestone Generation**: `milestoneGenerator.js` creates a milestone sequence (`POST /goals/confirm`).
4. **Task Decomposition**: `taskPlanner.js` breaks the first unlocked milestone into daily tasks with starter templates.
5. **IDE Execution**: Student writes code in Monaco, runs terminal commands via sandboxed `node-pty`.
6. **AI Mentor Assistance**: Contextual guidance provided via `mentorEngine.js` with denylist security filters.
7. **QA Submission**: Student submits work; `qaCritic.js` grades the workspace files and outputs pass/partial/fail.

---

## 4. Preservation Invariants

All new features added in `feature/societal-problems` must strictly respect:
1. **Zero Breaking Changes**: Existing `projects`, `milestones`, `tasks`, and `courses` flow must remain 100% functional.
2. **Single Project Truth**: Societal problems convert into regular P-S projects via `projects.problem_id` rather than duplicating the project engine.
3. **Rollback Safety**: Switching back to `main` (`git checkout main`) restores the untouched baseline instantly.
