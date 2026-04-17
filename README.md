# 🏓 Pickleball Tournament Website

A minimal, real-time pickleball tournament scoring site — plain HTML + CSS + Vanilla JS, no frameworks.

---

## 📁 Project Structure

```
pick-web/
├── index.html   — Public scoreboard (read-only)
├── admin.html   — Admin panel (score editing + bracket management)
├── app.js       — Core logic: fetch, render, standings, realtime
├── admin.js     — Admin auth + bracket generation
├── styles.css   — Dark-theme responsive styles
├── vercel.json  — Vercel static deployment config
└── README.md    — This file
```

---

## ⚡ Features

- **Public scoreboard** — Read-only live view of all matches and standings
- **Admin panel** — Password-protected score editing and bracket management
- **Group Stage** — Matches in Group A / B with live standings
- **Bracket System** — Auto-generate Semifinals → Final from top 2 teams per group
- **Realtime Sync** — Supabase Postgres changes push updates to all browsers instantly
- **Demo Mode** — Works offline using localStorage with 8 sample matches

---

## 🔐 Admin Login

1. Open `http://localhost:5500/admin.html`
2. Enter password: **`admin123`**
3. You can now edit scores, mark matches done, and generate bracket rounds

To change the password, edit `admin.js`:
```js
const ADMIN_PASSWORD = "admin123";  // ← change this
```

The public `index.html` is always **read-only** — scores display as large numbers, no inputs.

---

## 🏆 Bracket Logic

### How it works

1. **Group Stage** — Play all group matches, mark them done
2. **Generate Semifinals** — Click "Generate Semifinals" in admin panel
   - Takes **Top 2 teams** from each group (sorted by wins → point diff)
   - Creates: `A1 vs B2` and `B1 vs A2`
3. **Generate Final** — Click "Generate Final" once both semis are done
   - Winners of each semifinal face off

### Functions
| Function | Description |
|---|---|
| `generateSemifinals()` | Seeds SF matches from group standings |
| `generateFinal()` | Seeds final from SF winners |
| `getTopTeamsByGroup()` | Returns ranked teams per group |
| `updateBracketUI()` | Refreshes bracket visual |
| `renderBracketVisual()` | Draws the bracket card layout |

---

## 🔌 Supabase Setup

### 1. Create a project
Go to [https://supabase.com](https://supabase.com) → New Project.

### 2. Create the `matches` table

Run in the **SQL Editor**:

```sql
create table matches (
  id          uuid primary key default gen_random_uuid(),
  "teamA"     text not null,
  "teamB"     text not null,
  "scoreA"    int  default 0,
  "scoreB"    int  default 0,
  group_name  text default 'A',
  stage       text default 'group',
  status      text default 'pending'
);

-- Enable realtime
alter publication supabase_realtime add table matches;
```

### 3. Get your credentials
Project Settings → API:
- **Project URL** → `SUPABASE_URL`
- **anon / public key** → `SUPABASE_ANON_KEY`

### 4. Update app.js

```js
const SUPABASE_URL      = "https://xxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJ...";
```

---

## 🚀 Run Locally

### PowerShell server (built-in, no installs needed)
```powershell
powershell -ExecutionPolicy Bypass -File E:\pick-web\serve.ps1
```
Opens automatically at: [http://localhost:5500](http://localhost:5500)

### Python (if available)
```bash
python -m http.server 5500
```

### Node.js (if available)
```bash
npx serve . -p 5500
```

---

## 🌐 Deploy to Vercel

### Prerequisites
Install Node.js from [https://nodejs.org](https://nodejs.org), then:

```bash
npm install -g vercel
```

### Deploy steps

```bash
cd E:\pick-web
vercel login          # authenticate with your Vercel account
vercel                # deploy (follow prompts, accept defaults)
vercel --prod         # promote to production URL
```

Vercel will output a public URL like:
```
https://pickleball-tournament-xxxx.vercel.app
```

### Environment note
Since Supabase keys are hardcoded in `app.js`, no environment variables are needed for Vercel. Just make sure you've replaced the placeholder values before deploying.

---

## 🔄 Realtime Notes

- Realtime requires Supabase to be configured.
- The green pulsing dot confirms the realtime channel is active.
- Any change made in the admin panel is pushed to all open public views instantly.
- In demo mode, changes are stored in `localStorage` — only visible in the current browser tab.

---

## 🗄️ Database Schema

| Column     | Type | Notes                              |
|------------|------|------------------------------------|
| id         | uuid | Primary key (auto)                 |
| teamA      | text | Team A name                        |
| teamB      | text | Team B name                        |
| scoreA     | int  | Team A score                       |
| scoreB     | int  | Team B score                       |
| group_name | text | "A", "B", "SF", "F"                |
| stage      | text | "group" \| "semi" \| "final"       |
| status     | text | "pending" \| "done"                |
