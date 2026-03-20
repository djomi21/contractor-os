require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/company');
const customerRoutes = require('./routes/customers');
const estimateRoutes = require('./routes/estimates');
const projectRoutes = require('./routes/projects');
const invoiceRoutes = require('./routes/invoices');
const materialRoutes = require('./routes/materials');
const subRoutes = require('./routes/subcontractors');
const roleRoutes = require('./routes/laborRoles');
const timeRoutes = require('./routes/timeEntries');
const coRoutes = require('./routes/changeOrders');
const expenseRoutes = require('./routes/expenses');
const emailRoutes = require('./routes/email');
const userRoutes = require('./routes/users');

const app = express();

// ── MIDDLEWARE ────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS — allow Vercel frontend to talk to Render backend
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
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

// ── ROUTES ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/estimates', estimateRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/subcontractors', subRoutes);
app.use('/api/labor-roles', roleRoutes);
app.use('/api/time-entries', timeRoutes);
app.use('/api/change-orders', coRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/users', userRoutes);

// ── HEALTH CHECK ─────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '3.0.0', timestamp: new Date().toISOString() }));

// ── ERROR HANDLER ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
```

(Render's default port is 10000, not 4000)

Save the file, then push to GitHub:
```
git add .
git commit -m "Fix Render port binding"
git push
```

Render will auto-redeploy. Watch the logs — you should see:
```
ContractorOS Pro API — Port 10000
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║  ContractorOS Pro API — Port ${PORT}    ║`);
  console.log(`  ║  Environment: ${(process.env.NODE_ENV || 'dev').padEnd(20)}║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
});
