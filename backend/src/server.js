require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// ══════════════════════════════════════════════════════
// BIND PORT IMMEDIATELY — Render needs this within 60s
// ══════════════════════════════════════════════════════
const PORT = parseInt(process.env.PORT, 10) || 10000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ContractorOS Pro API');
  console.log('  Port: ' + PORT);
  console.log('  Env:  ' + (process.env.NODE_ENV || 'dev'));
  console.log('  Time: ' + new Date().toISOString());
  console.log('');
});

server.on('error', (err) => {
  console.error('SERVER FAILED TO START:', err.message);
  process.exit(1);
});

// ── MIDDLEWARE ────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(null, false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api/', limiter);

// ── HEALTH CHECK (always available, even if DB is down) ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '3.0.0', port: PORT, timestamp: new Date().toISOString() });
});

// ── LOAD ROUTES SAFELY ───────────────────────────────
const safeRequire = (path, name) => {
  try {
    return require(path);
  } catch (err) {
    console.error('Failed to load route ' + name + ': ' + err.message);
    const stub = express.Router();
    stub.all('*', (req, res) => res.status(503).json({ error: name + ' service unavailable' }));
    return stub;
  }
};

app.use('/api/auth',           safeRequire('./routes/auth', 'auth'));
app.use('/api/company',        safeRequire('./routes/company', 'company'));
app.use('/api/customers',      safeRequire('./routes/customers', 'customers'));
app.use('/api/estimates',      safeRequire('./routes/estimates', 'estimates'));
app.use('/api/projects',       safeRequire('./routes/projects', 'projects'));
app.use('/api/invoices',       safeRequire('./routes/invoices', 'invoices'));
app.use('/api/materials',      safeRequire('./routes/materials', 'materials'));
app.use('/api/subcontractors', safeRequire('./routes/subcontractors', 'subcontractors'));
app.use('/api/labor-roles',    safeRequire('./routes/laborRoles', 'laborRoles'));
app.use('/api/time-entries',   safeRequire('./routes/timeEntries', 'timeEntries'));
app.use('/api/change-orders',  safeRequire('./routes/changeOrders', 'changeOrders'));
app.use('/api/expenses',       safeRequire('./routes/expenses', 'expenses'));
app.use('/api/email',          safeRequire('./routes/email', 'email'));
app.use('/api/users',          safeRequire('./routes/users', 'users'));

// ── ERROR HANDLER ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── CATCH UNHANDLED ERRORS (don't crash) ─────────────
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
