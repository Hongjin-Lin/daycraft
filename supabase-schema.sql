-- DayCraft Supabase Schema
-- Run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. periods
CREATE TABLE periods (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_periods_user ON periods(user_id);

-- 2. goals
CREATE TABLE goals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) NOT NULL,
  period_id   UUID REFERENCES periods(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  progress    INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_goals_period ON goals(period_id);
CREATE INDEX idx_goals_user ON goals(user_id);

-- 3. tactics
CREATE TABLE tactics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) NOT NULL,
  goal_id     UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  completed   BOOLEAN DEFAULT false,
  due_week    INTEGER,
  due_date    DATE,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_tactics_goal ON tactics(goal_id);
CREATE INDEX idx_tactics_user ON tactics(user_id);

-- 4. todos
CREATE TABLE todos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) NOT NULL,
  title       TEXT NOT NULL,
  date        DATE,
  completed   BOOLEAN DEFAULT false,
  kind        TEXT DEFAULT 'todo' CHECK (kind IN ('todo', 'ddl')),
  category    TEXT DEFAULT 'general' CHECK (category IN ('chore', 'general', 'academic', 'health')),
  completed_at TIMESTAMPTZ,
  goal_id     UUID REFERENCES goals(id) ON DELETE SET NULL,
  tactic_id   UUID REFERENCES tactics(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_todos_user_date ON todos(user_id, date);
CREATE INDEX idx_todos_user ON todos(user_id);

-- 5. weekly_scores
CREATE TABLE weekly_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) NOT NULL,
  period_id       UUID REFERENCES periods(id) ON DELETE CASCADE NOT NULL,
  week_number     INTEGER NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date   DATE NOT NULL,
  execution_score INTEGER DEFAULT 0,
  notes           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(period_id, week_number)
);
CREATE INDEX idx_weekly_scores_user ON weekly_scores(user_id);

-- 6. nutrition entries
CREATE TABLE nutrition_entries (
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
CREATE INDEX idx_nutrition_entries_user_date ON nutrition_entries(user_id, date);
CREATE INDEX idx_nutrition_entries_user ON nutrition_entries(user_id);

-- 7. nutrition targets
CREATE TABLE nutrition_targets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  calories    NUMERIC DEFAULT 1800,
  protein     NUMERIC DEFAULT 150,
  carbs       NUMERIC DEFAULT 180,
  fat         NUMERIC DEFAULT 55,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE periods       ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tactics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_data" ON periods       FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_data" ON goals         FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_data" ON tactics       FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_data" ON todos         FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_data" ON weekly_scores FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_data" ON nutrition_entries FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_data" ON nutrition_targets FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
