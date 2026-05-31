import { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Columns3,
  Grid3X3,
  ListChecks,
  Plus,
  Trash2,
} from 'lucide-react';
import { useStore } from '../lib/store';
import type { Goal, Todo } from '../lib/types';

type ViewMode = 'day' | 'week' | 'month';
type EventKind = 'task' | 'focus' | 'meeting' | 'personal';
type EventColor = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray';

interface CalendarEventMeta {
  startTime: string;
  endTime: string;
  kind: EventKind;
  color: EventColor;
}

interface DraftEvent extends CalendarEventMeta {
  title: string;
  date: string;
  goalId: string;
  tacticId: string;
}

const META_STORAGE_KEY = 'daycraft-calendar-event-meta';
const HOURS = Array.from({ length: 17 }, (_, index) => index + 6);
const KIND_OPTIONS: Array<{ value: EventKind; label: string }> = [
  { value: 'task', label: 'Task' },
  { value: 'focus', label: 'Focus' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'personal', label: 'Personal' },
];
const COLOR_OPTIONS: Array<{ value: EventColor; label: string }> = [
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'amber', label: 'Amber' },
  { value: 'red', label: 'Red' },
  { value: 'purple', label: 'Purple' },
  { value: 'gray', label: 'Gray' },
];

function formatDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function timeAt(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

function addHour(time: string) {
  const hour = Math.min(23, Number(time.slice(0, 2)) + 1);
  return timeAt(hour);
}

function loadEventMeta(): Record<string, CalendarEventMeta> {
  try {
    return JSON.parse(localStorage.getItem(META_STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function defaultMeta(index = 0): CalendarEventMeta {
  const hour = 9 + (index % 8);
  return {
    startTime: timeAt(hour),
    endTime: timeAt(hour + 1),
    kind: 'task',
    color: 'blue',
  };
}

export function Calendar() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draft, setDraft] = useState<DraftEvent | null>(null);
  const [dragStart, setDragStart] = useState<{ date: string; hour: number } | null>(null);
  const [eventMeta, setEventMeta] = useState<Record<string, CalendarEventMeta>>(loadEventMeta);

  const { periods, activePeriodId, todos, addTodo, toggleTodo, deleteTodo } = useStore();
  const activePeriod = periods.find(period => period.id === activePeriodId);

  const visibleDays = useMemo(() => {
    if (viewMode === 'day') return [currentDate];
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate);
      return Array.from({ length: 7 }, (_, index) => addDays(start, index));
    }

    const monthStart = startOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(endOfMonth(monthStart));
    const days: Date[] = [];
    for (let day = calendarStart; day <= calendarEnd; day = addDays(day, 1)) {
      days.push(day);
    }
    return days;
  }, [currentDate, viewMode]);

  const todosByDate = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const todo of todos) {
      const list = map.get(todo.date) ?? [];
      list.push(todo);
      map.set(todo.date, list);
    }
    return map;
  }, [todos]);

  const title = getCalendarTitle(viewMode, currentDate);

  const persistMeta = (next: Record<string, CalendarEventMeta>) => {
    setEventMeta(next);
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(next));
  };

  const openDraft = (date: string, startTime = '09:00', endTime = '10:00') => {
    setDraft({
      title: '',
      date,
      startTime,
      endTime,
      kind: 'task',
      color: 'blue',
      goalId: '',
      tacticId: '',
    });
  };

  const handleSlotPointerUp = (date: string, hour: number) => {
    if (dragStart && dragStart.date === date) {
      const start = Math.min(dragStart.hour, hour);
      const end = Math.max(dragStart.hour, hour) + 1;
      openDraft(date, timeAt(start), timeAt(end));
    } else {
      openDraft(date, timeAt(hour), timeAt(hour + 1));
    }
    setDragStart(null);
  };

  const handleSubmitDraft = async () => {
    if (!draft || !draft.title.trim()) return;

    const todo = await addTodo({
      title: draft.title.trim(),
      date: draft.date,
      completed: false,
      goalId: draft.goalId || undefined,
      tacticId: draft.tacticId || undefined,
    });

    persistMeta({
      ...eventMeta,
      [todo.id]: {
        startTime: draft.startTime,
        endTime: draft.endTime,
        kind: draft.kind,
        color: draft.color,
      },
    });
    setDraft(null);
  };

  const handleDeleteTodo = async (todoId: string) => {
    await deleteTodo(todoId);
    const next = { ...eventMeta };
    delete next[todoId];
    persistMeta(next);
  };

  const shiftCalendar = (direction: -1 | 1) => {
    if (viewMode === 'day') setCurrentDate(addDays(currentDate, direction));
    if (viewMode === 'week') setCurrentDate(direction > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    if (viewMode === 'month') setCurrentDate(direction > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  return (
    <div className="calendar-page">
      <section className="calendar-toolbar">
        <div>
          <h2>Calendar</h2>
          <p>Plan tasks in a familiar calendar grid and attach each item to goals or tactics.</p>
        </div>
        <div className="calendar-toolbar-actions">
          <div className="calendar-view-switch" aria-label="Calendar view">
            <ViewButton active={viewMode === 'day'} onClick={() => setViewMode('day')} icon={<ListChecks className="h-4 w-4" />} label="Day" />
            <ViewButton active={viewMode === 'week'} onClick={() => setViewMode('week')} icon={<Columns3 className="h-4 w-4" />} label="Week" />
            <ViewButton active={viewMode === 'month'} onClick={() => setViewMode('month')} icon={<Grid3X3 className="h-4 w-4" />} label="Month" />
          </div>
          <button className="calendar-primary-button" onClick={() => openDraft(formatDateKey(currentDate))}>
            <Plus className="h-4 w-4" />
            Add task
          </button>
        </div>
      </section>

      <section className="calendar-shell">
        <div className="calendar-nav">
          <button className="calendar-icon-button" onClick={() => shiftCalendar(-1)} aria-label="Previous period">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <h3>{title}</h3>
            <p>{viewMode === 'month' ? 'Click a day to add a task' : 'Click or drag in the time grid to create an event'}</p>
          </div>
          <button className="calendar-icon-button" onClick={() => shiftCalendar(1)} aria-label="Next period">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {viewMode === 'month' ? (
          <MonthGrid
            currentDate={currentDate}
            days={visibleDays}
            todosByDate={todosByDate}
            eventMeta={eventMeta}
            onCreate={openDraft}
            onToggle={toggleTodo}
            onDelete={handleDeleteTodo}
          />
        ) : (
          <TimeGrid
            days={visibleDays}
            todosByDate={todosByDate}
            eventMeta={eventMeta}
            onPointerDown={(date, hour) => setDragStart({ date, hour })}
            onPointerUp={handleSlotPointerUp}
            onCreate={openDraft}
            onToggle={toggleTodo}
            onDelete={handleDeleteTodo}
          />
        )}
      </section>

      {draft && (
        <EventDraftPanel
          draft={draft}
          activePeriod={activePeriod}
          onChange={setDraft}
          onSubmit={handleSubmitDraft}
          onCancel={() => setDraft(null)}
        />
      )}
    </div>
  );
}

function getCalendarTitle(viewMode: ViewMode, currentDate: Date) {
  if (viewMode === 'day') return format(currentDate, 'EEEE, MMMM d, yyyy');
  if (viewMode === 'week') {
    const start = startOfWeek(currentDate);
    const end = endOfWeek(currentDate);
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  }
  return format(currentDate, 'MMMM yyyy');
}

function ViewButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button className={active ? 'is-active' : ''} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function TimeGrid({
  days,
  todosByDate,
  eventMeta,
  onPointerDown,
  onPointerUp,
  onCreate,
  onToggle,
  onDelete,
}: {
  days: Date[];
  todosByDate: Map<string, Todo[]>;
  eventMeta: Record<string, CalendarEventMeta>;
  onPointerDown: (date: string, hour: number) => void;
  onPointerUp: (date: string, hour: number) => void;
  onCreate: (date: string, startTime?: string, endTime?: string) => void;
  onToggle: (todoId: string) => void;
  onDelete: (todoId: string) => void;
}) {
  return (
    <div className="calendar-time-grid" style={{ ['--calendar-days' as string]: days.length }}>
      <div className="calendar-time-header" />
      {days.map(day => {
        const isToday = isSameDay(day, new Date());
        return (
          <div key={day.toISOString()} className={`calendar-day-header ${isToday ? 'is-today' : ''}`}>
            <span>{format(day, 'EEE')}</span>
            <strong>{format(day, 'd')}</strong>
          </div>
        );
      })}

      {HOURS.map(hour => (
        <div key={`time-${hour}`} className="calendar-hour-label">
          {timeAt(hour)}
        </div>
      )).flatMap((timeLabel, hourIndex) => {
        const hour = HOURS[hourIndex];
        return [
          timeLabel,
          ...days.map(day => {
            const date = formatDateKey(day);
            const slotTodos = (todosByDate.get(date) ?? []).filter((todo, index) => {
              const meta = eventMeta[todo.id] ?? defaultMeta(index);
              return Number(meta.startTime.slice(0, 2)) === hour;
            });

            return (
              <div
                key={`${date}-${hour}`}
                className="calendar-time-slot"
                onPointerDown={() => onPointerDown(date, hour)}
                onPointerUp={() => onPointerUp(date, hour)}
                onDoubleClick={() => onCreate(date, timeAt(hour), timeAt(hour + 1))}
              >
                {slotTodos.map(todo => (
                  <CalendarEvent
                    key={todo.id}
                    todo={todo}
                    meta={eventMeta[todo.id] ?? defaultMeta()}
                    onToggle={onToggle}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            );
          }),
        ];
      })}
    </div>
  );
}

function MonthGrid({
  currentDate,
  days,
  todosByDate,
  eventMeta,
  onCreate,
  onToggle,
  onDelete,
}: {
  currentDate: Date;
  days: Date[];
  todosByDate: Map<string, Todo[]>;
  eventMeta: Record<string, CalendarEventMeta>;
  onCreate: (date: string, startTime?: string, endTime?: string) => void;
  onToggle: (todoId: string) => void;
  onDelete: (todoId: string) => void;
}) {
  return (
    <div>
      <div className="calendar-month-weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="calendar-month-grid">
        {days.map(day => {
          const date = formatDateKey(day);
          const dayTodos = todosByDate.get(date) ?? [];
          return (
            <div key={date} className={`calendar-month-cell ${!isSameMonth(day, currentDate) ? 'is-muted' : ''}`}>
              <button className="calendar-month-date" onClick={() => onCreate(date)}>
                <span className={isSameDay(day, new Date()) ? 'is-today' : ''}>{format(day, 'd')}</span>
                <Plus className="h-3 w-3" />
              </button>
              <div className="calendar-month-events">
                {dayTodos.slice(0, 4).map((todo, index) => (
                  <CalendarEvent
                    key={todo.id}
                    todo={todo}
                    compact
                    meta={eventMeta[todo.id] ?? defaultMeta(index)}
                    onToggle={onToggle}
                    onDelete={onDelete}
                  />
                ))}
                {dayTodos.length > 4 && <div className="calendar-more-count">+{dayTodos.length - 4} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarEvent({
  todo,
  meta,
  compact,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  meta: CalendarEventMeta;
  compact?: boolean;
  onToggle: (todoId: string) => void;
  onDelete: (todoId: string) => void;
}) {
  return (
    <div
      className={`calendar-event calendar-event-${meta.color} ${todo.completed ? 'is-complete' : ''} ${compact ? 'is-compact' : ''}`}
      onPointerDown={event => event.stopPropagation()}
      onPointerUp={event => event.stopPropagation()}
    >
      <button
        className="calendar-event-check"
        onClick={(event) => {
          event.stopPropagation();
          onToggle(todo.id);
        }}
      >
        {todo.completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
      </button>
      <div className="calendar-event-body">
        <div className="calendar-event-title">{todo.title}</div>
        {!compact && (
          <div className="calendar-event-meta">
            <Clock className="h-3 w-3" />
            {meta.startTime}-{meta.endTime} · {meta.kind}
          </div>
        )}
      </div>
      <button
        className="calendar-event-delete"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(todo.id);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function EventDraftPanel({
  draft,
  activePeriod,
  onChange,
  onSubmit,
  onCancel,
}: {
  draft: DraftEvent;
  activePeriod?: { goals: Goal[] };
  onChange: (draft: DraftEvent) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const selectedGoal = activePeriod?.goals.find(goal => goal.id === draft.goalId);

  const update = (updates: Partial<DraftEvent>) => {
    const next = { ...draft, ...updates };
    if (updates.startTime && next.endTime <= updates.startTime) {
      next.endTime = addHour(updates.startTime);
    }
    onChange(next);
  };

  return (
    <div className="calendar-form-overlay">
      <div className="calendar-form">
        <div className="calendar-form-header">
          <div>
            <h3>Create task</h3>
            <p>{format(new Date(`${draft.date}T00:00:00`), 'EEEE, MMM d')}</p>
          </div>
          <button className="calendar-icon-button" onClick={onCancel}>×</button>
        </div>

        <label>
          Title
          <input value={draft.title} onChange={event => update({ title: event.target.value })} placeholder="Task title" autoFocus />
        </label>

        <div className="calendar-form-row">
          <label>
            Start
            <input type="time" value={draft.startTime} onChange={event => update({ startTime: event.target.value })} />
          </label>
          <label>
            End
            <input type="time" value={draft.endTime} onChange={event => update({ endTime: event.target.value })} />
          </label>
        </div>

        <div className="calendar-form-row">
          <label>
            Type
            <select value={draft.kind} onChange={event => update({ kind: event.target.value as EventKind })}>
              {KIND_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            Color
            <select value={draft.color} onChange={event => update({ color: event.target.value as EventColor })}>
              {COLOR_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        {activePeriod && activePeriod.goals.length > 0 && (
          <>
            <label>
              Goal
              <select value={draft.goalId} onChange={event => update({ goalId: event.target.value, tacticId: '' })}>
                <option value="">No linked goal</option>
                {activePeriod.goals.map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
              </select>
            </label>
            {selectedGoal && selectedGoal.tactics.length > 0 && (
              <label>
                Tactic
                <select value={draft.tacticId} onChange={event => update({ tacticId: event.target.value })}>
                  <option value="">No linked tactic</option>
                  {selectedGoal.tactics.map(tactic => <option key={tactic.id} value={tactic.id}>{tactic.title}</option>)}
                </select>
              </label>
            )}
          </>
        )}

        <div className="calendar-form-actions">
          <button className="calendar-secondary-button" onClick={onCancel}>Cancel</button>
          <button className="calendar-primary-button" onClick={onSubmit}>Create task</button>
        </div>
      </div>
    </div>
  );
}
