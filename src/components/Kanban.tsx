import { useMemo, useState, type ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Archive,
  Calendar,
  CheckCircle2,
  Circle,
  GripVertical,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useStore } from '../lib/store';
import type { Todo } from '../lib/types';
import {
  TODO_CATEGORIES,
  TODO_CATEGORY_LABELS,
  TODO_KIND_LABELS,
  TODO_KINDS,
  normalizeTodo,
  sortArchivedTodos,
  type TodoCategory,
  type TodoKind,
} from '../lib/todo-utils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

type TaskFormState = {
  title: string;
  kind: TodoKind;
  category: TodoCategory;
  date: string;
  goalId: string;
  tacticId: string;
};

type TaskFormError = {
  field: 'title' | 'date';
  message: string;
};

const emptyForm: TaskFormState = {
  title: '',
  kind: 'todo',
  category: 'general',
  date: '',
  goalId: '',
  tacticId: '',
};

function displayDate(date?: string) {
  if (!date) return 'Unscheduled';

  return format(parseISO(date), 'MMM d, yyyy');
}

function formFromTodo(todo: Todo): TaskFormState {
  const normalized = normalizeTodo(todo);

  return {
    title: normalized.title,
    kind: normalized.kind ?? 'todo',
    category: normalized.category ?? 'general',
    date: normalized.date ?? '',
    goalId: normalized.goalId ?? '',
    tacticId: normalized.tacticId ?? '',
  };
}

