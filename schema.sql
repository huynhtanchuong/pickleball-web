-- ============================================================
--  Pickleball Tournament — Database Schema v2
--  PostgreSQL / Supabase
--
--  Tables
--    members                — global player registry
--    tournaments            — tournament metadata
--    tournament_participants — members enrolled per tournament
--    teams                  — pairs created during tournament pairing
--    matches                — all match records, scoped per tournament
--
--  Naming: snake_case throughout
--  Run in order; each section is idempotent (DROP IF EXISTS first)
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Drop existing tables (reverse dependency order) ──────────
DROP TABLE IF EXISTS matches               CASCADE;
DROP TABLE IF EXISTS teams                 CASCADE;
DROP TABLE IF EXISTS tournament_participants CASCADE;
DROP TABLE IF EXISTS tournaments           CASCADE;
DROP TABLE IF EXISTS members               CASCADE;

-- ============================================================
--  1. members  — persistent global player registry
--     Lives outside any tournament; reused across events.
-- ============================================================
CREATE TABLE members (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  tier        INTEGER     NOT NULL CHECK (tier IN (1, 2, 3)),
  -- tier meaning: 1 = strong / T1, 2 = mid / T2, 3 = beginner / T3
  phone       TEXT,
  email       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  2. tournaments
-- ============================================================
CREATE TABLE tournaments (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  start_date  DATE,
  end_date    DATE,
  status      TEXT        NOT NULL DEFAULT 'upcoming'
                CHECK (status IN ('upcoming', 'ongoing', 'completed')),
  archived    BOOLEAN     DEFAULT FALSE,
  -- config stores flexible tournament settings as JSON:
  --   { numGroups, teamsPerGroup, enableThirdPlace, enableConsolation,
  --     matchFormat, targetScore, winByMargin }
  config      JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  3. tournament_participants
--     Junction table: which members are in which tournament.
--     tier_override lets admins bump a player up/down for one event.
-- ============================================================
CREATE TABLE tournament_participants (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id   UUID    NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  member_id       UUID    NOT NULL REFERENCES members(id)     ON DELETE RESTRICT,
  tier_override   INTEGER CHECK (tier_override IN (1, 2, 3)),
  is_seeded       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tournament_id, member_id)
);

-- ============================================================
--  4. teams
--     Created during pairing for a specific tournament.
--     Deleted automatically when the tournament is deleted (CASCADE).
--     Do NOT share or reuse across tournaments.
-- ============================================================
CREATE TABLE teams (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID    NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name          TEXT    NOT NULL,
  -- member FKs are nullable: team names may be manually entered
  member1_id    UUID    REFERENCES members(id) ON DELETE SET NULL,
  member2_id    UUID    REFERENCES members(id) ON DELETE SET NULL,
  group_name    TEXT,        -- A, B, C, …
  tier          TEXT,        -- T1 | T2 | T3  (derived from members at pairing time)
  is_seeded     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  5. matches
--     All match records, scoped to a tournament.
--
--  Scoring modes:
--    group stage  — direct points: score_a / score_b
--    semi / final — best-of-3 sets: s1a/s1b, s2a/s2b, s3a/s3b
--                   score_a / score_b = sets won (computed)
-- ============================================================
CREATE TABLE matches (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID    NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,

  -- Team display names (denormalised for fast rendering & offline use)
  team_a        TEXT    NOT NULL DEFAULT '',
  team_b        TEXT    NOT NULL DEFAULT '',

  -- Optional FK to teams table (for member-level reporting)
  team_a_id     UUID    REFERENCES teams(id) ON DELETE SET NULL,
  team_b_id     UUID    REFERENCES teams(id) ON DELETE SET NULL,

  -- ── Scores ────────────────────────────────────────────────
  -- group stage: raw points entered by referee
  -- semi / final: number of sets won (computed from s* fields)
  score_a       INTEGER DEFAULT 0,
  score_b       INTEGER DEFAULT 0,

  -- Individual set scores (only used for semi / final)
  s1a  INTEGER DEFAULT 0,  s1b  INTEGER DEFAULT 0,
  s2a  INTEGER DEFAULT 0,  s2b  INTEGER DEFAULT 0,
  s3a  INTEGER DEFAULT 0,  s3b  INTEGER DEFAULT 0,

  -- ── Tournament structure ───────────────────────────────────
  group_name    TEXT,
  stage         TEXT    NOT NULL DEFAULT 'group'
                  CHECK (stage IN ('group','semi','final',
                                   'third_place','consolation','exhibition')),
  match_order   INTEGER,   -- display / schedule order within stage+group

  -- ── Match status ──────────────────────────────────────────
  status        TEXT    NOT NULL DEFAULT 'not_started'
                  CHECK (status IN ('not_started','playing','done')),

  -- ── Live serving state (updated by referee in real-time) ──
  serving_team  TEXT    CHECK (serving_team IN ('A','B')),
  server_number INTEGER CHECK (server_number IN (1, 2)),

  -- ── Schedule / logistics ──────────────────────────────────
  match_time    TEXT,       -- e.g. "7h20", "09:00"
  court         TEXT,
  referee_name  TEXT,

  -- ── Optimistic concurrency lock ───────────────────────────
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  Indexes
-- ============================================================
CREATE INDEX idx_matches_tournament    ON matches (tournament_id);
CREATE INDEX idx_matches_stage         ON matches (tournament_id, stage);
CREATE INDEX idx_matches_status        ON matches (tournament_id, status);
CREATE INDEX idx_teams_tournament      ON teams   (tournament_id);
CREATE INDEX idx_tp_tournament         ON tournament_participants (tournament_id);
CREATE INDEX idx_tp_member             ON tournament_participants (member_id);

-- ============================================================
--  updated_at auto-trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tournaments_updated
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_matches_updated
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
--  Realtime
--  Run these once in Supabase dashboard > Database > Replication
--    or via Supabase CLI after applying this migration.
-- ============================================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE matches;
-- ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;

-- ============================================================
--  Row Level Security (RLS)
--
--  This app uses shared passwords stored client-side, so true
--  per-user RLS is not enforced.  Enable only if you switch to
--  Supabase Auth with JWT tokens.
--
--  For now, anon role has full read; service_role has full write.
--  Restrict writes on the Supabase dashboard under
--  Authentication > Policies if needed.
-- ============================================================
-- ALTER TABLE members               ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tournaments           ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE teams                 ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE matches               ENABLE ROW LEVEL SECURITY;
