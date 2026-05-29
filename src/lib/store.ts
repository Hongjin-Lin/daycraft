import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WeekPeriod, Goal, Todo, Tactic, WeeklyScore } from './types';

interface AppState {
  periods: WeekPeriod[];
  todos: Todo[];
  activePeriodId: string | null;
  weeklyScores: WeeklyScore[];
  
  // Period actions
  createPeriod: (startDate: Date) => void;
  
  // Goal actions
  addGoal: (goal: Omit<Goal, 'id' | 'progress'>) => void;
  updateGoal: (goalId: string, updates: Partial<Goal>) => void;
  deleteGoal: (goalId: string) => void;
  
  // Tactic actions
  addTactic: (goalId: string, title: string, dueWeek?: number) => void;
  toggleTactic: (goalId: string, tacticId: string) => void;
  deleteTactic: (goalId: string, tacticId: string) => void;
  
  // Todo actions
  addTodo: (todo: Omit<Todo, 'id'>) => void;
  updateTodo: (todoId: string, updates: Partial<Todo>) => void;
  deleteTodo: (todoId: string) => void;
  toggleTodo: (todoId: string) => void;
  
  // Weekly score actions
  saveWeeklyScore: (score: Omit<WeeklyScore, 'id'>) => void;
  updateWeeklyScore: (scoreId: string, updates: Partial<WeeklyScore>) => void;
  getWeeklyScore: (periodId: string, weekNumber: number) => WeeklyScore | undefined;
  
  // Helpers
  getActivePeriod: () => WeekPeriod | undefined;
  calculateGoalProgress: (goalId: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      periods: [],
      todos: [],
      activePeriodId: null,
      weeklyScores: [],

      createPeriod: (startDate: Date) => {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 83); // 12 weeks = 84 days
        
        const newPeriod: WeekPeriod = {
          id: crypto.randomUUID(),
          startDate,
          endDate,
          goals: [],
          active: true,
        };
        
        set((state) => ({
          periods: [...state.periods.map(p => ({ ...p, active: false })), newPeriod],
          activePeriodId: newPeriod.id,
        }));
      },

      addGoal: (goal) => {
        const activePeriod = get().getActivePeriod();
        if (!activePeriod) return;
        
        const newGoal: Goal = {
          ...goal,
          id: crypto.randomUUID(),
          progress: 0,
        };
        
        set((state) => ({
          periods: state.periods.map(p =>
            p.id === activePeriod.id
              ? { ...p, goals: [...p.goals, newGoal] }
              : p
          ),
        }));
      },

      updateGoal: (goalId, updates) => {
        set((state) => ({
          periods: state.periods.map(p => ({
            ...p,
            goals: p.goals.map(g =>
              g.id === goalId ? { ...g, ...updates } : g
            ),
          })),
        }));
      },

      deleteGoal: (goalId) => {
        set((state) => ({
          periods: state.periods.map(p => ({
            ...p,
            goals: p.goals.filter(g => g.id !== goalId),
          })),
          todos: state.todos.filter(t => t.goalId !== goalId),
        }));
      },

      addTactic: (goalId, title, dueWeek) => {
        const newTactic: Tactic = {
          id: crypto.randomUUID(),
          title,
          completed: false,
          dueWeek,
        };
        
        set((state) => ({
          periods: state.periods.map(p => ({
            ...p,
            goals: p.goals.map(g =>
              g.id === goalId
                ? { ...g, tactics: [...g.tactics, newTactic] }
                : g
            ),
          })),
        }));
        
        get().calculateGoalProgress(goalId);
      },

      toggleTactic: (goalId, tacticId) => {
        set((state) => ({
          periods: state.periods.map(p => ({
            ...p,
            goals: p.goals.map(g =>
              g.id === goalId
                ? {
                    ...g,
                    tactics: g.tactics.map(t =>
                      t.id === tacticId ? { ...t, completed: !t.completed } : t
                    ),
                  }
                : g
            ),
          })),
        }));
        
        get().calculateGoalProgress(goalId);
      },

      deleteTactic: (goalId, tacticId) => {
        set((state) => ({
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

      addTodo: (todo) => {
        const newTodo: Todo = {
          ...todo,
          id: crypto.randomUUID(),
        };
        
        set((state) => ({
          todos: [...state.todos, newTodo],
        }));
      },

      updateTodo: (todoId, updates) => {
        set((state) => ({
          todos: state.todos.map(t =>
            t.id === todoId ? { ...t, ...updates } : t
          ),
        }));
      },

      deleteTodo: (todoId) => {
        set((state) => ({
          todos: state.todos.filter(t => t.id !== todoId),
        }));
      },

      toggleTodo: (todoId) => {
        const todo = get().todos.find(t => t.id === todoId);
        if (!todo) return;
        
        set((state) => ({
          todos: state.todos.map(t =>
            t.id === todoId ? { ...t, completed: !t.completed } : t
          ),
        }));
        
        // If todo is linked to a tactic, sync the tactic completion status
        if (todo.goalId && todo.tacticId) {
          const newCompletedState = !todo.completed;
          
          // Check if all todos for this tactic are completed
          const tacticTodos = get().todos.filter(
            t => t.tacticId === todo.tacticId && t.id !== todoId
          );
          const allTacticTodosCompleted = tacticTodos.every(t => t.completed) && newCompletedState;
          
          // Get the current tactic state
          const period = get().periods.find(p => 
            p.goals.some(g => g.id === todo.goalId)
          );
          const goal = period?.goals.find(g => g.id === todo.goalId);
          const tactic = goal?.tactics.find(t => t.id === todo.tacticId);
          
          // Update tactic if needed
          if (tactic && allTacticTodosCompleted && !tactic.completed) {
            get().toggleTactic(todo.goalId, todo.tacticId);
          } else if (tactic && !newCompletedState && tactic.completed) {
            // If todo is uncompleted and tactic was completed, unmark the tactic
            get().toggleTactic(todo.goalId, todo.tacticId);
          }
        }
      },

      saveWeeklyScore: (score) => {
        const newScore: WeeklyScore = {
          ...score,
          id: crypto.randomUUID(),
        };
        
        set((state) => ({
          weeklyScores: [...state.weeklyScores, newScore],
        }));
      },

      updateWeeklyScore: (scoreId, updates) => {
        set((state) => ({
          weeklyScores: state.weeklyScores.map(s =>
            s.id === scoreId ? { ...s, ...updates } : s
          ),
        }));
      },

      getWeeklyScore: (periodId, weekNumber) => {
        const state = get();
        return state.weeklyScores.find(s => s.periodId === periodId && s.weekNumber === weekNumber);
      },

      getActivePeriod: () => {
        const state = get();
        return state.periods.find(p => p.id === state.activePeriodId);
      },

      calculateGoalProgress: (goalId) => {
        set((state) => ({
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
      },
    }),
    {
      name: '12-week-year-storage',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          
          const { state } = JSON.parse(str);
          
          // Convert date strings back to Date objects
          if (state.periods) {
            state.periods = state.periods.map((period: any) => ({
              ...period,
              startDate: new Date(period.startDate),
              endDate: new Date(period.endDate),
            }));
          }
          
          return { state };
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);