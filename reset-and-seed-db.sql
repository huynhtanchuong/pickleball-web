-- ============================================================
-- Reset Database and Seed with Sample Tournament Data
-- Xóa toàn bộ dữ liệu và tạo lại 1 giải đấu đang diễn ra
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
('11111111-1111-1111-1111-111111111111', 'An', '0901111111', null, 1, NOW()),
('11111111-1111-1111-1111-111111111112', 'Bình', '0901111112', null, 1, NOW()),
('11111111-1111-1111-1111-111111111113', 'Cường', '0901111113', null, 1, NOW()),
('11111111-1111-1111-1111-111111111114', 'Dung', '0901111114', null, 1, NOW()),
('11111111-1111-1111-1111-111111111115', 'Em', '0901111115', null, 1, NOW()),
('11111111-1111-1111-1111-111111111116', 'Phượng', '0901111116', null, 1, NOW()),

-- Tier 2 (8 members)
('22222222-2222-2222-2222-222222222221', 'Giang', '0902222221', null, 2, NOW()),
('22222222-2222-2222-2222-222222222222', 'Hoa', '0902222222', null, 2, NOW()),
('22222222-2222-2222-2222-222222222223', 'Ích', '0902222223', null, 2, NOW()),
('22222222-2222-2222-2222-222222222224', 'Khánh', '0902222224', null, 2, NOW()),
('22222222-2222-2222-2222-222222222225', 'Lâm', '0902222225', null, 2, NOW()),
('22222222-2222-2222-2222-222222222226', 'Mai', '0902222226', null, 2, NOW()),
('22222222-2222-2222-2222-222222222227', 'Nam', '0902222227', null, 2, NOW()),
('22222222-2222-2222-2222-222222222228', 'Oanh', '0902222228', null, 2, NOW()),

-- Tier 3 (6 members)
('33333333-3333-3333-3333-333333333331', 'Phúc', '0903333331', null, 3, NOW()),
('33333333-3333-3333-3333-333333333332', 'Quỳnh', '0903333332', null, 3, NOW()),
('33333333-3333-3333-3333-333333333333', 'Rồng', '0903333333', null, 3, NOW()),
('33333333-3333-3333-3333-333333333334', 'Sương', '0903333334', null, 3, NOW()),
('33333333-3333-3333-3333-333333333335', 'Tài', '0903333335', null, 3, NOW()),
('33333333-3333-3333-3333-333333333336', 'Uyên', '0903333336', null, 3, NOW());

-- Step 3: Create Tournament (ongoing status)
INSERT INTO tournaments (id, name, start_date, status, archived, config, created_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Giải Pickleball Tháng 1/2027', '2027-01-15', 'ongoing', false, 
'{"numGroups": 2, "teamsPerGroup": 5, "enableConsolation": false, "enableThirdPlace": true}'::jsonb, NOW());

