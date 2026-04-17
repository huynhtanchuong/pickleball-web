# 🏓 Pickleball Tournament Website

A minimal, real-time pickleball tournament scoring site built with plain HTML, CSS, and Vanilla JS — no frameworks.

---

## 📁 Project Structure

```
pick-web/
├── index.html   — Main page (matches + standings)
├── app.js       — All logic (fetch, render, realtime)
├── styles.css   — Dark-theme responsive styles
└── README.md    — This file
```

---

## ⚡ Features

- **Match List** — View all matches grouped by Group A / B
- **Live Score Editing** — Update scores inline, save with one click
- **Mark Done** — Lock a match and record the final result
- **Standings** — Auto-calculated W/L/+- per group, top 2 highlighted
- **Realtime Sync** — Supabase Postgres changes push updates instantly (no reload)
- **Demo Mode** — Works offline using localStorage with sample data

---

## 🔌 Supabase Setup

### 1. Create a Supabase project
Go to [https://supabase.com](https://supabase.com) → New Project.

### 2. Create the `matches` table

Run this in the **SQL Editor**:

```sql
create table matches (
  id          uuid primary key default gen_random_uuid(),
  "teamA"     text not null,
  "teamB"     text not null,
  "scoreA"    int  default 0,
  "scoreB"    int  default 0,
  group_name  text default 'A',
  status      text default 'pending'
);

-- Enable realtime
alter publication supabase_realtime add table matches;
```

### 3. Get your credentials
Project Settings → API:
- **Project URL** → `SUPABASE_URL`
- **anon / public key** → `SUPABASE_ANON_KEY`

### 4. Paste into app.js

```js
const SUPABASE_URL      = "https://xxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJ...";
```

---

## 🚀 Run Locally

### Option A — Python (recommended)
```bash
cd E:\pick-web
python -m http.server 5500
```
Then open: [http://localhost:5500](http://localhost:5500)

### Option B — Node.js
```bash
cd E:\pick-web
npx serve . -p 5500
```

---

## 🔄 Realtime Notes

- Realtime requires Supabase to be configured.
- The green pulsing dot in the header confirms the realtime channel is active.
- Any score update or status change made by **any user** is pushed to all open browsers instantly via Supabase Postgres Changes.
- In demo mode (no Supabase), changes are stored in `localStorage` and only visible in the current browser tab.

---

## 🗄️ Database Schema

| Column      | Type | Notes                    |
|-------------|------|--------------------------|
| id          | uuid | Primary key (auto)       |
| teamA       | text | Team A name              |
| teamB       | text | Team B name              |
| scoreA      | int  | Team A score             |
| scoreB      | int  | Team B score             |
| group_name  | text | "A" or "B"               |
| status      | text | "pending" or "done"      |
