import { useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
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
import {
  LONG_PRESS_MS,
  fixedDurationSelection,
  isDesktopSelectionPointer,
  isTouchLongPressPointer,
  movedBeyondTouchSlop,
} from '../lib/calendar-interaction';
import { useLanguage, type Language } from '../lib/i18n';

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

interface DragSelection {
  date: string;
  startMinutes: number;
  endMinutes: number;
}

interface DragStart {
  date: string;
  startMinutes: number;
  pointerId: number;
  originX: number;
  originY: number;
  mode: 'desktop' | 'touch';
  active: boolean;
}

const META_STORAGE_KEY = 'daycraft-calendar-event-meta';
const HOURS = Array.from({ length: 17 }, (_, index) => index + 6);
const DAY_START_MINUTES = 6 * 60;
const DAY_END_MINUTES = 23 * 60;
const DAY_DURATION_MINUTES = DAY_END_MINUTES - DAY_START_MINUTES;
const SLOT_MINUTES = 30;
const CLICK_DEFAULT_MINUTES = 60;
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

function parseTimeToMinutes(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function formatMinutesAsTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function clampMinutes(minutes: number, min = DAY_START_MINUTES, max = DAY_END_MINUTES) {
  return Math.min(max, Math.max(min, minutes));
}

function snapToSlot(minutes: number) {
  return Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES;
}

function minutesFromPointer(element: HTMLElement, clientY: number, allowDayEnd = false) {
  const rect = element.getBoundingClientRect();
  const y = Math.min(rect.height, Math.max(0, clientY - rect.top));
  const rawMinutes = DAY_START_MINUTES + (y / rect.height) * DAY_DURATION_MINUTES;
  const snapped = snapToSlot(rawMinutes);
  return clampMinutes(snapped, DAY_START_MINUTES, allowDayEnd ? DAY_END_MINUTES : DAY_END_MINUTES - SLOT_MINUTES);
}

function normalizeSelection(startMinutes: number, currentMinutes: number, defaultToOneHour: boolean) {
  if (defaultToOneHour && Math.abs(currentMinutes - startMinutes) < SLOT_MINUTES) {
    return {
      startMinutes,
      endMinutes: clampMinutes(startMinutes + CLICK_DEFAULT_MINUTES),
    };
  }

  const start = Math.min(startMinutes, currentMinutes);
  const end = Math.max(startMinutes, currentMinutes);
  return {
    startMinutes: start,
    endMinutes: Math.max(start + SLOT_MINUTES, end),
  };
}

function eventPosition(meta: CalendarEventMeta): CSSProperties {
  const start = clampMinutes(parseTimeToMinutes(meta.startTime));
  const end = clampMinutes(parseTimeToMinutes(meta.endTime), start + SLOT_MINUTES, DAY_END_MINUTES);
  const top = ((start - DAY_START_MINUTES) / DAY_DURATION_MINUTES) * 100;
  const height = ((end - start) / DAY_DURATION_MINUTES) * 100;

  return {
    top: `${top}%`,
    height: `${height}%`,
  };
}

function addHour(time: string) {
  return formatMinutesAsTime(clampMinutes(parseTimeToMinutes(time) + CLICK_DEFAULT_MINUTES));
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
  const { language } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draft, setDraft] = useState<DraftEvent | null>(null);
  const [draftError, setDraftError] = useState('');
  const [draftSaving, setDraftSaving] = useState(false);
  const [dragStart, setDragStart] = useState<DragStart | null>(null);
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);
  const [eventMeta, setEventMeta] = useState<Record<string, CalendarEventMeta>>(loadEventMeta);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (!todo.date) continue;
      const list = map.get(todo.date) ?? [];
      list.push(todo);
      map.set(todo.date, list);
    }
    return map;
  }, [todos]);

  const copy = language === 'zh'
    ? {
        title: '日历',
        description: '在日历网格中安排任务，并关联目标或策略。',
        calendarView: '日历视图',
        day: '日',
        week: '周',
        month: '月',
        addTask: '添加任务',
        previousPeriod: '上一个周期',
        nextPeriod: '下一个周期',
        monthHint: '点击日期添加任务',
        gridHint: '拖拽选择时间块；桌面端右键、触屏长按可创建。',
        expired: '登录已过期，请重新登录。',
        createError: '无法创建任务，请检查网络和登录状态。',
        createTask: '创建任务',
        close: '关闭',
        taskTitle: '标题',
        taskPlaceholder: '任务标题',
        start: '开始',
        end: '结束',
        type: '类型',
        color: '颜色',
        goal: '目标',
        noGoal: '不关联目标',
        tactic: '策略',
        noTactic: '不关联策略',
        cancel: '取消',
        creating: '创建中...',
        titleRequired: '请先填写任务标题。',
      }
    : {
        title: 'Calendar',
        description: 'Plan tasks in a familiar calendar grid and attach each item to goals or tactics.',
        calendarView: 'Calendar view',
        day: 'Day',
        week: 'Week',
        month: 'Month',
        addTask: 'Add task',
        previousPeriod: 'Previous period',
        nextPeriod: 'Next period',
        monthHint: 'Click a day to add a task',
        gridHint: 'Drag to select a block. Right-click on desktop, or long-press on touch, to create.',
        expired: 'Your session expired. Please sign in again.',
        createError: 'Could not create the task. Check your connection and sign-in status.',
        createTask: 'Create task',
        close: 'Close',
        taskTitle: 'Title',
        taskPlaceholder: 'Task title',
        start: 'Start',
        end: 'End',
        type: 'Type',
        color: 'Color',
        goal: 'Goal',
        noGoal: 'No linked goal',
        tactic: 'Tactic',
        noTactic: 'No linked tactic',
        cancel: 'Cancel',
        creating: 'Creating...',
        titleRequired: 'Add a title before creating the task.',
      };
  const kindLabels: Record<EventKind, string> = language === 'zh'
    ? { task: '任务', focus: '专注', meeting: '会议', personal: '个人' }
    : { task: 'Task', focus: 'Focus', meeting: 'Meeting', personal: 'Personal' };
  const colorLabels: Record<EventColor, string> = language === 'zh'
    ? { blue: '蓝色', green: '绿色', amber: '琥珀', red: '红色', purple: '紫色', gray: '灰色' }
    : { blue: 'Blue', green: 'Green', amber: 'Amber', red: 'Red', purple: 'Purple', gray: 'Gray' };
  const title = getCalendarTitle(viewMode, currentDate, language);

  const persistMeta = (next: Record<string, CalendarEventMeta>) => {
    setEventMeta(next);
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(next));
  };

  const openDraft = (date: string, startTime = '09:00', endTime = '10:00') => {
    setDraftError('');
    setDraftSaving(false);
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

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const releasePointerCapture = (element: HTMLElement, pointerId: number) => {
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  };

  const handleColumnPointerDown = (date: string, event: PointerEvent<HTMLDivElement>) => {
    const startMinutes = minutesFromPointer(event.currentTarget, event.clientY);

    if (isDesktopSelectionPointer(event.pointerType, event.button)) {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragStart({
        date,
        startMinutes,
        pointerId: event.pointerId,
        originX: event.clientX,
        originY: event.clientY,
        mode: 'desktop',
        active: true,
      });
      setDragSelection({
        date,
        startMinutes,
        endMinutes: clampMinutes(startMinutes + CLICK_DEFAULT_MINUTES),
      });
      return;
    }

    if (isTouchLongPressPointer(event.pointerType, event.button)) {
      clearLongPressTimer();
      const pointerId = event.pointerId;
      const target = event.currentTarget;
      setDragStart({
        date,
        startMinutes,
        pointerId,
        originX: event.clientX,
        originY: event.clientY,
        mode: 'touch',
        active: false,
      });
      longPressTimerRef.current = setTimeout(() => {
        target.setPointerCapture(pointerId);
        setDragStart(current => (
          current?.pointerId === pointerId
            ? { ...current, active: true }
            : current
        ));
        setDragSelection({
          date,
          ...fixedDurationSelection(startMinutes, CLICK_DEFAULT_MINUTES, DAY_START_MINUTES, DAY_END_MINUTES),
        });
        longPressTimerRef.current = null;
      }, LONG_PRESS_MS);
    }
  };

  const handleColumnPointerMove = (date: string, event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart || dragStart.date !== date || dragStart.pointerId !== event.pointerId) return;
    if (dragStart.mode === 'touch' && !dragStart.active) {
      if (movedBeyondTouchSlop(dragStart.originX, dragStart.originY, event.clientX, event.clientY)) {
        clearLongPressTimer();
        setDragStart(null);
      }
      return;
    }

    event.preventDefault();
    const currentMinutes = minutesFromPointer(event.currentTarget, event.clientY, true);
    if (dragStart.mode === 'touch') {
      setDragSelection({
        date,
        ...fixedDurationSelection(currentMinutes, CLICK_DEFAULT_MINUTES, DAY_START_MINUTES, DAY_END_MINUTES),
      });
      return;
    }

    setDragSelection({
      date,
      ...normalizeSelection(dragStart.startMinutes, currentMinutes, false),
    });
  };

  const handleColumnPointerUp = (date: string, event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart || dragStart.date !== date || dragStart.pointerId !== event.pointerId) return;
    clearLongPressTimer();

    if (dragStart.mode === 'touch' && !dragStart.active) {
      setDragStart(null);
      return;
    }

    const currentMinutes = minutesFromPointer(event.currentTarget, event.clientY, true);
    const selection = dragStart.mode === 'touch'
      ? fixedDurationSelection(currentMinutes, CLICK_DEFAULT_MINUTES, DAY_START_MINUTES, DAY_END_MINUTES)
      : normalizeSelection(dragStart.startMinutes, currentMinutes, true);
    releasePointerCapture(event.currentTarget, event.pointerId);
    setDragStart(null);

    if (dragStart.mode === 'touch') {
      openDraft(date, formatMinutesAsTime(selection.startMinutes), formatMinutesAsTime(selection.endMinutes));
      setDragSelection(null);
      return;
    }

    setDragSelection({ date, ...selection });
  };

  const handleColumnPointerCancel = (date: string, event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart || dragStart.date !== date || dragStart.pointerId !== event.pointerId) return;
    clearLongPressTimer();
    releasePointerCapture(event.currentTarget, event.pointerId);
    setDragStart(null);
  };

  const handleColumnContextMenu = (date: string, event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const selection = dragSelection?.date === date
      ? dragSelection
      : normalizeSelection(
        minutesFromPointer(event.currentTarget, event.clientY),
        minutesFromPointer(event.currentTarget, event.clientY),
        true
      );

    openDraft(date, formatMinutesAsTime(selection.startMinutes), formatMinutesAsTime(selection.endMinutes));
    setDragSelection(null);
    setDragStart(null);
    clearLongPressTimer();
  };

  const handleSubmitDraft = async () => {
    if (!draft || draftSaving) return;
    if (!draft.title.trim()) {
      setDraftError(copy.titleRequired);
      return;
    }

    setDraftSaving(true);
    setDraftError('');

    try {
      const todo = await addTodo({
        title: draft.title.trim(),
        date: draft.date,
        completed: false,
        kind: 'todo',
        category: 'general',
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
    } catch (error: any) {
      const message = error?.message === 'Not authenticated'
        ? copy.expired
        : error?.message || copy.createError;
      setDraftError(message);
    } finally {
      setDraftSaving(false);
    }
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
          <h2>{copy.title}</h2>
          <p>{copy.description}</p>
        </div>
        <div className="calendar-toolbar-actions">
          <div className="calendar-view-switch" aria-label={copy.calendarView}>
            <ViewButton active={viewMode === 'day'} onClick={() => setViewMode('day')} icon={<ListChecks className="h-4 w-4" />} label={copy.day} />
            <ViewButton active={viewMode === 'week'} onClick={() => setViewMode('week')} icon={<Columns3 className="h-4 w-4" />} label={copy.week} />
            <ViewButton active={viewMode === 'month'} onClick={() => setViewMode('month')} icon={<Grid3X3 className="h-4 w-4" />} label={copy.month} />
          </div>
          <button className="calendar-primary-button" onClick={() => openDraft(formatDateKey(currentDate))}>
            <Plus className="h-4 w-4" />
            {copy.addTask}
          </button>
        </div>
      </section>

      <section className="calendar-shell">
        <div className="calendar-nav">
          <button className="calendar-icon-button" onClick={() => shiftCalendar(-1)} aria-label={copy.previousPeriod}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <h3>{title}</h3>
            <p>{viewMode === 'month' ? copy.monthHint : copy.gridHint}</p>
          </div>
          <button className="calendar-icon-button" onClick={() => shiftCalendar(1)} aria-label={copy.nextPeriod}>
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
            dragSelection={dragSelection}
            onPointerDown={handleColumnPointerDown}
            onPointerMove={handleColumnPointerMove}
            onPointerUp={handleColumnPointerUp}
            onPointerCancel={handleColumnPointerCancel}
            onContextMenu={handleColumnContextMenu}
            onToggle={toggleTodo}
            onDelete={handleDeleteTodo}
          />
        )}
      </section>

      {draft && (
        <EventDraftPanel
          draft={draft}
          error={draftError}
          saving={draftSaving}
          activePeriod={activePeriod}
          onChange={(nextDraft) => {
            setDraftError('');
            setDraft(nextDraft);
          }}
          onSubmit={handleSubmitDraft}
          onCancel={() => {
            setDraftError('');
            setDraft(null);
          }}
          copy={copy}
          kindLabels={kindLabels}
          colorLabels={colorLabels}
        />
      )}
    </div>
  );
}

