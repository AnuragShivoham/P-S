# SOCRATES Backend Security Hardening Plan

Scope: reduce unauthenticated access and cross-user project/data exposure while keeping the current React + Express + SQLite + WebSocket architecture. This is a staged hardening plan, not a claim that the backend is now safe for unrestricted public production use.

## Phase 1 — Immediate exposure controls (implemented in this change)

- Reject invalid/expired bearer tokens in optional-auth routes rather than treating them as anonymous.
- Prevent self-service sign-up/login and `/auth/role` from assigning mentor, university, or admin privileges. Keep privileged role assignment behind the authenticated `/api/v1/admin/users/:id/role` operation and the whitelisted admin login flow.
- Use cryptographically secure OTP generation, keep the fixed test OTP outside production, avoid logging OTP values after production mail failures, and throttle OTP/admin login attempts.
- Remove the unused generic account-creation endpoint and make user-profile reads self/admin-only.
- Keep Labour Intelligence ontology/market reads public; require appropriate roles for signal ingestion, requirement review, evidence verification, employer/curriculum views and feedback. Restrict student evidence to the student or staff roles; scope project upgrades to the project owner; remove demo identity fallbacks from those write paths.
- Require project membership for project-extension endpoints, project previews, and collaboration WebSocket sessions. The socket membership check runs before a room is joined or chat history is returned.
- Enforce the same project ownership/team checks across core project, task, and milestone API IDs; constrain student evidence queries to the caller's own records.
- Protect goal confirmation, task guidance, session context, mentor interventions, and collaboration sockets against project-ID substitution. Require assigned mentor privileges before session lock/hint/leave actions.
- Require approved browser origins for WebSocket connections whenever an Origin header is present.
- Issue five-minute project preview tokens and check authorization on every file request. Use path-relative filesystem containment checks and reject symlink escapes.
- Require authentication for media uploads, restrict private uploaded-file reads to the uploader/reviewer roles, only allow authors to attach their own uploads to problems, keep published-problem media public, and apply per-user file-count/storage quotas.
- Require project managers for team/policy changes; scope member/application updates to their URL project. Enforce supported access policies and deny institution-restricted applications until membership verification exists.
- Reject filesystem symlinks in project paths, canonicalize protected-file deletion checks, and call Git with argument arrays rather than shell-interpolated commands.
- Run the Docker app as an unprivileged Node user after persistent-disk ownership setup. Force-disable host-process PTY terminal in production; do not enable it until a per-project sandbox is implemented.
- Keep demo personas, sample competency/evidence, and sample market signals off unless `ENABLE_DEMO_SEED_DATA=true` is explicitly set for a disposable demo/test database.
- Restrict public societal-problem discovery to published records and require reviewer roles for AI analysis. Employer candidate PII/feedback is currently admin-only until a verified employer role/workflow is implemented.

## Phase 2 — Verification before connecting production users

- Run `node backend/tests/security_regression_test.js` on a machine with backend dependencies installed. It launches a disposable production-mode backend with a temporary SQLite database and checks public reads, role escalation, cross-user access, preview tokens, media uploads, and terminal disablement.
- Run the existing labour suite with a disposable `DB_PATH`: `node backend/tests/labour_intelligence_test.js`.
- Run `node backend/scripts/audit_privileged_roles.js` with `DB_PATH` pointing to production for aggregate counts. Add `--show-users` only for private identity-level review. Manually verify historical privileged accounts; no roles are changed automatically.
- Confirm Render has `NODE_ENV=production`, a generated 32+ character `JWT_SECRET`, `ENABLE_TERMINAL=false`, persistent disk paths, `FRONTEND_URL=https://p-s-khaki.vercel.app`, and only required secrets.
- Review API and WebSocket logs for authorization denials; do not log bearer tokens or secrets.

## Phase 3 — Remaining high-priority work (not implemented here)

1. **Isolate terminal execution:** PTY remains disabled. If required, move sessions to per-project containers/VMs with non-root identities, only project files mounted, no database/secrets, restricted environment variables, CPU/memory/process limits, network policy, timeouts, and teardown. Command filters are not a sandbox.
2. **Continue route review:** project/task/session, filesystem, Labour Intelligence, problem, and extension routes received explicit guards, but penetration testing and route-by-route ownership tests are still needed before claiming comprehensive coverage.
3. **Harden account provisioning:** add an auditable invitation/approval workflow for mentor and university accounts, protect admin login with rate limiting/MFA, and remove or disable development/test authentication shortcuts in production.
4. **Harden uploads:** add global request rate limiting, content scanning if appropriate, cleanup/retention policies, and a migration/backup strategy for the persistent disk. Current quota is per-user, not global rate limiting.
5. **Preview origin isolation:** serve user-authored preview HTML from a separate origin with restrictive CSP/sandboxing before enabling arbitrary untrusted content with sensitive application data.
6. **Production security tests:** add WebSocket authorization tests, role/ownership tests for each route family, path traversal/symlink cases on supported operating systems, and CI execution of these suites.

## Deployment gate

The public Render backend should not be treated as production-ready solely because regression tests pass. Terminal is force-disabled in production, and the Docker app runs as non-root; keep terminal off until per-project isolation exists. Complete the privileged-role audit and full security review before exposing real-user data. Institution-restricted applications are denied because no verifiable institution-membership schema currently exists.
