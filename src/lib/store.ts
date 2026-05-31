import { create } from 'zustand';
import { supabase } from './supabase';
import { WeekPeriod, Goal, Todo, Tactic, WeeklyScore } from './types';
import { DbPeriod, DbGoal, DbTactic, DbTodo, DbWeeklyScore } from './db-types';
import { dateFromISO, endDateForWeeks, formatISODate } from './period-utils';

// --- helpers to convert between DB rows and app types ---

function toPeriod(row: DbPeriod, goals: Goal[]): WeekPeriod {
  return {
    id: row.id,
    startDate: dateFromISO(row.start_date),
    endDate: dateFromISO(row.end_date),
    goals,
    active: row.active,
  };
}

function toGoal(row: DbGoal, tactics: Tactic[]): Goal {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    tactics,
    progress: row.progress,
  };
}

function toTactic(row: DbTactic): Tactic {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    dueWeek: row.due_week ?? undefined,
  };
}

function toTodo(row: DbTodo): Todo {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    completed: row.completed,
    goalId: row.goal_id ?? undefined,
    tacticId: row.tactic_id ?? undefined,
  };
}

function toWeeklyScore(row: DbWeeklyScore): WeeklyScore {
  return {
    id: row.id,
    weekNumber: row.week_number,
    weekStartDate: row.week_start_date,
    weekEndDate: row.week_end_date,
    executionScore: row.execution_score,
    notes: row.notes,
    periodId: row.period_id,
  };
}

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  return session.user.id;
}

// --- store ---

interface AppState {
  periods: WeekPeriod[];
  todos: Todo[];
  activePeriodId: string | null;
  weeklyScores: WeeklyScore[];
  loading: boolean;

  loadAll: () => Promise<void>;
  migrateFromLocalStorage: () => Promise<void>;

  createPeriod: (startDate: Date, endDate?: Date) => Promise<void>;
  updatePeriod: (periodId: string, updates: Pick<WeekPeriod, 'startDate' | 'endDate'>) => Promise<void>;

