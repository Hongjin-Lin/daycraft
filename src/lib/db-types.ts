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
  created_at: string;
}

export interface DbTodo {
  id: string;
  user_id: string;
  title: string;
  date: string;
  completed: boolean;
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
