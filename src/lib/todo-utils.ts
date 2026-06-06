import type { Todo } from './types';

export type TodoKind = 'todo' | 'ddl';
export type TodoCategory = 'chore' | 'general' | 'academic' | 'health';

export const TODO_CATEGORIES: TodoCategory[] = ['chore', 'general', 'academic', 'health'];
export const TODO_KINDS: TodoKind[] = ['todo', 'ddl'];

export const TODO_CATEGORY_LABELS: Record<TodoCategory, string> = {
  chore: 'Chore',
  general: 'General',
  academic: 'Academic',
  health: 'Health',
};

export const TODO_KIND_LABELS: Record<TodoKind, string> = {
  todo: 'Task',
  ddl: 'Deadline',
};

export function normalizeTodo(todo: Todo): Todo {
  return {
    ...todo,
    kind: todo.kind ?? 'todo',
    category: todo.category ?? 'general',
  };
}

export function normalizeTodos(todos: Todo[]): Todo[] {
  return todos.map(normalizeTodo);
}

export function completeTodo(todo: Todo, completedAt = new Date().toISOString()): Todo {
  return {
    ...normalizeTodo(todo),
    completed: true,
    completedAt,
  };
}

export function reopenTodo(todo: Todo): Todo {
  return {
    ...normalizeTodo(todo),
    completed: false,
    completedAt: undefined,
  };
}

export function sortArchivedTodos(todos: Todo[]): Todo[] {
  return normalizeTodos(todos)
    .filter((todo) => todo.completed)
    .sort((left, right) => {
      const leftTime = left.completedAt ?? left.date ?? '';
      const rightTime = right.completedAt ?? right.date ?? '';

      return rightTime.localeCompare(leftTime);
    });
}
