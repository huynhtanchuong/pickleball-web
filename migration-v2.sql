-- ============================================================
--  Migration v2 — Pickleball Tournament
--  Safe to run on existing databases. Idempotent.
--
--  Adds new tables/columns introduced by the v2 schema redesign
--  WITHOUT dropping any existing data.
--
--  Run in Supabase Dashboard → SQL Editor.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
--  1. members (create if missing)
-- ============================================================
CREATE TABLE IF NOT EXISTS members (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  tier        INTEGER     NOT NULL CHECK (tier IN (1, 2, 3)),
  phone       TEXT,
  email       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  2. tournaments (create if missing, then add columns)
-- ============================================================
CREATE TABLE IF NOT EXISTS tournaments (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  start_date  DATE,
  end_date    DATE,
  status      TEXT        NOT NULL DEFAULT 'upcoming',
  archived    BOOLEAN     DEFAULT FALSE,
  config      JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS end_date   DATE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS status     TEXT DEFAULT 'upcoming';
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS archived   BOOLEAN DEFAULT FALSE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS config     JSONB DEFAULT '{}';
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure the status check constraint exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_status_check'
  ) THEN
    ALTER TABLE tournaments
      ADD CONSTRAINT tournaments_status_check
      CHECK (status IN ('upcoming', 'ongoing', 'completed'));
  END IF;
END $$;

-- ============================================================
--  3. tournament_participants
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_participants (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id   UUID    NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  member_id       UUID    NOT NULL REFERENCES members(id)     ON DELETE RESTRICT,
  tier_override   INTEGER CHECK (tier_override IN (1, 2, 3)),
  is_seeded       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tournament_id, member_id)
);

-- ============================================================
--  4. teams — add new columns introduced by v2
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID    REFERENCES tournaments(id) ON DELETE CASCADE,
  name          TEXT,
  member1_id    UUID    REFERENCES members(id) ON DELETE SET NULL,
  member2_id    UUID    REFERENCES members(id) ON DELETE SET NULL,
  group_name    TEXT,
  tier          TEXT,
  is_seeded     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE teams ADD COLUMN IF NOT EXISTS tournament_id UUID;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS member1_id    UUID;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS member2_id    UUID;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS group_name    TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS tier          TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_seeded     BOOLEAN DEFAULT FALSE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ DEFAULT NOW();

-- Add foreign keys if not already present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teams_tournament_id_fkey'
  ) THEN
    ALTER TABLE teams
      ADD CONSTRAINT teams_tournament_id_fkey
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teams_member1_id_fkey'
  ) THEN
    ALTER TABLE teams
      ADD CONSTRAINT teams_member1_id_fkey
      FOREIGN KEY (member1_id) REFERENCES members(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teams_member2_id_fkey'
  ) THEN
    ALTER TABLE teams
      ADD CONSTRAINT teams_member2_id_fkey
      FOREIGN KEY (member2_id) REFERENCES members(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
--  5. matches — add snake_case columns (v2)
--
--  v1 used camelCase teamA/teamB/scoreA/scoreB.
--  v2 uses snake_case team_a/team_b/score_a/score_b.
--  We add the new columns alongside and copy data from old → new
--  if the old columns still exist.
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID    REFERENCES tournaments(id) ON DELETE CASCADE,
  team_a        TEXT    NOT NULL DEFAULT '',
  team_b        TEXT    NOT NULL DEFAULT '',
  score_a       INTEGER DEFAULT 0,
  score_b       INTEGER DEFAULT 0,
  s1a INTEGER DEFAULT 0, s1b INTEGER DEFAULT 0,
  s2a INTEGER DEFAULT 0, s2b INTEGER DEFAULT 0,
  s3a INTEGER DEFAULT 0, s3b INTEGER DEFAULT 0,
  group_name    TEXT,
  stage         TEXT    NOT NULL DEFAULT 'group',
  match_order   INTEGER,
  status        TEXT    NOT NULL DEFAULT 'not_started',
  serving_team  TEXT,
  server_number INTEGER,
  match_time    TEXT,
  court         TEXT,
  referee_name  TEXT,
  team_a_id     UUID    REFERENCES teams(id) ON DELETE SET NULL,
  team_b_id     UUID    REFERENCES teams(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament_id UUID;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_a        TEXT DEFAULT '';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_b        TEXT DEFAULT '';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS score_a       INTEGER DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS score_b       INTEGER DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS s1a INTEGER DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS s1b INTEGER DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS s2a INTEGER DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS s2b INTEGER DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS s3a INTEGER DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS s3b INTEGER DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS group_name    TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS stage         TEXT DEFAULT 'group';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_order   INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS status        TEXT DEFAULT 'not_started';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS serving_team  TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS server_number INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_time    TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS court         TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS referee_name  TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_a_id     UUID;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_b_id     UUID;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE matches ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ DEFAULT NOW();

-- Copy data from legacy camelCase columns into snake_case if they exist
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'teama'
  ) THEN
    UPDATE matches SET team_a  = COALESCE(team_a, '')  || COALESCE("teamA", '')  WHERE team_a  = '';
    UPDATE matches SET team_b  = COALESCE(team_b, '')  || COALESCE("teamB", '')  WHERE team_b  = '';
    UPDATE matches SET score_a = COALESCE(score_a, 0) + COALESCE("scoreA", 0) WHERE score_a IS NULL OR score_a = 0;
    UPDATE matches SET score_b = COALESCE(score_b, 0) + COALESCE("scoreB", 0) WHERE score_b IS NULL OR score_b = 0;
  END IF;
EXCEPTION WHEN undefined_column THEN
  -- legacy columns not present; nothing to copy
  NULL;
END $$;

-- ============================================================
--  6. Indexes (idempotent)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches (tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_stage      ON matches (tournament_id, stage);
CREATE INDEX IF NOT EXISTS idx_matches_status     ON matches (tournament_id, status);
CREATE INDEX IF NOT EXISTS idx_teams_tournament   ON teams   (tournament_id);
CREATE INDEX IF NOT EXISTS idx_tp_tournament      ON tournament_participants (tournament_id);
CREATE INDEX IF NOT EXISTS idx_tp_member          ON tournament_participants (member_id);

-- ============================================================
--  7. updated_at auto-trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tournaments_updated ON tournaments;
CREATE TRIGGER trg_tournaments_updated
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_matches_updated ON matches;
CREATE TRIGGER trg_matches_updated
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
--  Done. Refresh the schema cache by running this once:
--    NOTIFY pgrst, 'reload schema';
-- ============================================================
NOTIFY pgrst, 'reload schema';
