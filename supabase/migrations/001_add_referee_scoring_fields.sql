-- Migration: Add referee scoring system fields to matches table
-- This migration extends the existing matches table with fields needed for
-- the referee scoring system: serving state, set tracking, and match configuration

-- Add serving state fields
ALTER TABLE matches 
  ADD COLUMN IF NOT EXISTS serving_team TEXT CHECK (serving_team IN ('A', 'B')),
  ADD COLUMN IF NOT EXISTS server_number INTEGER CHECK (server_number IN (1, 2));

-- Add set tracking fields
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS current_set INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS completed_sets JSONB DEFAULT '[]';

-- Add match configuration field
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS match_config JSONB DEFAULT '{
    "matchFormat": "BO3",
    "targetScore": 11,
    "winByMargin": 2,
    "firstServeSingle": true,
    "enableFaultButtons": false
  }';

-- Add updated_by field for conflict detection
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- Update existing matches with default values
UPDATE matches 
SET 
  serving_team = 'A',
  server_number = 1,
  current_set = 1,
  completed_sets = '[]',
  match_config = '{
    "matchFormat": "BO3",
    "targetScore": 11,
    "winByMargin": 2,
    "firstServeSingle": true,
    "enableFaultButtons": false
  }'
WHERE serving_team IS NULL;

-- Create index for real-time queries
CREATE INDEX IF NOT EXISTS idx_matches_tournament_status ON matches(tournament_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_updated_at ON matches(updated_at);

-- Add comment for documentation
COMMENT ON COLUMN matches.serving_team IS 'Current serving team: A or B';
COMMENT ON COLUMN matches.server_number IS 'Current server number: 1 or 2';
COMMENT ON COLUMN matches.current_set IS 'Current set number (1-based)';
COMMENT ON COLUMN matches.completed_sets IS 'Array of completed set records with scores and winners';
COMMENT ON COLUMN matches.match_config IS 'Match configuration including format, target score, and rules';
COMMENT ON COLUMN matches.updated_by IS 'ID of referee who last updated the match';
