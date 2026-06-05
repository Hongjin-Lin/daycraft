export interface Tactic {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string; // yyyy-MM-dd, exact day this tactic should be completed
  dueWeek?: number; // Legacy: 1-12, which week this tactic should be completed
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  tactics: Tactic[];
  progress: number;
}

export interface WeekPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  goals: Goal[];
  active: boolean;
}

export interface Todo {
  id: string;
  title: string;
  date?: string; // ISO date string, optional for unscheduled kanban todos
  completed: boolean;
  kind?: 'todo' | 'ddl';
  category?: 'chore' | 'general' | 'academic' | 'health';
  completedAt?: string;
  goalId?: string;
  tacticId?: string;
}

export interface WeeklyScore {
  id: string;
  weekNumber: number; // 1-12
  weekStartDate: string;
  weekEndDate: string;
  executionScore: number; // 0-100
  notes: string;
  periodId: string;
}
