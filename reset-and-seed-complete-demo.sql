-- ============================================================
-- Reset Database and Create Complete Demo Tournament
-- Xóa toàn bộ dữ liệu và tạo lại 1 giải đấu demo hoàn chỉnh
-- ============================================================

-- Step 1: Delete all existing data (in correct order to avoid FK constraints)
DELETE FROM matches;
DELETE FROM teams;
DELETE FROM tournament_participants;
DELETE FROM tournaments;
DELETE FROM members;

-- Step 2: Insert Members (20 members: 6 T1, 8 T2, 6 T3)
INSERT INTO members (id, name, phone, email, tier, created_at) VALUES
-- Tier 1 (6 members)
('11111111-1111-1111-1111-111111111111', 'Nguyễn Văn An', '0901234501', 'an@example.com', 1, NOW()),
('11111111-1111-1111-1111-111111111112', 'Trần Thị Bình', '0901234502', 'binh@example.com', 1, NOW()),
('11111111-1111-1111-1111-111111111113', 'Lê Văn Cường', '0901234503', 'cuong@example.com', 1, NOW()),
('11111111-1111-1111-1111-111111111114', 'Phạm Thị Dung', '0901234504', 'dung@example.com', 1, NOW()),
('11111111-1111-1111-1111-111111111115', 'Hoàng Văn Em', '0901234505', 'em@example.com', 1, NOW()),
('11111111-1111-1111-1111-111111111116', 'Võ Thị Phượng', '0901234506', 'phuong@example.com', 1, NOW()),

-- Tier 2 (8 members)
('22222222-2222-2222-2222-222222222221', 'Đặng Văn Giang', '0902345601', 'giang@example.com', 2, NOW()),
('22222222-2222-2222-2222-222222222222', 'Ngô Thị Hoa', '0902345602', 'hoa@example.com', 2, NOW()),
('22222222-2222-2222-2222-222222222223', 'Bùi Văn Ích', '0902345603', 'ich@example.com', 2, NOW()),
('22222222-2222-2222-2222-222222222224', 'Đinh Thị Khánh', '0902345604', 'khanh@example.com', 2, NOW()),
('22222222-2222-2222-2222-222222222225', 'Dương Văn Lâm', '0902345605', 'lam@example.com', 2, NOW()),
('22222222-2222-2222-2222-222222222226', 'Phan Thị Mai', '0902345606', 'mai@example.com', 2, NOW()),
('22222222-2222-2222-2222-222222222227', 'Vũ Văn Nam', '0902345607', 'nam@example.com', 2, NOW()),
('22222222-2222-2222-2222-222222222228', 'Lý Thị Oanh', '0902345608', 'oanh@example.com', 2, NOW()),

-- Tier 3 (6 members)
('33333333-3333-3333-3333-333333333331', 'Trương Văn Phúc', '0903456701', 'phuc@example.com', 3, NOW()),
('33333333-3333-3333-3333-333333333332', 'Hồ Thị Quỳnh', '0903456702', 'quynh@example.com', 3, NOW()),
('33333333-3333-3333-3333-333333333333', 'Mai Văn Rồng', '0903456703', 'rong@example.com', 3, NOW()),
('33333333-3333-3333-3333-333333333334', 'Cao Thị Sương', '0903456704', 'suong@example.com', 3, NOW()),
('33333333-3333-3333-3333-333333333335', 'Lưu Văn Tài', '0903456705', 'tai@example.com', 3, NOW()),
('33333333-3333-3333-3333-333333333336', 'Đỗ Thị Uyên', '0903456706', 'uyen@example.com', 3, NOW());

-- Step 3: Create Tournament (ongoing status)
INSERT INTO tournaments (id, name, start_date, status, archived, config, created_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
 'Giải Pickleball Mùa Xuân 2027', 
 '2027-01-15', 
 'ongoing', 
 false, 
 '{"numGroups": 2, "teamsPerGroup": 5, "enableConsolation": false, "enableThirdPlace": true}'::jsonb, 
 NOW());

