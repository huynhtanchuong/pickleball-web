---
name: seed-demo-data
description: When the user asks to reset DB to demo data, seed sample tournament, or run reset-and-seed-*.sql. ALWAYS asks for confirmation first.
---

# Seed demo data

## ⚠️ PHẢI HỎI XÁC NHẬN trước khi chạy
Skill này XÓA toàn bộ data hiện tại. KHÔNG tự chạy.

## File seed có sẵn
- [reset-and-seed-db.sql](../../../reset-and-seed-db.sql) — basic
- [reset-and-seed-complete-demo.sql](../../../reset-and-seed-complete-demo.sql) — full demo

## Quy trình
1. **HỎI user**:
   > "Sẽ xoá data hiện tại. Dùng seed nào: `basic` hay `complete-demo`? Có cần backup trước không?"
2. Nếu user bảo backup: chạy `mcp__supabase__execute_sql` với `SELECT … FROM tournaments` rồi save JSON
3. Sau khi xác nhận:
   - Đọc file SQL bằng Read
   - Gọi `mcp__supabase__execute_sql` với nội dung
4. Verify:
   - `SELECT count(*) FROM tournaments;`
   - `SELECT count(*) FROM members;`
   - `SELECT count(*) FROM matches;` (nếu có)
5. Báo cáo số bản ghi mỗi bảng

## KHÔNG
- KHÔNG chạy mà không hỏi
- KHÔNG seed nếu user đang giữa giải đấu thật — đề xuất backup tournament_backup_*.json trước
- KHÔNG drop/truncate ngoài phạm vi file SQL
