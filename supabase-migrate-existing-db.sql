-- DayCraft incremental migration for an existing Supabase database.
-- Run this in Supabase SQL Editor instead of the full supabase-schema.sql
-- when periods/goals/tactics/todos already exist.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Kanban / task fields added by the 12weekyear UI.
ALTER TABLE todos
  ALTER COLUMN date DROP NOT NULL;

ALTER TABLE tactics
  ADD COLUMN IF NOT EXISTS due_date DATE;

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'todo',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tactic_id UUID REFERENCES tactics(id) ON DELETE SET NULL;

ALTER TABLE todos
  DROP CONSTRAINT IF EXISTS todos_kind_check,
  ADD CONSTRAINT todos_kind_check CHECK (kind IN ('todo', 'ddl'));

ALTER TABLE todos
  DROP CONSTRAINT IF EXISTS todos_category_check,
  ADD CONSTRAINT todos_category_check CHECK (category IN ('chore', 'general', 'academic', 'health'));

CREATE INDEX IF NOT EXISTS idx_tactics_user ON tactics(user_id);
CREATE INDEX IF NOT EXISTS idx_tactics_goal ON tactics(goal_id);
CREATE INDEX IF NOT EXISTS idx_todos_user_date ON todos(user_id, date);
CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id);

-- Nutrition tracking.
CREATE TABLE IF NOT EXISTS nutrition_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) NOT NULL,
  date        DATE NOT NULL,
  time        TEXT NOT NULL,
  meal        TEXT NOT NULL CHECK (meal IN ('breakfast', 'lunch', 'dinner', 'snack')),
  name        TEXT NOT NULL,
  calories    NUMERIC DEFAULT 0,
  protein     NUMERIC DEFAULT 0,
  carbs       NUMERIC DEFAULT 0,
  fat         NUMERIC DEFAULT 0,
  emoji       TEXT,
  image_url   TEXT,
  notes       TEXT DEFAULT '',
  source      TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'mcp', 'import')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_entries_user_date ON nutrition_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_nutrition_entries_user ON nutrition_entries(user_id);

CREATE TABLE IF NOT EXISTS nutrition_targets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  calories    NUMERIC DEFAULT 1800,
  protein     NUMERIC DEFAULT 150,
  carbs       NUMERIC DEFAULT 180,
  fat         NUMERIC DEFAULT 55,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE nutrition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_data" ON nutrition_entries;
CREATE POLICY "own_data" ON nutrition_entries
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own_data" ON nutrition_targets;
CREATE POLICY "own_data" ON nutrition_targets
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
