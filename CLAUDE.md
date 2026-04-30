# pick-web — Hướng dẫn cho Claude

## Sơ lược
**pick-web** — webapp quản lý giải đấu Pickleball. Vanilla JS (ES modules) + Supabase, deploy lên Vercel (preview-only). Solo dev, MVP, làm part-time.

End user: trọng tài (chấm điểm), admin (tạo giải), người chơi & khán giả (viewer realtime).

## Glossary (domain)
- **BO3** — best-of-3 sets, thắng 2 set thì xong trận
- **Set** — 11 điểm, win-by-2 (12-10, 13-11…)
- **Lineup** — cặp đôi đứng sân (left/right)
- **Lineup swap (⇅)** — hoán đổi giữa các set BO3 (KHÔNG cho swap giữa set, đã fix `c0f5327`)
- **0-0-2 rule** — đầu MỌI set BO3 chỉ server thứ 2 phát (đã fix `d9a9f64`)
- **Serve** — server number 1/2 + serving team
- **Referee** — [referee.html](referee.html), chấm điểm
- **Viewer** — [viewer.html](viewer.html), realtime view
- **Admin** — [admin.html](admin.html), tạo & quản lý giải
- **Sync engine** — [referee-sync-engine.js](referee-sync-engine.js), Supabase Realtime

## Stack
- Vanilla JS (ES modules), HTML/CSS thuần — **không** thêm framework trừ khi user yêu cầu
- Supabase Postgres + Realtime + Auth (anonymous viewer + admin)
- Vercel auto-deploy khi push `master`
- Test files: [referee-game-state.test.js](referee-game-state.test.js), [referee-sync-engine.test.js](referee-sync-engine.test.js)

## Quy tắc làm việc

### Phong cách
- **Trả lời tiếng Việt**, ngắn gọn — chỉ tóm + diff. Bỏ small talk.
- Code mới: bám pattern file lân cận, tránh abstraction non. 3 dòng giống nhau OK hơn helper hấp tấp.
- Comment: chỉ thêm khi WHY không hiển nhiên. Code self-documenting trước.
- Async: try/catch ở async boundary; validate input người dùng, trust internal.

### Scope (cực kỳ quan trọng)
- **KHÔNG** tự refactor, viết test, sửa file ngoài yêu cầu.
- **KHÔNG** tạo file `*_COMPLETE.md`, `*_SUMMARY.md`, `*_READY.md`, `IMPLEMENTATION_*.md` ở root — đã đầy. Nếu muốn ghi chú feature, **chỉ update [README.md](README.md)**.
- Khi sửa logic core (BO3 / scoring / sync / lineup): luôn chạy `node referee-*.test.js` sau, và nói rõ rủi ro phá hệ thống cũ.

### Git
- Commit format: `feat(scope): …` `fix(scope): …` `ux(scope): …` (giữ nguyên style hiện tại — xem `git log`).
- Branch: chỉ `master`, push thẳng. Claude **được phép** tự `git add` → `commit` → `push` không cần hỏi.
- Sau push: báo *URL Vercel preview* + 1 dòng tóm tắt đổi gì.

### DB / Supabase
- Migration: dùng MCP `mcp__supabase__apply_migration` / `execute_sql` — Claude tự áp dụng.
- **PHẢI HỎI** trước khi: `DROP TABLE`, `TRUNCATE`, `DELETE` toàn bảng, hay chạy `reset-and-seed-*.sql`.

### Test & verify
- Logic core: chạy test files có sẵn.
- UI: không thể tự test browser — báo cáo URL Vercel preview + page nên click + flow gợi ý. Không claim "đã test xong" cho UI.
- Debug: tự điều tra root cause + fix; không workaround mặt nổi.

## File chính
- [admin.html](admin.html) / [admin.js](admin.js) — quản lý giải
- [referee.html](referee.html) / [referee-ui.js](referee-ui.js) — UI chấm điểm
- [referee-game-state.js](referee-game-state.js) — state machine BO3 (set, score, serve, lineup)
- [referee-sync-engine.js](referee-sync-engine.js) — Realtime sync
- [viewer.html](viewer.html) — public live view
- [members.html](members.html) / [members.js](members.js) — CLB
- [tournaments.html](tournaments.html) / [tournaments.js](tournaments.js)
- [pairing.js](pairing.js) — bốc cặp
- [storage.js](storage.js) — Supabase wrapper
- [auth.js](auth.js) — admin auth
- [schema.sql](schema.sql) / [migration-v2.sql](migration-v2.sql) — DB schema
- [docs/archive/](docs/archive/) — tài liệu cũ (đã dọn từ root)

## Tự động hoá có sẵn
- Slash `/test-bo3` — chạy nhanh test scoring + sync engine
- Skill `test-scoring-bo3` — quy trình test BO3 đầy đủ
- Skill `seed-demo-data` — reset DB về demo (CẦN HỎI trước)
- Agent `scoring-reviewer` — review thay đổi liên quan BO3/scoring/lineup
- Agent `ui-tester` — hướng dẫn user test UI sau thay đổi

## Ưu tiên hiện tại
**Cải thiện test coverage cho scoring BO3** — đây là chỗ Claude hay phá nhất. Mỗi PR chạm tới `referee-game-state.js` / `referee-sync-engine.js` nên có test mới hoặc test đã có pass.
