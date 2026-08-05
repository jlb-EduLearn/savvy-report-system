# SAVVY Report System

A **standalone** browser-based dashboard for tracking **SAVVY school site deployments** and **enrollment progress** for School Year 2026–2027.

No internet connection required after opening — all data lives in your browser.

## Quick Start

1. Open `index.html` in any modern browser (Chrome, Edge, Firefox).
2. No installation or server required — all data is stored in browser localStorage.

## Features

| Feature | Description |
|---------|-------------|
| **Dashboard metrics** | Total schools, teachers-only, both uploaded, no entry |
| **Live report generator** | Formatted status report ready to copy or download |
| **School CRUD** | Add, edit, and delete schools via modal form |
| **Search & filters** | Search by name/handler/link; filter by handler or status |
| **Sortable table** | Click column headers to sort |
| **Selective reports** | Check specific schools to generate partial reports |
| **Handler summary** | Per-handler breakdown in the report panel |
| **CSV import/export** | Bulk update or backup your school list |
| **Auto-save** | Changes persist in browser localStorage |

## Project Structure

```
SAVVY REPORT SYSTEM/
├── index.html          # Main page
├── css/
│   └── style.css       # Styles
├── js/
│   ├── config.js       # App constants
│   ├── seed-data.js    # Built-in school list (78 schools)
│   ├── data.js         # Storage, CRUD, CSV, filters
│   ├── stats.js        # Metrics calculations
│   ├── report.js       # Report generation & export
│   ├── ui.js           # DOM rendering
│   └── app.js          # Event wiring & app init
└── README.md
```

## School Data Format

Each school record contains:

| Field | Type | Description |
|-------|------|-------------|
| `ss` | string | Handler (Site Specialist) code |
| `name` | string | School name |
| `link` | string | School site URL |
| `status` | string | `Deployed`, `In Progress`, or `Undeployed` |
| `accountCreation` | boolean | Account creation completed |
| `teachers` | boolean | Teachers uploaded |
| `students` | boolean | Students uploaded |
| `enrollment` | boolean | Enrollment module active |

## Updating Data

You can update schools in three ways — all offline:

1. **In the app** — use Add School, Edit, or Delete on each row
2. **Import CSV** — bulk replace or append from a spreadsheet export
3. **Edit seed file** — modify `js/seed-data.js`, then click **Reset** in the app (or clear browser storage)

## CSV Import Format

Header row (required):

```
Handler,School Name,Link,Status,Account Creation,Teachers Uploaded,Students Uploaded,Enrollment Module
```

Use `Yes`/`No` for boolean columns. On import you can **replace** all data or **append** new schools.

## Tips

- Use **Export CSV** regularly to back up your data (localStorage is browser-specific).
- Click **By Handler** to see a breakdown grouped by site specialist.
- Press **Escape** to close the add/edit modal.
- Use **Reset** to restore the built-in school list from `js/seed-data.js`.

## Customization

Edit `js/config.js` to change the school year or storage key.

The default 76 sites are stored in `js/seed-data.js`.

## Shared data across devices (Supabase)

The app can sync to **Supabase** so phone, laptop, and Vercel URL all show the same data.

### Step 1 — Create Supabase project (free)

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Open **SQL Editor** → paste and run `supabase/setup.sql`.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

### Step 2 — Local testing

Copy the example config and add your keys:

```bash
copy js\cloud-config.example.js js\cloud-config.js
```

Edit `js/cloud-config.js`:

```javascript
const CLOUD_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'your-anon-key',
};
```

Open the app — footer should show **Cloud synced**.

### Step 3 — Vercel environment variables

In Vercel → your project → **Settings → Environment Variables**, add:

| Name | Value |
|------|--------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your anon public key |

Redeploy. The build runs `scripts/generate-config.js` to inject keys.

### How sync works

- **Load:** fetches from Supabase on open / Reload
- **Save:** every edit auto-saves to cloud (footer shows *Saving…* → *Cloud synced*)
- **Offline:** falls back to local copy if cloud is unreachable
- **First visit:** uploads seed data to cloud if database is empty

> **Note:** The anon key is public (normal for Supabase). Keep the project URL private-ish; only share the Vercel link with your team.

---

## Deploy to GitHub + Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: SAVVY deployment monitor"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New → Project** → import your repository.
3. Settings:
   - **Framework Preset:** Other
   - **Build Command:** `node scripts/generate-config.js`
   - **Output Directory:** `.`
4. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` (see above).
5. Click **Deploy**.

Live URL: `https://your-project.vercel.app`

### Notes

- With Supabase configured, data is **shared across all devices**.
- Without Supabase, data stays in the browser only (localStorage).
- Push to `main` to trigger automatic redeploys on Vercel.
