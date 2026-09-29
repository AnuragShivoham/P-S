# SOCRATES Technical Documentation Suite

This directory contains the authoritative technical, architectural, and operational documentation for the SOCRATES platform.

See docs/ for full documentation:

PRD.md — Product requirements
ARCHITECTURE.md — Repository structure and module boundaries
PLAN.md — Build roadmap (phases 0–11)
BACKEND_SCHEMA.md — Data shapes and JSON schemas
APP_FLOW.md — UI page flow and states
TRD.md — Technical requirements and dependency audit
AI_RULES.md — Non-negotiable engineering rules
Key Features

Key Features

1. Dual-Pipeline Execution:
- Pipeline A (Direct Project Track): Goal intake, multi-round technical clarification interview, deterministic milestones, daily tasks with starter templates, and Socratic hints in an embedded Monaco IDE.
- Pipeline B (Civic Innovation Track): Community problem reporting with geospatial mapping and magic-byte media verification, AI feasibility analysis, mentor problem adoption, student team formation, requirements traceability, and real-world impact tracking.

2. Labour-Market Intelligence and Competency Alignment:
- Ingestion of industry job signals, skill normalization via SkillOntology, human review by faculty and industry experts, student baseline gap analysis, project upgrades with targeted milestones, and evidence recording.

3. Embedded Monaco Cloud IDE and Sandboxed Terminal:
- Multi-file code editor paired with a real-time pseudoterminal (node-pty and xterm.js) over WebSocket, strictly sandboxed to ./workspace/<projectId> with command filtering denylists.

4. Anti-Cheat and Physical Typing Guards:
- Clipboard paste event interception on Monaco code inputs to ensure active code typing, supplemented by keystroke cadence analysis.

5. Progressive Socratic Hint Ladder:
- Tier 1 (Concept) to Tier 2 (Direction) to Tier 3 (Partial skeleton with TODO markers). Complete copy-paste solutions are not provided.

6. Dual-Axis QA Critic:
- Rigorous evaluation of student code against technical correctness and citizen requirement satisfaction.
