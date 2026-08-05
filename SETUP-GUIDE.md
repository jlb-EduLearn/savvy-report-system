# SAVVY Report System — Complete Setup Guide

Follow these steps in order. Total time: about 30–45 minutes.

---

## What you will have at the end

- A live website on Vercel (e.g. `https://savvy-report.vercel.app`)
- Shared data across phone, laptop, and any device
- 76 SAVVY school sites pre-loaded
- Auto-save when you edit schools

---

## Part 1 — Use it on your computer (5 min)

### Step 1.1 — Open the app

1. Go to folder: `Documents\2026\SAVVY REPORT SYSTEM`
2. Double-click **`index.html`**
3. It opens in your browser

You should see the dashboard with school sites, stats, and the table.

### Step 1.2 — Try basic features

| Button | What it does |
|--------|----------------|
| **Add School** | Add a new site |
| **Edit / Delete** | Change or remove a row |
| **Export** | Download CSV backup |
| **Import** | Upload CSV file |
| **Reload** | Refresh data |
| **Copy / Download** | Get the report text |

> Without cloud setup (Part 3), data saves **only in that browser**. Part 3 fixes that.

---

## Part 2 — Put code on GitHub (10 min)

### Step 2.1 — Set Git identity (one time only)

Open **PowerShell** and run (use your real name and GitHub email):

```powershell
git config --global user.name "Jeffrey Batucan"
git config --global user.email "your-email@example.com"
```

### Step 2.2 — Create GitHub repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `savvy-report-system` (or any name)
3. Leave it **empty** — do NOT add README, .gitignore, or license
4. Click **Create repository**

### Step 2.3 — Push your code

In PowerShell:

```powershell
cd "C:\Users\Jeffrey Batucan\Documents\2026\SAVVY REPORT SYSTEM"

git add .
git commit -m "Initial commit: SAVVY deployment monitor"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/savvy-report-system.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

If Git asks you to sign in, use GitHub username + Personal Access Token (not password).

---

## Part 3 — Shared online data with Supabase (10 min)

This lets all devices see the **same data**.

### Step 3.1 — Create Supabase project

1. Go to [supabase.com](https://supabase.com) → Sign up / Log in
2. Click **New project**
3. Name: `savvy-report`
4. Set a database password (save it somewhere safe)
5. Choose region closest to you (e.g. Singapore)
6. Click **Create new project** — wait ~2 minutes

### Step 3.2 — Create the database table

1. In Supabase, open **SQL Editor** (left menu)
2. Click **New query**
3. Open file `supabase/setup.sql` from this project
4. Copy ALL the SQL and paste into Supabase
5. Click **Run** (or Ctrl+Enter)
6. You should see **Success**

### Step 3.3 — Copy your API keys

1. Go to **Project Settings** (gear icon) → **API**
2. Copy these two values:

| Setting | Example | You need this for |
|---------|---------|-------------------|
| **Project URL** | `https://abcdefgh.supabase.co` | `SUPABASE_URL` |
| **anon public** key | `eyJhbGciOiJIUzI1NiIs...` (long string) | `SUPABASE_ANON_KEY` |

> Use the **anon public** key, NOT the service_role key.

### Step 3.4 — Connect locally (test on your PC)

In PowerShell:

```powershell
cd "C:\Users\Jeffrey Batucan\Documents\2026\SAVVY REPORT SYSTEM"
copy js\cloud-config.example.js js\cloud-config.js
```

Open `js\cloud-config.js` in Notepad and paste your keys:

```javascript
const CLOUD_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_ANON_KEY_HERE',
};
```

Save the file. Open `index.html` again.

**Check the footer:**
- ✅ **Cloud synced** = working
- ❌ **Local only** = keys missing or wrong

Edit a school → footer should show **Saving…** then **Cloud synced**.

---

## Part 4 — Deploy live on Vercel (10 min)

### Step 4.1 — Connect Vercel to GitHub

1. Go to [vercel.com](https://vercel.com) → Sign up with **GitHub**
2. Click **Add New…** → **Project**
3. Find `savvy-report-system` → click **Import**

### Step 4.2 — Configure build settings

On the import screen, set:

| Setting | Value |
|---------|--------|
| **Framework Preset** | Other |
| **Root Directory** | `./` |
| **Build Command** | `node scripts/generate-config.js` |
| **Output Directory** | `.` |

### Step 4.3 — Add environment variables

Before clicking Deploy, expand **Environment Variables** and add:

| Name | Value |
|------|--------|
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon public key |

Apply to: **Production**, **Preview**, **Development**

### Step 4.4 — Deploy

1. Click **Deploy**
2. Wait ~1 minute
3. Click **Visit** — your live URL opens

Example: `https://savvy-report-system.vercel.app`

### Step 4.5 — Test on another device

1. Open the Vercel URL on your phone or another PC
2. You should see the same 76 sites
3. Edit something on one device → click **Reload** on the other → change appears

---

## Part 5 — Daily use

### Opening the app

- **Online:** use your Vercel URL from any device
- **Offline PC:** open local `index.html` (only if cloud-config.js has keys)

### Updating schools

1. Click **Edit** on a row
2. Check/uncheck: Account creation, Teachers, Students, Enrollment
3. Click **Save** — auto-syncs to cloud

### Reports

1. Check schools in the table (or leave all checked)
2. Report updates automatically
3. **Copy** → paste into email/Teams
4. **Download** → saves `.txt` file
5. **By handler** → grouped summary

### Backup

Click **Export** regularly to download a CSV backup.

### If data looks wrong

Click **Reload** to pull latest from cloud.

---

## Troubleshooting

### Footer says "Local only"

- `cloud-config.js` is empty (local), or Vercel env vars not set
- Fix: complete Part 3.4 or Part 4.3

### Footer says "Cloud unavailable"

- Wrong Supabase URL or key
- SQL setup not run → run `supabase/setup.sql` again
- Check browser console (F12) for errors

### Git push fails

```powershell
git config --global user.email "your@email.com"
git config --global user.name "Your Name"
```

### Vercel build fails

- Build command must be: `node scripts/generate-config.js`
- Output directory must be: `.`

### Changes not showing on other device

- Click **Reload** on the other device
- Wait 1–2 seconds after saving (footer: **Cloud synced**)

### Reset to original 76 sites

Click **Reset** in the app (uploads to cloud too).

---

## Quick reference

```
Local folder:     Documents\2026\SAVVY REPORT SYSTEM\index.html
Cloud config:     js\cloud-config.js
Database setup:   supabase\setup.sql
GitHub:           github.com/YOUR_USERNAME/savvy-report-system
Live site:        https://your-project.vercel.app
Supabase:         supabase.com → your project → Table Editor → app_data
```

---

## Setup checklist

- [ ] Opened `index.html` locally — dashboard works
- [ ] Pushed code to GitHub
- [ ] Created Supabase project
- [ ] Ran `supabase/setup.sql`
- [ ] Filled `js/cloud-config.js` — footer shows **Cloud synced**
- [ ] Deployed on Vercel with env variables
- [ ] Tested live URL on phone/another PC
- [ ] Exported CSV backup

---

## Security note

This setup uses Supabase **anon** key in the browser (standard for small team tools). Only share the Vercel link with people you trust. For stricter access later, you can add Supabase login.

---

*School Year 2026–2027 · SAVVY Deployment Monitor*
