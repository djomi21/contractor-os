# ContractorOS Pro — Free Stack Deployment
# Vercel (frontend) + Supabase (database) + Render (backend)
# Total cost: $0/month

---

## Overview

```
┌─────────────┐     HTTPS      ┌──────────────┐     TCP/SSL     ┌──────────────┐
│   Vercel     │ ──────────────→│   Render      │ ──────────────→│  Supabase    │
│  (Frontend)  │   API calls    │  (Backend)    │   SQL queries   │ (PostgreSQL) │
│  React+Vite  │                │  Express+Node │                │  Free 500MB  │
│  FREE tier   │                │  FREE tier    │                │  FREE tier   │
└─────────────┘                └──────────────┘                └──────────────┘
contractor-os.vercel.app    contractor-os-api.onrender.com    xxxx.supabase.co
```

**Free tier limits:**
- Vercel: 100GB bandwidth/mo, unlimited deploys
- Render: 750 hours/mo (spins down after 15min idle, ~30s cold start)
- Supabase: 500MB database, 1GB file storage, 50K monthly active users

---

## STEP 1: Supabase (Database) — 5 minutes

### 1a. Create project
1. Go to [supabase.com](https://supabase.com) → Sign up / Sign in
2. Click **"New Project"**
3. Fill in:
   - **Name:** `contractor-os`
   - **Database Password:** Choose a strong password → **SAVE THIS — you'll need it**
   - **Region:** Pick the one closest to you (e.g., `US East`)
4. Click **"Create new project"** — wait ~2 minutes for provisioning

### 1b. Get your connection string
1. In your project dashboard, go to **Settings** (gear icon) → **Database**
2. Scroll to **"Connection string"** → click **URI** tab
3. You'll see something like:
   ```
   postgresql://postgres.abcdefghij:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with the password you chose above
5. **Add `?pgbouncer=true` to the end** — final URL looks like:
   ```
   postgresql://postgres.abcdefghij:MyStr0ngP@ss@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
6. **Copy this full URL** — this is your `DATABASE_URL`

### 1c. Create the tables
1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `scripts/supabase-setup.sql` from your project
4. **Copy the entire contents** and paste into the SQL editor
5. Click **"Run"** (or Ctrl+Enter)
6. You should see "Success. No rows returned." — this created all 14 tables + seed data

### 1d. Verify
1. Go to **Table Editor** in Supabase sidebar
2. You should see all tables: Company, User, Customer, Estimate, etc.
3. Click on **User** table — you should see Jason Braddock's row

---

## STEP 2: Render (Backend API) — 5 minutes

### 2a. Push code to GitHub
If you haven't already:
```bash
cd contractor-os-deploy
git init
git add .
git commit -m "Initial deploy"
# Create a repo on GitHub, then:
git remote add origin https://github.com/djomi21/contractor-os.git
git push -u origin main
```

### 2b. Create Render web service
1. Go to [render.com](https://render.com) → Sign up / Sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account → select the `contractor-os` repo
4. Configure:
   - **Name:** `contractor-os-api`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npx prisma migrate deploy && node src/server.js`
   - **Plan:** `Free`

### 2c. Set environment variables
In the Render dashboard for your service, go to **"Environment"** tab and add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | The Supabase connection string from Step 1b |
| `JWT_SECRET` | Run `openssl rand -hex 32` in your terminal and paste the result |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `FRONTEND_URL` | `https://contractor-os.vercel.app` (update after Step 3) |

5. Click **"Save Changes"** → Render will auto-deploy

### 2d. Verify
Once the deploy finishes (2-3 minutes), Render gives you a URL like:
```
https://contractor-os-api.onrender.com
```

Visit: `https://contractor-os-api.onrender.com/api/health`

You should see:
```json
{"status":"ok","version":"3.0.0","timestamp":"..."}
```

**Copy this URL** — you'll need it for Step 3.

> **Note:** Render free tier spins down after 15min of no traffic. First request after idle takes ~30 seconds. This is normal.

---

## STEP 3: Vercel (Frontend) — 5 minutes

### 3a. Create Vercel project
1. Go to [vercel.com](https://vercel.com) → Sign up / Sign in
2. Click **"Add New Project"** → Import your GitHub repo
3. Configure:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)

### 3b. Set environment variable
Before clicking Deploy, expand **"Environment Variables"** and add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://contractor-os-api.onrender.com/api` |

**IMPORTANT:** The value must include `/api` at the end, and must match your Render URL from Step 2d.

4. Click **"Deploy"** — takes ~1 minute

### 3c. Get your frontend URL
After deployment, Vercel gives you a URL like:
```
https://contractor-os.vercel.app
```

### 3d. Update Render CORS
Go back to Render → your backend service → **"Environment"** tab:
1. Update `FRONTEND_URL` to your actual Vercel URL (e.g., `https://contractor-os.vercel.app`)
2. Save → Render will auto-redeploy (~1 minute)

### 3e. First login
1. Open your Vercel URL
2. Wait ~30 seconds if Render backend is cold-starting
3. Login with:
   - **Email:** `jason@jbconstruction.com`
   - **Password:** `contractor123`

**NOTE:** The seeded password hash in supabase-setup.sql is a placeholder. For your first real login, you may need to re-run the seed with a proper bcrypt hash. The easiest way:

```bash
# From your local machine with the backend code:
cd backend
cp .env.example .env
# Edit .env with your Supabase DATABASE_URL and JWT_SECRET
npm install
node prisma/seed.js
```

This will insert the owner user with a properly hashed password (`contractor123`).

---

## STEP 4: Custom Domain (Optional)

### Vercel custom domain
1. In Vercel → your project → **Settings** → **Domains**
2. Add your domain (e.g., `app.jbconstruction.com`)
3. Update DNS: Add a CNAME record pointing to `cname.vercel-dns.com`
4. Vercel auto-provisions SSL

### Render custom domain
1. In Render → your service → **Settings** → **Custom Domains**
2. Add subdomain (e.g., `api.jbconstruction.com`)
3. Update DNS as instructed
4. Update `VITE_API_URL` in Vercel to use the new domain

---

## Troubleshooting

### "Network error" or "Failed to fetch" on login
→ Render backend is cold-starting. Wait 30 seconds and try again.
→ Check browser console (F12) for CORS errors. Ensure `FRONTEND_URL` on Render matches your Vercel URL exactly.

### "Invalid credentials" on login
→ The seed SQL has a placeholder bcrypt hash. Run `node prisma/seed.js` locally against your Supabase DB to insert a properly hashed password. See Step 3e above.

### Tables not found / Prisma errors
→ Make sure you ran the full `supabase-setup.sql` in Step 1c.
→ Alternatively, run locally: `DATABASE_URL="your-supabase-url" npx prisma migrate deploy`

### CORS errors in browser console
→ `FRONTEND_URL` on Render must match your Vercel URL exactly (including `https://`, no trailing slash).
→ You can comma-separate multiple origins: `https://contractor-os.vercel.app,http://localhost:3000`

### Render deploy fails with "prisma generate" error
→ Make sure `prisma` is in `devDependencies` in `backend/package.json`.
→ Render installs devDependencies during build by default.

### Supabase connection timeout
→ Use the **Transaction pooler** URI (port 6543), not the Direct connection (port 5432).
→ Ensure `?pgbouncer=true` is in your DATABASE_URL.

### App works but data disappears on refresh
→ The API is unreachable and the app fell back to seed data mode. Check that `VITE_API_URL` is set correctly in Vercel env vars, and that Render is running.

---

## Updating After Deploy

### Frontend changes
Push to GitHub → Vercel auto-deploys in ~60 seconds.

### Backend changes
Push to GitHub → Render auto-deploys in ~2 minutes.

### Database schema changes
1. Edit `backend/prisma/schema.prisma`
2. Run locally: `npx prisma migrate dev --name your_change`
3. Push to GitHub → Render runs `npx prisma migrate deploy` on start

### Environment variable changes
Update in the respective dashboards (Vercel or Render) → auto-redeploys.

---

## Monthly Cost Summary

| Service | Plan | Cost | Limits |
|---------|------|------|--------|
| Vercel | Hobby | **$0** | 100GB bandwidth, unlimited deploys |
| Render | Free | **$0** | 750 hrs/mo, 30s cold start |
| Supabase | Free | **$0** | 500MB DB, 1GB storage |
| **Total** | | **$0/mo** | |

### When to upgrade
- **Render ($7/mo "Starter"):** Eliminates cold starts, always-on. Worth it when you have daily users.
- **Supabase ($25/mo "Pro"):** When you exceed 500MB or need daily backups.
- **Vercel ($20/mo "Pro"):** When you need team features or exceed bandwidth.
