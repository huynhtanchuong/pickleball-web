# 🏓 Pickleball Tournament — Live Scoreboard

Hệ thống tính điểm pickleball realtime, xây dựng bằng HTML + CSS + Vanilla JS + Supabase.

---

## 🔗 Links quan trọng

| Service | URL |
|---------|-----|
| 🌐 **Public Site** | https://pickleball-5ii7p94au-huynhtanchuongdtu-9871s-projects.vercel.app |
| 🔑 **Admin Panel** | https://pickleball-5ii7p94au-huynhtanchuongdtu-9871s-projects.vercel.app/admin.html |
| ▲ **Vercel Dashboard** | https://vercel.com/huynhtanchuongdtu-9871s-projects/pickleball-web |
| 🗄️ **Supabase Dashboard** | https://supabase.com/dashboard/project/negwxhrkdypiopmmrxkf |
| 📦 **GitHub Repo** | https://github.com/huynhtanchuong/pickleball-web |

---

## 🔐 Admin

- **URL:** `/admin.html`
- **Password:** `admin123`

---

## 🗄️ Supabase

- **Project:** `pickleball`
- **Project ID:** `negwxhrkdypiopmmrxkf`
- **URL:** `https://negwxhrkdypiopmmrxkf.supabase.co`
- **Region:** Southeast Asia (Singapore)
- **Anon Key:** xem trong `app.js` hoặc Supabase Dashboard → Settings → API Keys → Legacy anon

### Schema bảng `matches`

| Column | Type | Mô tả |
|--------|------|-------|
| id | uuid | Primary key (auto) |
| teamA | text | Tên đội A |
| teamB | text | Tên đội B |
| scoreA | int | Điểm / số set thắng đội A |
| scoreB | int | Điểm / số set thắng đội B |
| group_name | text | "A", "B", "SF", "F" |
| stage | text | "group" / "semi" / "final" |
| status | text | "not_started" / "playing" / "done" |
| updated_at | timestamptz | Auto-update khi có thay đổi |
| s1a/s1b | int | Điểm set 1 (bán kết, chung kết) |
| s2a/s2b | int | Điểm set 2 |
| s3a/s3b | int | Điểm set 3 |
| match_time | text | Giờ thi đấu (vd: "7h20") |
| court | text | Sân (vd: "Sân 1") |
| referee | text | Trọng tài |

### SQL migration (nếu cần tạo lại)

```sql
create table matches (
  id          uuid primary key default gen_random_uuid(),
  "teamA"     text not null,
  "teamB"     text not null,
  "scoreA"    int  default 0,
  "scoreB"    int  default 0,
  group_name  text default 'A',
  stage       text default 'group',
  status      text default 'not_started',
  updated_at  timestamptz default now(),
  s1a int default 0, s1b int default 0,
  s2a int default 0, s2b int default 0,
  s3a int default 0, s3b int default 0,
  match_time  text default '',
  court       text default '',
  referee     text default ''
);

create or replace function set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger matches_updated_at
  before update on matches
  for each row execute function set_updated_at();

alter publication supabase_realtime add table matches;

-- RLS policies
alter table matches enable row level security;
create policy "Public read"   on matches for select using (true);
create policy "Public insert" on matches for insert with check (true);
create policy "Public update" on matches for update using (true);
```

---

## ▲ Vercel

- **Project:** `pickleball-web`
- **Team:** `huynhtanchuongdtu-9871s-projects`
- **Dashboard:** https://vercel.com/huynhtanchuongdtu-9871s-projects/pickleball-web
- **Auto-deploy:** mỗi khi push lên branch `master` → Vercel tự deploy

### Deploy thủ công (nếu cần)
```bash
git add -A
git commit -m "your message"
git push origin master
# Vercel tự deploy trong ~30s
```

---

## 📁 Cấu trúc project

```
pick-web/
├── index.html        — Public scoreboard (read-only)
├── admin.html        — Admin panel (score editing)
├── app.js            — Core logic: fetch, render, realtime, standings
├── admin.js          — Admin: login, bracket gen, reset, match info
├── styles.css        — Public UI styles
├── admin-mobile.css  — Admin mobile-first styles
├── vercel.json       — Vercel static config
└── README.md         — This file
```

---

## ⚡ Tính năng

### Public Scoreboard
- Featured match hero (trận đang diễn ra)
- Group Stage với collapse bảng A/B
- Semifinals & Final tự hiện khi có data
- Bracket visual
- Standings với 🥇🥈🥉
- Realtime updates (Supabase Postgres Changes)
- Hiển thị giờ, sân, trọng tài

### Admin Panel
- Login bằng password
- Cards thu gọn mặc định, click để expand
- Nhập điểm với nút +/- (debounced 800ms)
- Best-of-3 sets cho bán kết & chung kết
- Auto-status: `not_started` → `playing` → `done`
- **Reset 1 trận** về not_started
- **Re-gen bán kết/chung kết** (xóa cũ, tính lại)
- **Auto-gen bracket**: tự tạo bán kết khi vòng bảng xong, tự tạo chung kết khi bán kết xong
- Nhập giờ / sân / trọng tài cho từng trận
- Conflict detection (nhiều admin cùng edit)

### Realtime
- Supabase Postgres Changes subscription
- Fallback polling 5s nếu realtime mất kết nối
- Public page poll localStorage 1s (demo mode)

---

## 🏆 Cấu trúc giải

| Vòng | Format | Số trận |
|------|--------|---------|
| Vòng bảng A | 1 hiệp 11 điểm | 10 trận |
| Vòng bảng B | 1 hiệp 11 điểm | 10 trận |
| Bán kết | 3 hiệp 11 điểm | 2 trận |
| Chung kết | 3 hiệp 11 điểm | 1 trận |

### Các đội

**Bảng A:** Tuấn Anh & Hang Dang · Quoc Le & Thảo · Dung Vo & Thư · Tai Tran & vk Dũng · Khoa Hoang & Phan Nguyen

**Bảng B:** Dũng Nguyễn & Minh Ngọc · Chuong Huynh & Uyên · Hoc Truong & Linh Ngo · Tien Tran & Vu Phan · chú Cường & Alix Su

---

## 🚀 Chạy local

```powershell
powershell -ExecutionPolicy Bypass -File E:\pick-web\serve.ps1
# Mở: http://localhost:5500
```
