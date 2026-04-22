# Supabase Migrations for Referee Scoring System

This directory contains database migrations for the Pickleball Referee Scoring System.

## Migrations

### 001_add_referee_scoring_fields.sql

Adds the following fields to the `matches` table:

- `serving_team` (TEXT): Current serving team ('A' or 'B')
- `server_number` (INTEGER): Current server (1 or 2)
- `current_set` (INTEGER): Current set number (1-based)
- `completed_sets` (JSONB): Array of completed set records
- `match_config` (JSONB): Match configuration (format, target score, rules)
- `updated_by` (TEXT): ID of referee who last updated the match

Also creates indexes for optimized queries:
- `idx_matches_tournament_status`: For filtering by tournament and status
- `idx_matches_updated_at`: For conflict detection

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/negwxhrkdypiopmmrxkf
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `001_add_referee_scoring_fields.sql`
5. Paste into the SQL editor
6. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref negwxhrkdypiopmmrxkf

# Apply migration
supabase db push
```

### Option 3: Using the MCP Supabase Tool

If you're using Kiro with the Supabase MCP server:

```javascript
// Use the mcp_supabase_apply_migration tool
await mcp_supabase_apply_migration({
  name: "add_referee_scoring_fields",
  query: "<contents of 001_add_referee_scoring_fields.sql>"
});
```

## Verification

After applying the migration, verify the changes:

```sql
-- Check that new columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'matches'
  AND column_name IN ('serving_team', 'server_number', 'current_set', 'completed_sets', 'match_config', 'updated_by');

-- Check that indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'matches'
  AND indexname IN ('idx_matches_tournament_status', 'idx_matches_updated_at');

-- Verify existing matches have default values
SELECT id, serving_team, server_number, current_set, match_config
FROM matches
LIMIT 5;
```

## Rollback

If you need to rollback this migration:

```sql
-- Remove added columns
ALTER TABLE matches
  DROP COLUMN IF EXISTS serving_team,
  DROP COLUMN IF EXISTS server_number,
  DROP COLUMN IF EXISTS current_set,
  DROP COLUMN IF EXISTS completed_sets,
  DROP COLUMN IF EXISTS match_config,
  DROP COLUMN IF EXISTS updated_by;

-- Remove indexes
DROP INDEX IF EXISTS idx_matches_tournament_status;
DROP INDEX IF EXISTS idx_matches_updated_at;
```

## Notes

- This migration is **safe to run multiple times** (uses `IF NOT EXISTS` and `IF NULL` checks)
- Existing matches will be updated with default values:
  - `serving_team = 'A'`
  - `server_number = 1`
  - `current_set = 1`
  - `completed_sets = []`
  - Default match config (BO3, 11 points, win by 2)
- The migration preserves all existing match data
- Indexes are created to optimize real-time queries and conflict detection
