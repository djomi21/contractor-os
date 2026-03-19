# ContractorOS Pro — Deployment Guide

## Architecture Overview

```
contractor-os-deploy/
├── docker-compose.yml          ← One-command production deploy
├── frontend/
│   ├── Dockerfile              ← Builds React → Nginx
│   ├── nginx.conf              ← SPA routing + API proxy
│   ├── vite.config.js          ← Dev server + API proxy
│   ├── index.html
│   ├── package.json
│   ├── public/favicon.svg
│   └── src/
│       ├── main.jsx            ← React entry point
│       └── App.jsx             ← ContractorOS (4,059 lines)
├── backend/
│   ├── Dockerfile              ← Node.js API
│   ├── .env.example            ← Environment template
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma       ← 14 tables, all relations
│   │   ├── seed.js             ← Demo data seeder
│   │   └── migrations/
│   │       └── 001_init/
│   │           └── migration.sql ← Raw SQL (no Prisma needed)
│   └── src/
│       ├── server.js           ← Express entry point
│       ├── middleware/auth.js   ← JWT + role-based access
│       └── routes/
│           ├── auth.js          ← Login / Signup / Password
│           ├── email.js         ← SMTP email sending
│           ├── company.js       ← Company CRUD
│           ├── customers.js     ← Customer CRUD
│           ├── estimates.js     ← Estimate CRUD
│           ├── invoices.js      ← Invoice CRUD
│           ├── projects.js      ← Project CRUD
│           ├── materials.js     ← Material CRUD
│           ├── subcontractors.js ← Sub CRUD
│           ├── laborRoles.js    ← Labor Role CRUD
│           ├── timeEntries.js   ← Time Entry CRUD
│           ├── changeOrders.js  ← Change Order CRUD
│           ├── expenses.js      ← Expense CRUD
│           └── users.js         ← User management
└── scripts/                     ← Helper scripts
```

---

## OPTION A: Docker Deploy (Recommended — 3 Commands)

### Prerequisites
- Docker & Docker Compose installed
- Ports 3000, 4000, 5432 available

### Steps

**Step 1 — Clone and configure:**
```bash
cd contractor-os-deploy

# Create production .env
cp backend/.env.example backend/.env

# Edit .env — CHANGE THESE VALUES:
nano backend/.env
```

Change these values in `.env`:
```
DATABASE_URL="postgresql://contractor_user:PICK_A_STRONG_PASSWORD@db:5432/contractor_os?schema=public"
JWT_SECRET="run: openssl rand -hex 32"
```

Also create a root `.env` for Docker Compose:
```bash
echo 'DB_PASSWORD=SAME_PASSWORD_AS_ABOVE' > .env
echo 'JWT_SECRET=SAME_JWT_SECRET_AS_ABOVE' >> .env
echo 'FRONTEND_URL=http://your-domain.com:3000' >> .env
```

**Step 2 — Build and launch:**
```bash
docker compose up -d --build
```

**Step 3 — Seed the database (first time only):**
```bash
docker compose exec backend node prisma/seed.js
```

**Done!** Open http://localhost:3000

Login: `jason@jbconstruction.com` / `contractor123`

### Useful Docker commands:
```bash
docker compose logs -f backend     # Watch API logs
docker compose logs -f db          # Watch DB logs
docker compose down                # Stop everything
docker compose down -v             # Stop + delete data
docker compose exec backend npx prisma studio  # DB GUI on :5555
```

---

## OPTION B: Manual Deploy (No Docker)

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm or yarn

### Step 1 — Create the PostgreSQL database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Run these SQL commands:
CREATE USER contractor_user WITH PASSWORD 'your_password_here';
CREATE DATABASE contractor_os OWNER contractor_user;
GRANT ALL PRIVILEGES ON DATABASE contractor_os TO contractor_user;
\q
```

### Step 2 — Set up the backend

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env
# Set DATABASE_URL to: postgresql://contractor_user:your_password@localhost:5432/contractor_os?schema=public
# Set JWT_SECRET to: (run: openssl rand -hex 32)

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed demo data
node prisma/seed.js

# Start the server
npm run dev    # Development (with auto-reload)
npm start      # Production
```

The API will be running on http://localhost:4000

### Step 3 — Set up the frontend

```bash
cd frontend

# Install dependencies
npm install

# Development mode (with API proxy to :4000)
npm run dev

# OR build for production
npm run build
# Serve the dist/ folder with Nginx, Apache, or any static host
```

The app will be running on http://localhost:3000

### Step 4 — Login

Open http://localhost:3000

