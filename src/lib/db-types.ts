export interface DbPeriod {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  active: boolean;
  created_at: string;
}

export interface DbGoal {
  id: string;
  user_id: string;
  period_id: string;
  title: string;
  description: string;
  progress: number;
  created_at: string;
}

export interface DbTactic {
  id: string;
  user_id: string;
  goal_id: string;
  title: string;
  completed: boolean;
  due_week: number | null;
  due_date: string | null;
  created_at: string;
}

export interface DbTodo {
  id: string;
  user_id: string;
  title: string;
  date: string | null;
  completed: boolean;
  kind: 'todo' | 'ddl' | null;
  category: 'chore' | 'general' | 'academic' | 'health' | null;
  completed_at: string | null;
  goal_id: string | null;
  tactic_id: string | null;
  created_at: string;
}

export interface DbWeeklyScore {
  id: string;
  user_id: string;
  period_id: string;
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  execution_score: number;
  notes: string;
  created_at: string;
}

export interface DbNutritionEntry {
  id: string;
  user_id: string;
  date: string;
  time: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  emoji: string | null;
  image_url: string | null;
  notes: string;
  source: 'manual' | 'mcp' | 'import';
  created_at: string;
  updated_at: string;
}

export interface DbNutritionTarget {
  id: string;
  user_id: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  updated_at: string;
}
