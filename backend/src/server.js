require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const config = require('./config');
const apiRouter = require('./routes/api');
const fsRouter = require('./routes/fs');
const authRouter = require('./routes/auth');
const authMiddleware = require('./middleware/auth');
const { setupTerminalWS } = require('./services/terminalService');
const { handleConnection, initHeartbeat } = require('./services/socketService');
const previewRouter = require('./routes/preview');
const problemsRouter = require('./routes/problems');
const projectExtensionsRouter = require('./routes/projectExtensions');
const mediaRouter = require('./routes/media');
const optionalAuth = require('./middleware/optionalAuth');

if (process.env.NODE_ENV === 'production' &&
    (!process.env.JWT_SECRET ||
      process.env.JWT_SECRET.length < 32 ||
      ['socrates-secret-change-in-prod', 'change-this-to-a-random-secret'].includes(process.env.JWT_SECRET))) {
  throw new Error('Set JWT_SECRET to a random value of at least 32 characters in production.');
}

const app = express();
app.set('trust proxy', 1);

const defaultOrigins = process.env.NODE_ENV === 'production' ? [] : [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5174',
  'http://127.0.0.1:5174'
];

const envOrigins = [
  config.FRONTEND_URL,
  ...(Array.isArray(config.ALLOWED_ORIGINS) ? config.ALLOWED_ORIGINS : [])
].filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server, health checks)
    if (!origin) return callback(null, true);

    // In production, only explicit allowlist members are accepted. No broad
    // wildcard preview domains or implicit Vercel-host matching.
    if (allowedOrigins.includes(origin)) return callback(null, true);

    console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Debug Middleware: Log all requests
app.use((req, res, next) => {
  const url = new URL(req.originalUrl, 'http://localhost');
  const segments = url.pathname.split('/');
  if (segments[1] === 'api' && segments[2] === 'v1' && segments[3] === 'preview' && segments.length > 5) {
    segments[5] = '[redacted]';
  }
  console.log(`[REQUEST] ${req.method} ${segments.join('/')}`);
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'SOCRATES', version: '1.0.0' }));
app.use('/api/v1/preview', previewRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/media', optionalAuth, mediaRouter);

const labourRouter = require('./routes/labourIntelligence');

// Societal Problems Feature Mount (with feature-toggle kill switch)
if (process.env.ENABLE_SOCIETAL_PROBLEMS !== 'false') {
  app.use('/api/v1/problems', optionalAuth, problemsRouter);
  app.use('/api/v1/projects', authMiddleware, projectExtensionsRouter);
}

// Labour-Market Intelligence & Competency Alignment Feature Mount
app.use('/api/v1/labour', optionalAuth, labourRouter);

app.use('/api/v1/fs', authMiddleware, fsRouter);
app.use('/api/v1', authMiddleware, apiRouter);

app.use((req, res) => res.status(404).json({ error: `Not found: ${req.method} ${req.path}` }));
app.use((err, req, res, next) => {
  console.error(err);
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  res.status(500).json({ error: message });
});

const server = http.createServer(app);

// WebSocket Routing
const terminalWss = new WebSocketServer({ noServer: true });
const projectWss = new WebSocketServer({ noServer: true });

setupTerminalWS(terminalWss);
projectWss.on('connection', handleConnection);
initHeartbeat(projectWss);

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const origin = request.headers.origin;
  console.log(`[UPGRADE] ${pathname}`);

  if (origin && !allowedOrigins.includes(origin) &&
      !(config.ALLOW_VERCEL_PREVIEWS && origin.endsWith('.vercel.app'))) {
    socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }

  if (pathname === '/api/v1/terminal') {
    if (!config.ENABLE_TERMINAL) {
      socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    terminalWss.handleUpgrade(request, socket, head, (ws) => {
      terminalWss.emit('connection', ws, request);
    });
  } else if (pathname === '/api/v1/session') {
    projectWss.handleUpgrade(request, socket, head, (ws) => {
      projectWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(config.PORT, () => {
  console.log(`
 ╔══════════════════════════════════════╗
 ║  SOCRATES Backend                    ║
 ║  http://localhost:${config.PORT}              ║
 ╚══════════════════════════════════════╝`);
});