**Default credentials:**
- Email: `jason@jbconstruction.com`
- Password: `contractor123`

---

## Database Migrations

### Initial Migration (001_init)

The initial migration creates all 14 tables:

| Table | Records | Description |
|-------|---------|-------------|
| Company | Company profile, SMTP, theme settings |
| User | Auth, roles (Owner/Admin/PM/Estimator/Foreman/Bookkeeper/Field Tech/Read Only) |
| Customer | CRM with tags, property type, lead source |
| Estimate | Line items (JSON), discount, tax, status workflow |
| Project | Budget tracking, progress, phase management |
| Invoice | Payment tracking, aging, status workflow |
| Material | Inventory with cost/markup/stock/reorder |
| Subcontractor | Company, role, wage/billable rates |
| TimeEntry | Hours logged per sub per project |
| LaborRole | 50 trade roles with payroll + benefits burden |
| ChangeOrder | Approval workflow, labor/material amounts |
| Expense | Categorized with receipt tracking |
| EmailLog | Audit trail for all sent emails |

### Running migrations manually (without Prisma)

If you prefer raw SQL instead of Prisma:
```bash
psql -U contractor_user -d contractor_os -f backend/prisma/migrations/001_init/migration.sql
```

### Future migrations

To create new migrations when you modify `schema.prisma`:
```bash
cd backend
npx prisma migrate dev --name describe_your_change
```

This auto-generates a new SQL file in `prisma/migrations/`.

To apply migrations in production:
```bash
npx prisma migrate deploy
```

### Resetting the database (WARNING: deletes all data)

```bash
npx prisma migrate reset --force
node prisma/seed.js
```

---

## Production Checklist

### Security
- [ ] Change default password in seed.js before deploying
- [ ] Set a strong JWT_SECRET (64+ random chars)
- [ ] Set a strong DB_PASSWORD
- [ ] Enable HTTPS (use Cloudflare, Let's Encrypt, or your host's SSL)
- [ ] Set FRONTEND_URL to your actual domain
- [ ] Remove or restrict Prisma Studio in production

### SMTP Email Setup
- [ ] Go to Company Setup → Email & Notifications
- [ ] Enter your SMTP credentials (Gmail App Password, SendGrid, etc.)
- [ ] Click "Send Test" to verify delivery
- [ ] Customize email templates for estimates and invoices

### Performance
- [ ] Enable gzip in Nginx (already configured)
- [ ] Set up PostgreSQL connection pooling for high traffic
- [ ] Consider adding Redis for session caching

### Backups
```bash
# Backup database
pg_dump -U contractor_user contractor_os > backup_$(date +%Y%m%d).sql

# Restore database
psql -U contractor_user contractor_os < backup_20260319.sql

# Docker backup
docker compose exec db pg_dump -U contractor_user contractor_os > backup.sql
```

### Hosting Recommendations
- **VPS**: DigitalOcean ($12/mo), Railway, Render
- **Managed DB**: Supabase (free tier), Neon, Railway Postgres
- **Frontend only**: Vercel, Netlify (free) — point API to your backend host
- **Full stack**: Railway (easiest), Fly.io, AWS Lightsail

---

## Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DATABASE_URL | Yes | — | PostgreSQL connection string |
| JWT_SECRET | Yes | — | 64+ char random string for auth tokens |
| JWT_EXPIRES_IN | No | 7d | Token expiry (e.g., 7d, 24h) |
| PORT | No | 4000 | Backend API port |
| NODE_ENV | No | development | Set to "production" for prod |
| FRONTEND_URL | No | http://localhost:3000 | For CORS whitelist |
| SMTP_HOST | No | — | Fallback SMTP host |
| SMTP_PORT | No | 587 | Fallback SMTP port |
| MAX_FILE_SIZE_MB | No | 5 | Max upload size |

---

## Troubleshooting

**"Cannot connect to database"**
→ Check DATABASE_URL, ensure PostgreSQL is running, verify user/password

**"CORS error in browser"**
→ Set FRONTEND_URL in backend .env to match your frontend URL exactly

**"JWT invalid"**
→ Ensure JWT_SECRET is the same across restarts (don't regenerate in prod)

**"Email sending failed"**
→ For Gmail: use an App Password (not your regular password). Enable 2FA first, then generate at myaccount.google.com → Security → App Passwords

**"Prisma migration failed"**
→ Run `npx prisma migrate reset --force` to start fresh, then re-seed

**Docker "port already in use"**
→ Change the port mappings in docker-compose.yml (e.g., "3001:80")
