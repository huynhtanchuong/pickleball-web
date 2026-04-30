---
name: test-scoring-bo3
description: When the user asks to test BO3 scoring logic, verify scoring after a change, or before pushing changes that touch referee-game-state.js / referee-sync-engine.js / lineup logic.
---

# Test scoring BO3

## Trigger
- User nói: "test BO3", "verify scoring", "chạy test scoring", "check scoring logic"
- Sau khi sửa: `referee-game-state.js`, `referee-sync-engine.js`, `referee-ui.js`, `pairing.js`
- Trước push commit liên quan logic chấm điểm

## Quy trình tự động
1. `node referee-game-state.test.js`
2. `node referee-sync-engine.test.js`
3. Tìm test mới (nếu có): `Glob "*.test.js"`
4. Báo cáo: tổng pass/fail, dòng fail nếu có

## Edge case cần kiểm tra (nếu thay đổi liên quan)
- 0-0-2 rule đầu set 1, 2, 3 (BO3) — đặc biệt set 2 và 3
- Lineup swap giữa set 1→2, 2→3
- Khoá swap GIỮA set (mid-set) — không được cho phép
- Win-by-2: 11-9 ✅ / 11-10 ❌ phải tiếp / 12-10 ✅ / 13-11 ✅
- Match end: thắng 2 set → state = "completed"
- Serving team rotation đúng sau side-out

## Output (3 dòng)
1. Test result: `X passed, Y failed`
2. Nếu fail: file + tên test + lý do ngắn
3. Khuyến nghị: tiếp tục / đề xuất test case mới / blocker
