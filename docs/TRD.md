# Technical Requirements Document (TRD) & Dependency Audit — SOCRATES

## 1. System Runtime Requirements

- **Backend Runtime:** Node.js `>= 22.12.0` (Mandatory: requires native `node:sqlite` DatabaseSync support).
- **Package Manager:** `npm` `>= 10.0.0`.
- **Operating Systems Supported:** Windows 10/11, macOS, Ubuntu / Debian Linux.
- **Frontend Build Toolchain:** Node.js + Vite 5 + ES Modules (`type: module`).

---

## 2. Dependency Audit & Manifest Verification

### 2.1 Backend Dependencies (`backend/package.json`)

| Package | Version | Purpose | Audit Notes |
|---|---|---|---|
| `express` | `^4.19.2` | Core HTTP API routing and middleware framework | Active; powers all `/api/v1` routes |
| `jsonwebtoken` | `^9.0.3` | Token generation and signature verification (HS256) | Active; handles 30-day bearer auth |
| `node-pty` | `^1.1.0` | Spawning and managing native pseudoterminal processes | Active; powers `/api/v1/terminal` WebSocket |
| `ws` | `^8.19.0` | High-performance WebSocket server | Active; multiplexes terminal and session streams |
| `nodemailer` | `^8.0.2` | SMTP delivery for passwordless login OTPs | Active; configured via `EMAIL_HOST` in `.env` |
| `archiver` | `^7.0.1` | Creating streaming ZIP archives of project workspaces | Active; powers `/api/v1/fs/download-zip` |
| `uuid` | `^9.0.1` | Generating cryptographic UUIDv4 identifiers | Active; entities and task identifiers |
| `cors` | `^2.8.6` | Cross-Origin Resource Sharing control | Active; whitelists Vite dev server origins |
| `dotenv` | `^16.4.5` | Loading environment configurations from `.env` | Active; loaded at application startup |
| `@google/generative-ai` | `^0.21.0` | Gemini LLM provider integration | Available for Gemini multimodal tasks |
| `nodemon` *(dev)* | `^3.1.4` | Process monitor for backend hot-reloading | Development script utility |

#### Cleaned / Deprecated Dependencies
- **`better-sqlite3`**: Removed. Completely replaced by native `node:sqlite` (`DatabaseSync`), removing external C++ compiler requirements (`node-gyp`, Python, Visual C++).
- **`pg`**: Removed. Uninstalled external database driver originally present in speculative draft files. Native SQLite WAL mode provides performant local concurrency.
- **`ioredis` & `bullmq`**: Removed. Replaced by lightweight in-memory task queues and native WebSocket pub/sub.

---

### 2.2 Frontend Dependencies (`frontend/package.json`)

| Package | Version | Purpose | Audit Notes |
|---|---|---|---|
| `react` | `^18.3.1` | Declarative UI component library | Active |
| `react-dom` | `^18.3.1` | DOM renderer for React | Active |
| `react-router-dom` | `^6.23.1` | Client-side routing, route parameters, navigation | Active; powers SPA routing |
| `@monaco-editor/react` | `^4.7.0` | Embedded VS Code Monaco editor | Active; primary code editor in `/ide` |
| `@xterm/xterm` / `xterm` | `^6.0.0` / `^5.3.0` | Terminal emulator rendering ANSI and VT100 streams | Active; interactive terminal UI |
| `@xterm/addon-fit` | `^0.11.0` | Responsive canvas geometry autosizing for terminal | Active; handles terminal window resizes |
| `zustand` | `^4.5.4` | Unopinionated centralized reactive state store | Active; manages auth, project, and session |
| `lucide-react` | `^0.577.0` | Modern SVG icons | Active |
| `@react-oauth/google` | `^0.13.4` | Google Identity Services OAuth button and token flow | Active; Google login integration |
| `vite` *(dev)* | `^5.3.4` | Fast ESM development server and Rollup bundler | Active; builds to `frontend/dist` |
| `@vitejs/plugin-react` *(dev)* | `^4.3.1` | Fast Refresh and JSX transformation for React | Active |

---

## 3. Environment Variables Specification

All configuration is grounded in `backend/.env.example`:

| Variable | Type | Default | Description |
|---|---|---|---|
| `PORT` | Integer | `3001` | Backend HTTP and WebSocket server listening port |
| `LLM_PROVIDER` | String | `groq` | Primary LLM engine provider (`groq` or `ollama`) |
| `GROQ_API_KEY` | String | *Required* | API authentication key for Groq Cloud |
| `GROQ_MODEL` | String | `openai/gpt-oss-120b` | Model name for Groq inferences |
| `OLLAMA_BASE_URL` | String | `http://localhost:11434` | Endpoint for local Ollama server |
| `LOCAL_MODEL` | String | `phi3:mini` | Model name when running in local Ollama mode |
| `DB_PATH` | Path | `./data/socrates.db` | Relative or absolute path to SQLite database file |
| `JWT_SECRET` | String | `socrates-secret-...` | Secret key for signing and validating JWT tokens |
| `EMAIL_HOST` | String | `smtp.gmail.com` | SMTP host for OTP dispatch |
| `EMAIL_PORT` | Integer | `587` | SMTP port |
| `EMAIL_USER` | String | `""` | SMTP username |
| `EMAIL_PASS` | String | `""` | SMTP password / app password |
| `ADMIN_EMAILS` | String | `vermaanni2003@gmail.com` | Comma-separated list of whitelisted admin emails |
| `ENABLE_SOCIETAL_PROBLEMS`| String | `true` | Feature-flag kill switch for Pipeline B routes |

---

## 4. Security Architecture & Boundary Verification

1. **Path Traversal Guards (`backend/src/routes/fs.js`, `workspaceService.js`):**
   ```javascript
   function sanitizePath(projectId, userPath) {
     const root = path.resolve(WORKSPACE_DIR, projectId);
     const safeTarget = path.resolve(root, '.' + path.normalize('/' + userPath));
     const rel = path.relative(root, safeTarget);
     if (rel.startsWith('..') || path.isAbsolute(rel)) {
       throw new Error('Access denied: Path traversal detected.');
     }
     return safeTarget;
   }
   ```
2. **Command Denylist Guard (`backend/src/services/terminalService.js`):**
   - Intercepts incoming terminal commands before PTY dispatch.
   - Denylist blocks commands containing:
     - `rm -rf /` or recursive deletion targeting root/system
     - `mkfs`, `dd if=/dev/zero`
     - Fork bombs: `:(){ :|:& };:`
     - Reverse shell commands: `nc -e`, `bash -i >& /dev/tcp/`
3. **Magic-Byte Media Validation (`backend/src/services/mediaService.js`):**
   - Inspects the leading binary bytes of buffers uploaded via `POST /api/v1/media/upload`.
   - Validates signatures:
     - PNG: `89 50 4E 47 0D 0A 1A 0A`
     - JPEG: `FF D8 FF`
     - WebP: `52 49 46 46` ... `57 45 42 50`
     - MP4: `66 74 79 70`
   - Rejects unverified executables or scripts uploaded with masked extensions.