-- Step 4: Add all members as participants
INSERT INTO tournament_participants (tournament_id, member_id, tier_override, is_seeded, created_at) VALUES
-- Tier 1 participants
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', null, false, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111112', null, false, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111113', null, false, NOW()),
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
-- Group A: 3 teams T1+T3, 2 teams T2+T2
INSERT INTO teams (id, tournament_id, name, member1_id, member2_id, group_name, is_seeded, tier, created_at) VALUES
('team-a1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', 'A', false, 'T2', NOW()),
('team-a2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, '11111111-1111-1111-1111-111111111112', '33333333-3333-3333-3333-333333333332', 'A', false, 'T2', NOW()),
('team-a3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, '11111111-1111-1111-1111-111111111113', '33333333-3333-3333-3333-333333333333', 'A', false, 'T2', NOW()),
('team-a4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, '22222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'A', false, 'T2', NOW()),
('team-a5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, '22222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222224', 'A', false, 'T2', NOW());

-- Group B: 3 teams T1+T3, 2 teams T2+T2
INSERT INTO teams (id, tournament_id, name, member1_id, member2_id, group_name, is_seeded, tier, created_at) VALUES
('team-b1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, '11111111-1111-1111-1111-111111111114', '33333333-3333-3333-3333-333333333334', 'B', false, 'T2', NOW()),
('team-b2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, '11111111-1111-1111-1111-111111111115', '33333333-3333-3333-3333-333333333335', 'B', false, 'T2', NOW()),
('team-b3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, '11111111-1111-1111-1111-111111111116', '33333333-3333-3333-3333-333333333336', 'B', false, 'T2', NOW()),
('team-b4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, '22222222-2222-2222-2222-222222222225', '22222222-2222-2222-2222-222222222226', 'B', false, 'T2', NOW()),
('team-b5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, '22222222-2222-2222-2222-222222222227', '22222222-2222-2222-2222-222222222228', 'B', false, 'T2', NOW());

-- Step 6: Create Round-Robin Matches for Group Stage
-- Group A matches (10 matches: 5 teams round-robin)
INSERT INTO matches (tournament_id, "teamA", "teamB", "scoreA", "scoreB", group_name, stage, match_type, status, s1a, s1b, s2a, s2b, s3a, s3b, created_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'An & Phúc', 'Bình & Quỳnh', 2, 1, 'A', 'group', 'group', 'completed', 11, 9, 11, 8, 0, 0, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'An & Phúc', 'Cường & Rồng', 2, 0, 'A', 'group', 'group', 'completed', 11, 7, 11, 9, 0, 0, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'An & Phúc', 'Giang & Hoa', 2, 1, 'A', 'group', 'group', 'completed', 11, 9, 9, 11, 11, 8, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'An & Phúc', 'Ích & Khánh', 0, 0, 'A', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bình & Quỳnh', 'Cường & Rồng', 2, 1, 'A', 'group', 'group', 'completed', 11, 8, 9, 11, 11, 9, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bình & Quỳnh', 'Giang & Hoa', 0, 0, 'A', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bình & Quỳnh', 'Ích & Khánh', 0, 0, 'A', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cường & Rồng', 'Giang & Hoa', 0, 0, 'A', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cường & Rồng', 'Ích & Khánh', 0, 0, 'A', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Giang & Hoa', 'Ích & Khánh', 0, 0, 'A', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, NOW());

-- Group B matches (10 matches: 5 teams round-robin)
INSERT INTO matches (tournament_id, "teamA", "teamB", "scoreA", "scoreB", group_name, stage, match_type, status, s1a, s1b, s2a, s2b, s3a, s3b, created_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dung & Sương', 'Em & Tài', 2, 0, 'B', 'group', 'group', 'completed', 11, 7, 11, 9, 0, 0, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dung & Sương', 'Phượng & Uyên', 2, 1, 'B', 'group', 'group', 'completed', 11, 9, 8, 11, 11, 9, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dung & Sương', 'Lâm & Mai', 0, 0, 'B', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dung & Sương', 'Nam & Oanh', 0, 0, 'B', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Em & Tài', 'Phượng & Uyên', 2, 0, 'B', 'group', 'group', 'completed', 11, 8, 11, 9, 0, 0, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Em & Tài', 'Lâm & Mai', 0, 0, 'B', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Em & Tài', 'Nam & Oanh', 0, 0, 'B', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Phượng & Uyên', 'Lâm & Mai', 0, 0, 'B', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Phượng & Uyên', 'Nam & Oanh', 0, 0, 'B', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lâm & Mai', 'Nam & Oanh', 0, 0, 'B', 'group', 'group', 'not_started', 0, 0, 0, 0, 0, 0, NOW());

-- Summary:
-- ✅ 20 members (6 T1, 8 T2, 6 T3)
-- ✅ 1 tournament (ongoing)
-- ✅ 20 participants
-- ✅ 10 teams (5 per group)
-- ✅ 20 group matches (10 per group)
-- ✅ Some matches completed, some not started (realistic ongoing tournament)