  addGoal: (goal: Omit<Goal, 'id' | 'progress'>) => Promise<void>;
  updateGoal: (goalId: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;

  addTactic: (goalId: string, title: string, dueWeek?: number) => Promise<void>;
  toggleTactic: (goalId: string, tacticId: string) => Promise<void>;
  deleteTactic: (goalId: string, tacticId: string) => Promise<void>;

  addTodo: (todo: Omit<Todo, 'id'>) => Promise<void>;
  updateTodo: (todoId: string, updates: Partial<Todo>) => Promise<void>;
  deleteTodo: (todoId: string) => Promise<void>;
  toggleTodo: (todoId: string) => Promise<void>;

  saveWeeklyScore: (score: Omit<WeeklyScore, 'id'>) => Promise<void>;
  updateWeeklyScore: (scoreId: string, updates: Partial<WeeklyScore>) => Promise<void>;
  getWeeklyScore: (periodId: string, weekNumber: number) => WeeklyScore | undefined;

  getActivePeriod: () => WeekPeriod | undefined;
  calculateGoalProgress: (goalId: string) => void;

  subscribeToChanges: () => () => void;
}

export const useStore = create<AppState>()((set, get) => ({
  periods: [],
  todos: [],
  activePeriodId: null,
  weeklyScores: [],
  loading: true,

  // ========== HYDRATION ==========
  loadAll: async () => {
    const userId = await getUserId();

    const [periodsRes, goalsRes, tacticsRes, todosRes, scoresRes] = await Promise.all([
      supabase.from('periods').select('*').eq('user_id', userId),
      supabase.from('goals').select('*').eq('user_id', userId),
      supabase.from('tactics').select('*').eq('user_id', userId),
      supabase.from('todos').select('*').eq('user_id', userId),
      supabase.from('weekly_scores').select('*').eq('user_id', userId),
    ]);

    const tacticsByGoal = new Map<string, Tactic[]>();
    for (const row of (tacticsRes.data ?? []) as DbTactic[]) {
      const list = tacticsByGoal.get(row.goal_id) ?? [];
      list.push(toTactic(row));
      tacticsByGoal.set(row.goal_id, list);
    }

    const goalsByPeriod = new Map<string, Goal[]>();
    for (const row of (goalsRes.data ?? []) as DbGoal[]) {
      const list = goalsByPeriod.get(row.period_id) ?? [];
      list.push(toGoal(row, tacticsByGoal.get(row.id) ?? []));
      goalsByPeriod.set(row.period_id, list);
    }

    const periods = ((periodsRes.data ?? []) as DbPeriod[]).map(row =>
      toPeriod(row, goalsByPeriod.get(row.id) ?? [])
    );

    const todos = ((todosRes.data ?? []) as DbTodo[]).map(toTodo);
    const weeklyScores = ((scoresRes.data ?? []) as DbWeeklyScore[]).map(toWeeklyScore);
    const activePeriod = periods.find(p => p.active);

    set({
      periods,
      todos,
      weeklyScores,
      activePeriodId: activePeriod?.id ?? null,
      loading: false,
    });
  },

  // ========== MIGRATE FROM LOCALSTORAGE ==========
  migrateFromLocalStorage: async () => {
    const str = localStorage.getItem('12-week-year-storage');
    if (!str) return;

    const { state } = JSON.parse(str);
    if (!state || !state.periods || state.periods.length === 0) return;

    const userId = await getUserId();

    for (const period of state.periods) {
      const { data: periodData, error: periodError } = await supabase
        .from('periods')
        .insert({
          user_id: userId,
          start_date: period.startDate,
          end_date: period.endDate,
          active: period.active ?? false,
        })
        .select()
        .single();

      if (periodError || !periodData) continue;

      for (const goal of period.goals ?? []) {
        const { data: goalData, error: goalError } = await supabase
          .from('goals')
          .insert({
            user_id: userId,
            period_id: periodData.id,
            title: goal.title,
            description: goal.description ?? '',
            progress: goal.progress ?? 0,
          })
          .select()
          .single();

        if (goalError || !goalData) continue;

        for (const tactic of goal.tactics ?? []) {
          await supabase.from('tactics').insert({
            user_id: userId,
            goal_id: goalData.id,
            title: tactic.title,
            completed: tactic.completed ?? false,
            due_week: tactic.dueWeek ?? null,
          });
        }
      }
    }

    // Migrate todos
    for (const todo of state.todos ?? []) {
      await supabase.from('todos').insert({
        user_id: userId,
        title: todo.title,
        date: todo.date,
        completed: todo.completed ?? false,
        goal_id: todo.goalId ?? null,
        tactic_id: todo.tacticId ?? null,
      });
    }

    // Migrate weekly scores
    for (const score of state.weeklyScores ?? []) {
      // Find the migrated period by matching dates (old IDs won't match)
      const { data: periods } = await supabase
        .from('periods')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (periods && periods.length > 0) {
        await supabase.from('weekly_scores').insert({
          user_id: userId,
          period_id: periods[0].id,
          week_number: score.weekNumber,
          week_start_date: score.weekStartDate,
          week_end_date: score.weekEndDate,
          execution_score: score.executionScore ?? 0,
          notes: score.notes ?? '',
        });
      }
    }

    // Clear localStorage after migration
    localStorage.removeItem('12-week-year-storage');
  },

  // ========== PERIOD ACTIONS ==========
  createPeriod: async (startDate: Date, customEndDate?: Date) => {
    const userId = await getUserId();
    const endDate = customEndDate ?? endDateForWeeks(startDate, 12);

    const { data: existing } = await supabase
      .from('periods')
      .select('id')
      .eq('user_id', userId)
      .eq('active', true);

    if (existing && existing.length > 0) {
      await supabase
        .from('periods')
        .update({ active: false })
        .in('id', existing.map((p: { id: string }) => p.id));
    }

    const { data, error } = await supabase
      .from('periods')
      .insert({
        user_id: userId,
        start_date: formatISODate(startDate),
        end_date: formatISODate(endDate),
        active: true,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create period');

    const newPeriod: WeekPeriod = {
      id: data.id,
      startDate,
      endDate,
      goals: [],
      active: true,
    };

    set(state => ({
      periods: [...state.periods.map(p => ({ ...p, active: false })), newPeriod],
      activePeriodId: newPeriod.id,
    }));
  },

  updatePeriod: async (periodId, updates) => {
    const { error } = await supabase
      .from('periods')
      .update({
        start_date: formatISODate(updates.startDate),
        end_date: formatISODate(updates.endDate),
      })
      .eq('id', periodId);

    if (error) throw error;

    set(state => ({
      periods: state.periods.map(p =>
        p.id === periodId
          ? { ...p, startDate: updates.startDate, endDate: updates.endDate }
          : p
      ),
    }));
  },

  // ========== GOAL ACTIONS ==========
  addGoal: async (goal) => {
    const userId = await getUserId();
    const activePeriod = get().getActivePeriod();
    if (!activePeriod) return;

    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        period_id: activePeriod.id,
        title: goal.title,
        description: goal.description ?? '',
        progress: 0,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to add goal');

    const newGoal = toGoal(data, []);
    set(state => ({
      periods: state.periods.map(p =>
        p.id === activePeriod.id
          ? { ...p, goals: [...p.goals, newGoal] }
          : p
      ),
    }));
  },

  updateGoal: async (goalId, updates) => {
    const dbUpdates: Record<string, any> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.progress !== undefined) dbUpdates.progress = updates.progress;

    const { error } = await supabase.from('goals').update(dbUpdates).eq('id', goalId);
    if (error) throw error;

    set(state => ({
      periods: state.periods.map(p => ({
        ...p,
        goals: p.goals.map(g => g.id === goalId ? { ...g, ...updates } : g),
      })),
    }));
  },

  deleteGoal: async (goalId) => {
    const { error } = await supabase.from('goals').delete().eq('id', goalId);
    if (error) throw error;

    set(state => ({
      periods: state.periods.map(p => ({
        ...p,
        goals: p.goals.filter(g => g.id !== goalId),
      })),
      todos: state.todos.filter(t => t.goalId !== goalId),
    }));
  },

  // ========== TACTIC ACTIONS ==========
  addTactic: async (goalId, title, dueWeek) => {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('tactics')
      .insert({
        user_id: userId,
        goal_id: goalId,
        title,
        completed: false,
        due_week: dueWeek ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to add tactic');

    const newTactic = toTactic(data);
    set(state => ({
      periods: state.periods.map(p => ({
        ...p,
        goals: p.goals.map(g =>
          g.id === goalId ? { ...g, tactics: [...g.tactics, newTactic] } : g
        ),
      })),
    }));

    get().calculateGoalProgress(goalId);
  },

  toggleTactic: async (goalId, tacticId) => {
    const period = get().periods.find(p => p.goals.some(g => g.id === goalId));
    const goal = period?.goals.find(g => g.id === goalId);
    const tactic = goal?.tactics.find(t => t.id === tacticId);
    if (!tactic) return;

    const newCompleted = !tactic.completed;
    const { error } = await supabase
      .from('tactics')
      .update({ completed: newCompleted })
      .eq('id', tacticId);

    if (error) throw error;

    set(state => ({
      periods: state.periods.map(p => ({
        ...p,
        goals: p.goals.map(g =>
          g.id === goalId
            ? {
                ...g,
                tactics: g.tactics.map(t =>
                  t.id === tacticId ? { ...t, completed: newCompleted } : t
                ),
              }
            : g
        ),
      })),
    }));

    get().calculateGoalProgress(goalId);
  },

  deleteTactic: async (goalId, tacticId) => {
    const { error } = await supabase.from('tactics').delete().eq('id', tacticId);
    if (error) throw error;

    set(state => ({
      periods: state.periods.map(p => ({
        ...p,
        goals: p.goals.map(g =>
          g.id === goalId
            ? { ...g, tactics: g.tactics.filter(t => t.id !== tacticId) }
            : g
        ),
      })),
      todos: state.todos.filter(t => t.tacticId !== tacticId),
    }));

    get().calculateGoalProgress(goalId);
  },

  // ========== TODO ACTIONS ==========
  addTodo: async (todo) => {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('todos')
      .insert({
        user_id: userId,
        title: todo.title,
        date: todo.date,
        completed: todo.completed ?? false,
        goal_id: todo.goalId ?? null,
        tactic_id: todo.tacticId ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to add todo');

    set(state => ({ todos: [...state.todos, toTodo(data)] }));
  },

  updateTodo: async (todoId, updates) => {
    const dbUpdates: Record<string, any> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
    if (updates.goalId !== undefined) dbUpdates.goal_id = updates.goalId;
    if (updates.tacticId !== undefined) dbUpdates.tactic_id = updates.tacticId;

    const { error } = await supabase.from('todos').update(dbUpdates).eq('id', todoId);
    if (error) throw error;

    set(state => ({
      todos: state.todos.map(t => t.id === todoId ? { ...t, ...updates } : t),
    }));
  },

  deleteTodo: async (todoId) => {
    const { error } = await supabase.from('todos').delete().eq('id', todoId);
    if (error) throw error;

    set(state => ({ todos: state.todos.filter(t => t.id !== todoId) }));
  },

  toggleTodo: async (todoId) => {
    const todo = get().todos.find(t => t.id === todoId);
    if (!todo) return;

    const newCompleted = !todo.completed;
    const { error } = await supabase
      .from('todos')
      .update({ completed: newCompleted })
      .eq('id', todoId);

    if (error) throw error;

    set(state => ({
      todos: state.todos.map(t =>
        t.id === todoId ? { ...t, completed: newCompleted } : t
      ),
    }));

    // Tactic cascade logic
    if (todo.goalId && todo.tacticId) {
      const tacticTodos = get().todos.filter(
        t => t.tacticId === todo.tacticId && t.id !== todoId
      );
      const allTacticTodosCompleted =
        tacticTodos.every(t => t.completed) && newCompleted;

      const period = get().periods.find(p =>
        p.goals.some(g => g.id === todo.goalId)
      );
      const goal = period?.goals.find(g => g.id === todo.goalId);
      const tactic = goal?.tactics.find(t => t.id === todo.tacticId);

      if (tactic && allTacticTodosCompleted && !tactic.completed) {
        get().toggleTactic(todo.goalId, todo.tacticId);
      } else if (tactic && !newCompleted && tactic.completed) {
        get().toggleTactic(todo.goalId, todo.tacticId);
      }
    }
  },

  // ========== WEEKLY SCORE ACTIONS ==========
  saveWeeklyScore: async (score) => {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('weekly_scores')
      .insert({
        user_id: userId,
        period_id: score.periodId,
        week_number: score.weekNumber,
        week_start_date: score.weekStartDate,
        week_end_date: score.weekEndDate,
        execution_score: score.executionScore,
        notes: score.notes ?? '',
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to save weekly score');

    set(state => ({ weeklyScores: [...state.weeklyScores, toWeeklyScore(data)] }));
  },

  updateWeeklyScore: async (scoreId, updates) => {
    const dbUpdates: Record<string, any> = {};
    if (updates.executionScore !== undefined) dbUpdates.execution_score = updates.executionScore;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { error } = await supabase.from('weekly_scores').update(dbUpdates).eq('id', scoreId);
    if (error) throw error;

    set(state => ({
      weeklyScores: state.weeklyScores.map(s =>
        s.id === scoreId ? { ...s, ...updates } : s
      ),
    }));
  },

  getWeeklyScore: (periodId, weekNumber) => {
    return get().weeklyScores.find(
      s => s.periodId === periodId && s.weekNumber === weekNumber
    );
  },

  // ========== HELPERS ==========
  getActivePeriod: () => {
    const state = get();
    return state.periods.find(p => p.id === state.activePeriodId);
  },

  calculateGoalProgress: (goalId) => {
    set(state => ({
      periods: state.periods.map(p => ({
        ...p,
        goals: p.goals.map(g => {
          if (g.id !== goalId) return g;
          const totalTactics = g.tactics.length;
          if (totalTactics === 0) return { ...g, progress: 0 };
          const completedTactics = g.tactics.filter(t => t.completed).length;
          const progress = Math.round((completedTactics / totalTactics) * 100);
          return { ...g, progress };
        }),
      })),
    }));

    // Fire-and-forget sync to Supabase
    const state = get();
    const period = state.periods.find(p => p.goals.some(g => g.id === goalId));
    const goal = period?.goals.find(g => g.id === goalId);
    if (goal) {
      supabase.from('goals').update({ progress: goal.progress }).eq('id', goalId);
    }
  },

  // ========== REALTIME SUBSCRIPTIONS ==========
  subscribeToChanges: () => {
    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos' },
        (payload) => {
          const { todos } = get();
          switch (payload.eventType) {
            case 'INSERT':
              if (!todos.find(t => t.id === (payload.new as DbTodo).id)) {
                set({ todos: [...todos, toTodo(payload.new as DbTodo)] });
              }
              break;
            case 'UPDATE':
              set({
                todos: todos.map(t =>
                  t.id === (payload.new as DbTodo).id ? toTodo(payload.new as DbTodo) : t
                ),
              });
              break;
            case 'DELETE':
              set({ todos: todos.filter(t => t.id !== (payload.old as DbTodo).id) });
              break;
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'periods' },
        () => { get().loadAll(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goals' },
        () => { get().loadAll(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tactics' },
        () => { get().loadAll(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weekly_scores' },
        () => { get().loadAll(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
}));
