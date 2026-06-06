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
import { useLanguage, type Language } from '../lib/i18n';
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

function displayDate(date?: string, language: Language = 'en') {
  if (!date) return language === 'zh' ? '未安排' : 'Unscheduled';

  return language === 'zh'
    ? format(parseISO(date), 'yyyy/M/d')
    : format(parseISO(date), 'MMM d, yyyy');
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
  const { language } = useLanguage();
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
  const copy = language === 'zh'
    ? {
        title: '看板',
        description: '按类别管理任务和截止事项。',
        addCard: '添加卡片',
        active: '进行中',
        emptyColumn: '空',
        emptyColumnLong: '这里还没有卡片。点 + 或拖入卡片。',
        archive: '归档',
        completedTasks: (count: number) => `${count} 个已完成任务`,
        hide: '隐藏',
        show: '显示',
        emptyArchive: '完成的任务会显示在这里。',
        editCard: '编辑卡片',
        cardDialogTitle: '添加卡片',
        cardDialogDescription: '截止卡片需要日期；普通任务可以不安排日期。',
        titleLabel: '标题',
        titlePlaceholder: '任务标题...',
        type: '类型',
        category: '类别',
        dateDeadline: '日期 / 截止日',
        goal: '目标',
        noGoal: '无目标',
        tactic: '策略',
        noTactic: '无策略',
        cancel: '取消',
        saveChanges: '保存',
        titleRequired: '任务标题不能为空。',
        deadlineRequired: '截止卡片需要填写截止日期。',
        addTo: '添加卡片到',
        complete: '完成',
        move: '移动',
        moveCategory: '移动类别',
        edit: '编辑',
        delete: '删除',
        reopen: '重新打开',
        completed: '完成于',
        recently: '最近',
      }
    : {
        title: 'Kanban',
        description: 'Maintain active tasks and deadlines by category.',
        addCard: 'Add Card',
        active: 'active',
        emptyColumn: 'Empty',
        emptyColumnLong: 'No active cards here. Use + or drop a card.',
        archive: 'Archive',
        completedTasks: (count: number) => `${count} completed task${count === 1 ? '' : 's'}`,
        hide: 'Hide',
        show: 'Show',
        emptyArchive: 'Completed tasks will appear here.',
        editCard: 'Edit Card',
        cardDialogTitle: 'Add Card',
        cardDialogDescription: 'Deadline cards require a deadline. Task cards can stay unscheduled.',
        titleLabel: 'Title',
        titlePlaceholder: 'Task title...',
        type: 'Type',
        category: 'Category',
        dateDeadline: 'Date / Deadline',
        goal: 'Goal',
        noGoal: 'No goal',
        tactic: 'Tactic',
        noTactic: 'No tactic',
        cancel: 'Cancel',
        saveChanges: 'Save Changes',
        titleRequired: 'Task title is required.',
        deadlineRequired: 'Deadline cards require a deadline date.',
        addTo: 'Add card to',
        complete: 'Complete',
        move: 'Move',
        moveCategory: 'Move category',
        edit: 'Edit',
        delete: 'Delete',
        reopen: 'Reopen',
        completed: 'Completed',
        recently: 'recently',
      };
  const categoryLabels: Record<TodoCategory, string> = language === 'zh'
    ? {
        chore: '杂务',
        general: '通用',
        academic: '学习',
        health: '健康',
      }
    : TODO_CATEGORY_LABELS;
  const kindLabels: Record<TodoKind, string> = language === 'zh'
    ? {
        todo: '任务',
        ddl: '截止',
      }
    : TODO_KIND_LABELS;

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
      setFormError({ field: 'title', message: copy.titleRequired });
      return;
    }

    if (form.kind === 'ddl' && !form.date) {
      setFormError({
        field: 'date',
        message: copy.deadlineRequired,
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
          <h2 className="mb-1 text-2xl font-bold text-gray-900 sm:mb-2 sm:text-3xl">{copy.title}</h2>
          <p className="hidden text-gray-600 sm:block">{copy.description}</p>
        </div>
        <Button
          onClick={() => openCreateDialog()}
          className="w-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          {copy.addCard}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {TODO_CATEGORIES.map((category) => {
          const columnTodos = activeTodos.filter((todo) => todo.category === category);
          const categoryLabel = categoryLabels[category];
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
                    {columnTodos.length} {copy.active}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`${copy.addTo} ${categoryLabel}`}
                  title={`${copy.addTo} ${categoryLabel}`}
                  onClick={() => openCreateDialog(category)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className={columnBodyClass}>
                {columnTodos.length === 0 ? (
                  <div className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-center text-sm text-gray-500">
                    <span className="sm:hidden">{copy.emptyColumn}</span>
                    <span className="hidden sm:inline">{copy.emptyColumnLong}</span>
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
                      categoryLabels={categoryLabels}
                      kindLabels={kindLabels}
                      language={language}
                      copy={copy}
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
              <h3 className="font-semibold text-gray-900">{copy.archive}</h3>
              <p className="text-sm text-gray-500">
                {copy.completedTasks(archivedTodos.length)}
              </p>
            </div>
          </div>
          <span className="text-sm font-medium text-blue-600">
            {archiveOpen ? copy.hide : copy.show}
          </span>
        </button>

        {archiveOpen && (
          <div className="border-t border-gray-200 p-3">
            {archivedTodos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                {copy.emptyArchive}
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
                    categoryLabels={categoryLabels}
                    kindLabels={kindLabels}
                    language={language}
                    copy={copy}
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
            <DialogTitle>{editingTodo ? copy.editCard : copy.cardDialogTitle}</DialogTitle>
            <DialogDescription>
              {copy.cardDialogDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">{copy.titleLabel}</span>
              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                aria-invalid={titleHasError ? 'true' : undefined}
                aria-describedby={titleHasError ? formErrorId : undefined}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                placeholder={copy.titlePlaceholder}
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">{copy.type}</span>
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
                      {kindLabels[kind]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">{copy.category}</span>
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
                      {categoryLabels[category]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                {copy.dateDeadline}
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
                    {copy.goal}
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
                    <option value="">{copy.noGoal}</option>
                    {activePeriod.goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    {copy.tactic}
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
                    <option value="">{copy.noTactic}</option>
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
              {copy.cancel}
            </Button>
            <Button onClick={saveTask}>
              {editingTodo ? copy.saveChanges : copy.addCard}
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
  categoryLabels,
  kindLabels,
  language,
  copy,
}: {
  todo: Todo;
  goalTitle?: string;
  tacticTitle?: string;
  onComplete: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onMove: (category: TodoCategory) => void;
  onDragStart: () => void;
  categoryLabels: Record<TodoCategory, string>;
  kindLabels: Record<TodoKind, string>;
  language: Language;
  copy: {
    complete: string;
    move: string;
    moveCategory: string;
    edit: string;
    delete: string;
  };
}) {
  const normalized = normalizeTodo(todo);
  const completeLabel = `${copy.complete} ${todo.title}`;

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
              {kindLabels[normalized.kind ?? 'todo']}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {categoryLabels[normalized.category ?? 'general']}
            </Badge>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 flex-shrink-0" />
          <span>{displayDate(normalized.date, language)}</span>
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
          aria-label={`${copy.move} ${todo.title}`}
          className="min-w-0 rounded-md border border-gray-300 bg-white px-2 py-2 text-sm sm:py-1.5 sm:text-xs"
          title={copy.moveCategory}
        >
          {TODO_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {categoryLabels[category]}
            </option>
          ))}
        </select>
        <IconButton label={`${copy.edit} ${todo.title}`} onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </IconButton>
        <IconButton label={`${copy.delete} ${todo.title}`} onClick={onDelete}>
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
  categoryLabels,
  kindLabels,
  language,
  copy,
}: {
  todo: Todo;
  goalTitle?: string;
  tacticTitle?: string;
  onReopen: () => void;
  onDelete: () => void;
  categoryLabels: Record<TodoCategory, string>;
  kindLabels: Record<TodoKind, string>;
  language: Language;
  copy: {
    delete: string;
    reopen: string;
    completed: string;
    recently: string;
  };
}) {
  const normalized = normalizeTodo(todo);
  const reopenLabel = `${copy.reopen} ${todo.title}`;

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
              {kindLabels[normalized.kind ?? 'todo']}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {categoryLabels[normalized.category ?? 'general']}
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
            {copy.completed} {normalized.completedAt ? displayDate(normalized.completedAt.slice(0, 10), language) : copy.recently}
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
          {copy.reopen}
        </Button>
        <IconButton label={`${copy.delete} ${todo.title}`} onClick={onDelete}>
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