function getCalendarTitle(viewMode: ViewMode, currentDate: Date, language: Language) {
  if (language === 'zh') {
    if (viewMode === 'day') return format(currentDate, 'yyyy年M月d日');
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return `${format(start, 'M月d日')} - ${format(end, 'M月d日 yyyy')}`;
    }
    return format(currentDate, 'yyyy年M月');
  }

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
  dragSelection,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onContextMenu,
  onToggle,
  onDelete,
}: {
  days: Date[];
  todosByDate: Map<string, Todo[]>;
  eventMeta: Record<string, CalendarEventMeta>;
  dragSelection: DragSelection | null;
  onPointerDown: (date: string, event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (date: string, event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (date: string, event: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (date: string, event: PointerEvent<HTMLDivElement>) => void;
  onContextMenu: (date: string, event: MouseEvent<HTMLDivElement>) => void;
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

      <div className="calendar-hour-rail">
        {HOURS.map(hour => (
          <div key={`time-${hour}`} className="calendar-hour-label">
            {timeAt(hour)}
          </div>
        ))}
      </div>

      {days.map(day => {
        const date = formatDateKey(day);
        const selection = dragSelection?.date === date ? dragSelection : null;
        const dayTodos = (todosByDate.get(date) ?? [])
          .map((todo, index) => ({ todo, meta: eventMeta[todo.id] ?? defaultMeta(index) }))
          .sort((a, b) => parseTimeToMinutes(a.meta.startTime) - parseTimeToMinutes(b.meta.startTime));

        return (
          <div
            key={date}
            className="calendar-day-column"
            onPointerDown={(event) => onPointerDown(date, event)}
            onPointerMove={(event) => onPointerMove(date, event)}
            onPointerUp={(event) => onPointerUp(date, event)}
            onPointerCancel={(event) => onPointerCancel(date, event)}
            onContextMenu={(event) => onContextMenu(date, event)}
          >
            {selection && (
              <div
                className="calendar-drag-preview"
                style={eventPosition({
                  startTime: formatMinutesAsTime(selection.startMinutes),
                  endTime: formatMinutesAsTime(selection.endMinutes),
                  kind: 'task',
                  color: 'blue',
                })}
              />
            )}

            {dayTodos.map(({ todo, meta }) => (
              <CalendarEvent
                key={todo.id}
                todo={todo}
                meta={meta}
                timed
                style={eventPosition(meta)}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            ))}
          </div>
        );
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
    <div className="calendar-month-scroll">
      <div className="calendar-month-weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="calendar-month-grid">
        {days.map(day => {
          const date = formatDateKey(day);
          const dayTodos = (todosByDate.get(date) ?? [])
            .map((todo, index) => ({ todo, meta: eventMeta[todo.id] ?? defaultMeta(index) }))
            .sort((a, b) => parseTimeToMinutes(a.meta.startTime) - parseTimeToMinutes(b.meta.startTime));
          return (
            <div key={date} className={`calendar-month-cell ${!isSameMonth(day, currentDate) ? 'is-muted' : ''}`}>
              <button className="calendar-month-date" onClick={() => onCreate(date)}>
                <span className={isSameDay(day, new Date()) ? 'is-today' : ''}>{format(day, 'd')}</span>
                <Plus className="h-3 w-3" />
              </button>
              <div className="calendar-month-events">
                {dayTodos.slice(0, 5).map(({ todo, meta }) => (
                  <MonthEvent
                    key={todo.id}
                    todo={todo}
                    meta={meta}
                    onToggle={onToggle}
                    onDelete={onDelete}
                  />
                ))}
                {dayTodos.length > 5 && <div className="calendar-more-count">+{dayTodos.length - 5} more</div>}
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
  timed,
  style,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  meta: CalendarEventMeta;
  compact?: boolean;
  timed?: boolean;
  style?: CSSProperties;
  onToggle: (todoId: string) => void;
  onDelete: (todoId: string) => void;
}) {
  return (
    <div
      className={`calendar-event calendar-event-${meta.color} ${todo.completed ? 'is-complete' : ''} ${compact ? 'is-compact' : ''} ${timed ? 'is-timed' : ''}`}
      style={style}
      onPointerDown={event => event.stopPropagation()}
      onPointerUp={event => event.stopPropagation()}
      onContextMenu={event => event.stopPropagation()}
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
            {meta.startTime}-{meta.endTime} / {meta.kind}
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

function MonthEvent({
  todo,
  meta,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  meta: CalendarEventMeta;
  onToggle: (todoId: string) => void;
  onDelete: (todoId: string) => void;
}) {
  return (
    <div className={`calendar-month-event calendar-month-event-${meta.color} ${todo.completed ? 'is-complete' : ''}`}>
      <button
        className="calendar-event-check"
        onClick={(event) => {
          event.stopPropagation();
          onToggle(todo.id);
        }}
      >
        {todo.completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
      </button>
      <span className="calendar-month-event-time">{meta.startTime}</span>
      <span className="calendar-month-event-title">{todo.title}</span>
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
  error,
  saving,
  activePeriod,
  onChange,
  onSubmit,
  onCancel,
  copy,
  kindLabels,
  colorLabels,
}: {
  draft: DraftEvent;
  error: string;
  saving: boolean;
  activePeriod?: { goals: Goal[] };
  onChange: (draft: DraftEvent) => void;
  onSubmit: () => void | Promise<void>;
  onCancel: () => void;
  copy: {
    createTask: string;
    close: string;
    taskTitle: string;
    taskPlaceholder: string;
    start: string;
    end: string;
    type: string;
    color: string;
    goal: string;
    noGoal: string;
    tactic: string;
    noTactic: string;
    cancel: string;
    creating: string;
  };
  kindLabels: Record<EventKind, string>;
  colorLabels: Record<EventColor, string>;
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
      <form
        className="calendar-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="calendar-form-header">
          <div>
            <h3>{copy.createTask}</h3>
            <p>{format(new Date(`${draft.date}T00:00:00`), 'EEEE, MMM d')}</p>
          </div>
          <button type="button" className="calendar-icon-button" onClick={onCancel} aria-label={copy.close}>x</button>
        </div>

        <label>
          {copy.taskTitle}
          <input value={draft.title} onChange={event => update({ title: event.target.value })} placeholder={copy.taskPlaceholder} autoFocus />
        </label>

        <div className="calendar-form-row">
          <label>
            {copy.start}
            <input type="time" value={draft.startTime} onChange={event => update({ startTime: event.target.value })} />
          </label>
          <label>
            {copy.end}
            <input type="time" value={draft.endTime} onChange={event => update({ endTime: event.target.value })} />
          </label>
        </div>

        <div className="calendar-form-row">
          <label>
            {copy.type}
            <select value={draft.kind} onChange={event => update({ kind: event.target.value as EventKind })}>
              {KIND_OPTIONS.map(option => <option key={option.value} value={option.value}>{kindLabels[option.value]}</option>)}
            </select>
          </label>
          <label>
            {copy.color}
            <select value={draft.color} onChange={event => update({ color: event.target.value as EventColor })}>
              {COLOR_OPTIONS.map(option => <option key={option.value} value={option.value}>{colorLabels[option.value]}</option>)}
            </select>
          </label>
        </div>

        {activePeriod && activePeriod.goals.length > 0 && (
          <>
            <label>
              {copy.goal}
              <select value={draft.goalId} onChange={event => update({ goalId: event.target.value, tacticId: '' })}>
                <option value="">{copy.noGoal}</option>
                {activePeriod.goals.map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
              </select>
            </label>
            {selectedGoal && selectedGoal.tactics.length > 0 && (
              <label>
                {copy.tactic}
                <select value={draft.tacticId} onChange={event => update({ tacticId: event.target.value })}>
                  <option value="">{copy.noTactic}</option>
                  {selectedGoal.tactics.map(tactic => <option key={tactic.id} value={tactic.id}>{tactic.title}</option>)}
                </select>
              </label>
            )}
          </>
        )}

        {error && <div className="calendar-form-error">{error}</div>}

        <div className="calendar-form-actions">
          <button type="button" className="calendar-secondary-button" onClick={onCancel} disabled={saving}>{copy.cancel}</button>
          <button type="submit" className="calendar-primary-button" disabled={saving}>
            {saving ? copy.creating : copy.createTask}
          </button>
        </div>
      </form>
    </div>
  );
}