export function Kanban() {
  const {
    todos,
    periods,
    activePeriodId,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
  } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyForm);
  const [formError, setFormError] = useState<TaskFormError | null>(null);
  const [draggingTodoId, setDraggingTodoId] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const formErrorId = 'kanban-card-form-error';
  const activePeriod = periods.find((period) => period.id === activePeriodId);
  const normalizedTodos = useMemo(() => todos.map(normalizeTodo), [todos]);
  const activeTodos = normalizedTodos.filter((todo) => !todo.completed);
  const archivedTodos = useMemo(() => sortArchivedTodos(todos), [todos]);

  const selectedGoal = activePeriod?.goals.find((goal) => goal.id === form.goalId);
  const titleHasError = formError?.field === 'title';
  const dateHasError = formError?.field === 'date';

  const openCreateDialog = (category: TodoCategory = 'general') => {
    setEditingTodo(null);
    setForm({ ...emptyForm, category });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (todo: Todo) => {
    setEditingTodo(todo);
    setForm(formFromTodo(todo));
    setFormError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTodo(null);
    setForm(emptyForm);
    setFormError(null);
  };

  const saveTask = () => {
    const title = form.title.trim();
    if (!title) {
      setFormError({ field: 'title', message: 'Task title is required.' });
      return;
    }

    if (form.kind === 'ddl' && !form.date) {
      setFormError({
        field: 'date',
        message: 'Deadline cards require a deadline date.',
      });
      return;
    }

    const taskData = {
      title,
      kind: form.kind,
      category: form.category,
      date: form.date || undefined,
      goalId: form.goalId || undefined,
      tacticId: form.tacticId || undefined,
    };

    if (editingTodo) {
      updateTodo(editingTodo.id, taskData);
    } else {
      addTodo({
        ...taskData,
        completed: false,
      });
    }

    closeDialog();
  };

  const moveTodoToCategory = (todoId: string, category: TodoCategory) => {
    updateTodo(todoId, { category });
    setDraggingTodoId(null);
  };

  const goalForTodo = (todo: Todo) =>
    activePeriod?.goals.find((goal) => goal.id === todo.goalId);

  const tacticForTodo = (todo: Todo) => {
    const goal = goalForTodo(todo);
    return goal?.tactics.find((tactic) => tactic.id === todo.tacticId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Kanban</h2>
          <p className="text-gray-600">
            Maintain active tasks and deadlines by category.
          </p>
        </div>
        <Button
          onClick={() => openCreateDialog()}
          className="w-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Card
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {TODO_CATEGORIES.map((category) => {
          const columnTodos = activeTodos.filter((todo) => todo.category === category);
          const categoryLabel = TODO_CATEGORY_LABELS[category];
          const columnBodyClass =
            columnTodos.length === 0
              ? 'p-3'
              : 'space-y-3 p-3 min-h-[12rem] lg:min-h-[18rem]';

          return (
            <section
              key={category}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggingTodoId) {
                  moveTodoToCategory(draggingTodoId, category);
                }
              }}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white"
            >
              <div className="flex items-center justify-between border-b border-gray-200 p-4">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {categoryLabel}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {columnTodos.length} active
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Add card to ${categoryLabel}`}
                  title={`Add card to ${categoryLabel}`}
                  onClick={() => openCreateDialog(category)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className={columnBodyClass}>
                {columnTodos.length === 0 ? (
                  <div className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-center text-sm text-gray-500">
                    No active cards here. Use + or drop a card.
                  </div>
                ) : (
                  columnTodos.map((todo) => (
                    <KanbanCard
                      key={todo.id}
                      todo={todo}
                      goalTitle={goalForTodo(todo)?.title}
                      tacticTitle={tacticForTodo(todo)?.title}
                      onComplete={() => toggleTodo(todo.id)}
                      onDelete={() => deleteTodo(todo.id)}
                      onEdit={() => openEditDialog(todo)}
                      onMove={(nextCategory) => moveTodoToCategory(todo.id, nextCategory)}
                      onDragStart={() => setDraggingTodoId(todo.id)}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="rounded-lg border border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => setArchiveOpen(!archiveOpen)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <Archive className="w-5 h-5 text-gray-500" />
            <div>
              <h3 className="font-semibold text-gray-900">Archive</h3>
              <p className="text-sm text-gray-500">
                {archivedTodos.length} completed task{archivedTodos.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <span className="text-sm font-medium text-blue-600">
            {archiveOpen ? 'Hide' : 'Show'}
          </span>
        </button>

        {archiveOpen && (
          <div className="border-t border-gray-200 p-3">
            {archivedTodos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                Completed tasks will appear here.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {archivedTodos.map((todo) => (
                  <ArchivedCard
                    key={todo.id}
                    todo={todo}
                    goalTitle={goalForTodo(todo)?.title}
                    tacticTitle={tacticForTodo(todo)?.title}
                    onReopen={() => toggleTodo(todo.id)}
                    onDelete={() => deleteTodo(todo.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTodo ? 'Edit Card' : 'Add Card'}</DialogTitle>
            <DialogDescription>
              Deadline cards require a deadline. Task cards can stay unscheduled.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Title</span>
              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                aria-invalid={titleHasError ? 'true' : undefined}
                aria-describedby={titleHasError ? formErrorId : undefined}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                placeholder="Task title..."
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Type</span>
                <select
                  value={form.kind}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      kind: event.target.value as TodoKind,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  {TODO_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {TODO_KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Category</span>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value as TodoCategory,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  {TODO_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {TODO_CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Date / Deadline
              </span>
              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, date: event.target.value }))
                }
                aria-invalid={dateHasError ? 'true' : undefined}
                aria-describedby={dateHasError ? formErrorId : undefined}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </label>

            {activePeriod && activePeriod.goals.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Goal
                  </span>
                  <select
                    value={form.goalId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        goalId: event.target.value,
                        tacticId: '',
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No goal</option>
                    {activePeriod.goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Tactic
                  </span>
                  <select
                    value={form.tacticId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        tacticId: event.target.value,
                      }))
                    }
                    disabled={!selectedGoal || selectedGoal.tactics.length === 0}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">No tactic</option>
                    {selectedGoal?.tactics.map((tactic) => (
                      <option key={tactic.id} value={tactic.id}>
                        {tactic.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {formError && (
              <div
                id={formErrorId}
                role="alert"
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {formError.message}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={saveTask}>
              {editingTodo ? 'Save Changes' : 'Add Card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KanbanCard({
  todo,
  goalTitle,
  tacticTitle,
  onComplete,
  onDelete,
  onEdit,
  onMove,
  onDragStart,
}: {
  todo: Todo;
  goalTitle?: string;
  tacticTitle?: string;
  onComplete: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onMove: (category: TodoCategory) => void;
  onDragStart: () => void;
}) {
  const normalized = normalizeTodo(todo);
  const completeLabel = `Complete ${todo.title}`;

  return (
    <article
      draggable
      onDragStart={onDragStart}
      className="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm transition-colors hover:bg-white"
    >
      <div className="mb-3 flex items-start gap-2">
        <GripVertical
          aria-hidden="true"
          className="mt-1 h-4 w-4 flex-shrink-0 text-gray-400"
        />
        <button
          type="button"
          onClick={onComplete}
          title={completeLabel}
          aria-label={completeLabel}
          className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-green-600"
        >
          <Circle className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h4 className="break-words font-medium text-gray-900">{todo.title}</h4>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant={normalized.kind === 'ddl' ? 'destructive' : 'outline'} className="text-xs">
              {TODO_KIND_LABELS[normalized.kind ?? 'todo']}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {TODO_CATEGORY_LABELS[normalized.category ?? 'general']}
            </Badge>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 flex-shrink-0" />
          <span>{displayDate(normalized.date)}</span>
        </div>
        {(goalTitle || tacticTitle) && (
          <div className="flex flex-wrap gap-1">
            {goalTitle && (
              <Badge variant="secondary" className="text-xs">
                {goalTitle}
              </Badge>
            )}
            {tacticTitle && (
              <Badge variant="outline" className="text-xs">
                {tacticTitle}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
        <select
          value={normalized.category ?? 'general'}
          onChange={(event) => onMove(event.target.value as TodoCategory)}
          aria-label={`Move ${todo.title} to category`}
          className="min-w-0 rounded-md border border-gray-300 bg-white px-2 py-2 text-sm sm:py-1.5 sm:text-xs"
          title="Move category"
        >
          {TODO_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {TODO_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
        <IconButton label={`Edit ${todo.title}`} onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </IconButton>
        <IconButton label={`Delete ${todo.title}`} onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </article>
  );
}

function ArchivedCard({
  todo,
  goalTitle,
  tacticTitle,
  onReopen,
  onDelete,
}: {
  todo: Todo;
  goalTitle?: string;
  tacticTitle?: string;
  onReopen: () => void;
  onDelete: () => void;
}) {
  const normalized = normalizeTodo(todo);
  const reopenLabel = `Reopen ${todo.title}`;

  return (
    <article className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
        <div className="min-w-0 flex-1">
          <h4 className="break-words font-medium text-gray-600 line-through">
            {todo.title}
          </h4>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">
              {TODO_KIND_LABELS[normalized.kind ?? 'todo']}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {TODO_CATEGORY_LABELS[normalized.category ?? 'general']}
            </Badge>
            {goalTitle && (
              <Badge variant="secondary" className="text-xs">
                {goalTitle}
              </Badge>
            )}
            {tacticTitle && (
              <Badge variant="outline" className="text-xs">
                {tacticTitle}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Completed {normalized.completedAt ? displayDate(normalized.completedAt.slice(0, 10)) : 'recently'}
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          aria-label={reopenLabel}
          title={reopenLabel}
          onClick={onReopen}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reopen
        </Button>
        <IconButton label={`Delete ${todo.title}`} onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </article>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 transition-colors hover:text-gray-900"
    >
      {children}
    </button>
  );
}