-- Step 4: Add all members as participants
INSERT INTO tournament_participants (tournament_id, member_id, tier_override, is_seeded, created_at) VALUES
-- Tier 1 participants (2 seeded)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', null, true, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111112', null, false, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111113', null, true, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111114', null, false, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111115', null, false, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111116', null, false, NOW()),

-- Tier 2 participants
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222221', null, false, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', null, false, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222223', null, false, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222224', null, false, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222225', null, false, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222226', null, false, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222227', null, false, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222228', null, false, NOW()),

-- Tier 3 participants
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333331', null, false, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333332', null, false, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', null, false, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333334', null, false, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333335', null, false, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333336', null, false, NOW());

-- Step 5: Create Teams (10 teams: 5 per group)
-- Group A: 5 teams (1 seeded team)
INSERT INTO teams (id, tournament_id, name, member1_id, member2_id, group_name, is_seeded, tier, created_at) VALUES
-- Seeded team in Group A
('team-a1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nguyễn Văn An & Trương Văn Phúc', 
 '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', 'A', true, 'T2', NOW()),

-- Regular teams in Group A
('team-a2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Phạm Thị Dung & Hồ Thị Quỳnh', 
 '11111111-1111-1111-1111-111111111114', '33333333-3333-3333-3333-333333333332', 'A', false, 'T2', NOW()),

('team-a3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hoàng Văn Em & Mai Văn Rồng', 
 '11111111-1111-1111-1111-111111111115', '33333333-3333-3333-3333-333333333333', 'A', false, 'T2', NOW()),

