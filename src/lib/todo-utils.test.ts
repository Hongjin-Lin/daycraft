import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  completeTodo,
  normalizeTodo,
  reopenTodo,
  sortArchivedTodos,
  TODO_KIND_LABELS,
} from './todo-utils.ts';

describe('todo kanban helpers', () => {
  it('uses user-friendly kind labels for cards', () => {
    assert.equal(TODO_KIND_LABELS.todo, 'Task');
    assert.equal(TODO_KIND_LABELS.ddl, 'Deadline');
  });

  it('normalizes legacy todos with safe kanban defaults', () => {
    const normalized = normalizeTodo({
      id: 'todo-1',
      title: 'Legacy task',
      date: '2026-06-10',
      completed: false,
    });

    assert.equal(normalized.kind, 'todo');
    assert.equal(normalized.category, 'general');
    assert.equal(normalized.date, '2026-06-10');
  });

  it('archives completed todos with completedAt and reopens by clearing it', () => {
    const completed = completeTodo(
      {
        id: 'todo-2',
        title: 'Finish report',
        date: '2026-06-11',
        completed: false,
        kind: 'ddl',
        category: 'academic',
      },
      '2026-06-05T08:00:00.000Z',
    );

    assert.equal(completed.completed, true);
    assert.equal(completed.completedAt, '2026-06-05T08:00:00.000Z');

    const reopened = reopenTodo(completed);
    assert.equal(reopened.completed, false);
    assert.equal(reopened.completedAt, undefined);
    assert.equal(reopened.category, 'academic');
    assert.equal(reopened.kind, 'ddl');
  });

  it('sorts archived todos by completed time descending', () => {
    const archived = sortArchivedTodos([
      {
        id: 'older',
        title: 'Older',
        completed: true,
        completedAt: '2026-06-01T10:00:00.000Z',
        category: 'general',
        kind: 'todo',
      },
      {
        id: 'newer',
        title: 'Newer',
        completed: true,
        completedAt: '2026-06-03T10:00:00.000Z',
        category: 'chore',
        kind: 'todo',
      },
    ]);

    assert.deepEqual(
      archived.map((todo) => todo.id),
      ['newer', 'older'],
    );
  });
});
