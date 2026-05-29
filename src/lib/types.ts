export interface Tactic {
  id: string;
  title: string;
  completed: boolean;
  dueWeek?: number; // 1-12, which week this tactic should be completed
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
  date: string; // ISO date string
  completed: boolean;
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