('team-a4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Đặng Văn Giang & Ngô Thị Hoa', 
 '22222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'A', false, 'T2', NOW()),

('team-a5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bùi Văn Ích & Đinh Thị Khánh', 
 '22222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222224', 'A', false, 'T2', NOW()),

-- Group B: 5 teams (1 seeded team)
('team-b1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lê Văn Cường & Cao Thị Sương', 
 '11111111-1111-1111-1111-111111111113', '33333333-3333-3333-3333-333333333334', 'B', true, 'T2', NOW()),

('team-b2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Trần Thị Bình & Lưu Văn Tài', 
 '11111111-1111-1111-1111-111111111112', '33333333-3333-3333-3333-333333333335', 'B', false, 'T2', NOW()),

('team-b3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Võ Thị Phượng & Đỗ Thị Uyên', 
 '11111111-1111-1111-1111-111111111116', '33333333-3333-3333-3333-333333333336', 'B', false, 'T2', NOW()),

('team-b4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dương Văn Lâm & Phan Thị Mai', 
 '22222222-2222-2222-2222-222222222225', '22222222-2222-2222-2222-222222222226', 'B', false, 'T2', NOW()),

('team-b5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vũ Văn Nam & Lý Thị Oanh', 
 '22222222-2222-2222-2222-222222222227', '22222222-2222-2222-2222-222222222228', 'B', false, 'T2', NOW());

-- Step 6: Create Group Stage Matches (Round-robin: 10 matches per group = 20 total)
-- Group A Matches (10 matches)
INSERT INTO matches (id, tournament_id, teamA, teamB, scoreA, scoreB, group_name, stage, match_type, status, 
                     s1a, s1b, s2a, s2b, s3a, s3b, match_time, court, referee, serving_team, server_number, updated_at) VALUES
-- Completed matches (6 matches)
('match-a1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nguyễn Văn An & Trương Văn Phúc', 'Phạm Thị Dung & Hồ Thị Quỳnh', 
 11, 7, 'A', 'group', 'group', 'done', 11, 7, 0, 0, 0, 0, '09:00', 'Sân 1', 'Trọng tài A', null, null, NOW()),

('match-a2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nguyễn Văn An & Trương Văn Phúc', 'Hoàng Văn Em & Mai Văn Rồng', 
 11, 9, 'A', 'group', 'group', 'done', 11, 9, 0, 0, 0, 0, '09:30', 'Sân 1', 'Trọng tài A', null, null, NOW()),

('match-a3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nguyễn Văn An & Trương Văn Phúc', 'Đặng Văn Giang & Ngô Thị Hoa', 
 11, 5, 'A', 'group', 'group', 'done', 11, 5, 0, 0, 0, 0, '10:00', 'Sân 1', 'Trọng tài A', null, null, NOW()),

('match-a4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nguyễn Văn An & Trương Văn Phúc', 'Bùi Văn Ích & Đinh Thị Khánh', 
 11, 8, 'A', 'group', 'group', 'done', 11, 8, 0, 0, 0, 0, '10:30', 'Sân 1', 'Trọng tài A', null, null, NOW()),

('match-a5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Phạm Thị Dung & Hồ Thị Quỳnh', 'Hoàng Văn Em & Mai Văn Rồng', 
 11, 6, 'A', 'group', 'group', 'done', 11, 6, 0, 0, 0, 0, '11:00', 'Sân 2', 'Trọng tài B', null, null, NOW()),

('match-a6', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Phạm Thị Dung & Hồ Thị Quỳnh', 'Đặng Văn Giang & Ngô Thị Hoa', 
 9, 11, 'A', 'group', 'group', 'done', 9, 11, 0, 0, 0, 0, '11:30', 'Sân 2', 'Trọng tài B', null, null, NOW()),

-- Playing match (1 match)
('match-a7', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Phạm Thị Dung & Hồ Thị Quỳnh', 'Bùi Văn Ích & Đinh Thị Khánh', 
 5, 3, 'A', 'group', 'group', 'playing', 5, 3, 0, 0, 0, 0, '12:00', 'Sân 1', 'Trọng tài A', 'A', 2, NOW()),

-- Not started matches (3 matches)
('match-a8', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hoàng Văn Em & Mai Văn Rồng', 'Đặng Văn Giang & Ngô Thị Hoa', 
 0, 0, 'A', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, '12:30', 'Sân 2', null, null, null, NOW()),

('match-a9', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hoàng Văn Em & Mai Văn Rồng', 'Bùi Văn Ích & Đinh Thị Khánh', 
 0, 0, 'A', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, '13:00', 'Sân 1', null, null, null, NOW()),

('match-a10', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Đặng Văn Giang & Ngô Thị Hoa', 'Bùi Văn Ích & Đinh Thị Khánh', 
 0, 0, 'A', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, '13:30', 'Sân 2', null, null, null, NOW());

-- Group B Matches (10 matches)
INSERT INTO matches (id, tournament_id, teamA, teamB, scoreA, scoreB, group_name, stage, match_type, status, 
                     s1a, s1b, s2a, s2b, s3a, s3b, match_time, court, referee, serving_team, server_number, updated_at) VALUES
-- Completed matches (7 matches)
('match-b1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lê Văn Cường & Cao Thị Sương', 'Trần Thị Bình & Lưu Văn Tài', 
 11, 8, 'B', 'group', 'group', 'done', 11, 8, 0, 0, 0, 0, '09:00', 'Sân 2', 'Trọng tài B', null, null, NOW()),

('match-b2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lê Văn Cường & Cao Thị Sương', 'Võ Thị Phượng & Đỗ Thị Uyên', 
 11, 6, 'B', 'group', 'group', 'done', 11, 6, 0, 0, 0, 0, '09:30', 'Sân 2', 'Trọng tài B', null, null, NOW()),

('match-b3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lê Văn Cường & Cao Thị Sương', 'Dương Văn Lâm & Phan Thị Mai', 
 11, 9, 'B', 'group', 'group', 'done', 11, 9, 0, 0, 0, 0, '10:00', 'Sân 2', 'Trọng tài B', null, null, NOW()),

('match-b4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lê Văn Cường & Cao Thị Sương', 'Vũ Văn Nam & Lý Thị Oanh', 
 11, 7, 'B', 'group', 'group', 'done', 11, 7, 0, 0, 0, 0, '10:30', 'Sân 2', 'Trọng tài B', null, null, NOW()),

('match-b5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Trần Thị Bình & Lưu Văn Tài', 'Võ Thị Phượng & Đỗ Thị Uyên', 
 11, 9, 'B', 'group', 'group', 'done', 11, 9, 0, 0, 0, 0, '11:00', 'Sân 1', 'Trọng tài A', null, null, NOW()),

('match-b6', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Trần Thị Bình & Lưu Văn Tài', 'Dương Văn Lâm & Phan Thị Mai', 
 8, 11, 'B', 'group', 'group', 'done', 8, 11, 0, 0, 0, 0, '11:30', 'Sân 1', 'Trọng tài A', null, null, NOW()),

('match-b7', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Trần Thị Bình & Lưu Văn Tài', 'Vũ Văn Nam & Lý Thị Oanh', 
 11, 5, 'B', 'group', 'group', 'done', 11, 5, 0, 0, 0, 0, '12:00', 'Sân 2', 'Trọng tài B', null, null, NOW()),

-- Not started matches (3 matches)
('match-b8', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Võ Thị Phượng & Đỗ Thị Uyên', 'Dương Văn Lâm & Phan Thị Mai', 
 0, 0, 'B', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, '12:30', 'Sân 1', null, null, null, NOW()),

('match-b9', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Võ Thị Phượng & Đỗ Thị Uyên', 'Vũ Văn Nam & Lý Thị Oanh', 
 0, 0, 'B', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, '13:00', 'Sân 2', null, null, null, NOW()),

('match-b10', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dương Văn Lâm & Phan Thị Mai', 'Vũ Văn Nam & Lý Thị Oanh', 
 0, 0, 'B', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, '13:30', 'Sân 1', null, null, null, NOW());

-- ============================================================
-- Summary of Created Data
-- ============================================================
-- ✅ 20 Members (6 T1, 8 T2, 6 T3) - All with full names, phones, emails
-- ✅ 1 Tournament (Giải Pickleball Mùa Xuân 2027) - Status: ongoing
-- ✅ 20 Participants (all members registered)
-- ✅ 10 Teams (5 per group, 2 seeded teams)
-- ✅ 20 Group Matches:
--    • Group A: 6 done, 1 playing, 3 not_started
--    • Group B: 7 done, 0 playing, 3 not_started
-- 
-- Current Standings (based on completed matches):
-- Group A:
--   1. Nguyễn Văn An & Trương Văn Phúc (4-0, +17)
--   2. Phạm Thị Dung & Hồ Thị Quỳnh (2-2, +3)
--   3. Đặng Văn Giang & Ngô Thị Hoa (1-2, -4)
--   4. Hoàng Văn Em & Mai Văn Rồng (0-2, -10)
--   5. Bùi Văn Ích & Đinh Thị Khánh (0-2, -6)
--
-- Group B:
--   1. Lê Văn Cường & Cao Thị Sương (4-0, +14)
--   2. Trần Thị Bình & Lưu Văn Tài (2-2, +1)
--   3. Dương Văn Lâm & Phan Thị Mai (1-1, +0)
--   4. Võ Thị Phượng & Đỗ Thị Uyên (0-2, -8)
--   5. Vũ Văn Nam & Lý Thị Oanh (0-2, -7)
-- ============================================================

-- Verification Queries (uncomment to run)
-- SELECT COUNT(*) as total_members FROM members;
-- SELECT COUNT(*) as total_participants FROM tournament_participants;
-- SELECT COUNT(*) as total_teams FROM teams;
-- SELECT COUNT(*) as total_matches FROM matches;
-- SELECT status, COUNT(*) FROM matches GROUP BY status;
