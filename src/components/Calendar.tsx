import { useState } from 'react';
import { useStore } from '../lib/store';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isWithinInterval,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Circle, Trash2, Calendar as CalendarIcon, LayoutGrid, Columns, Eye } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

type ViewMode = 'day' | 'week' | 'month';

export function Calendar() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddTodo, setShowAddTodo] = useState(false);
  
  const { todos, addTodo, toggleTodo, deleteTodo } = useStore();
  
  const nextPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };
  
  const prevPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };
  
  const getTodosForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return todos.filter(t => t.date === dateStr);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Calendar</h2>
          <p className="text-gray-600">Plan your days and align tasks with your goals</p>
        </div>
        
        {/* View Toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="day" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Day
            </TabsTrigger>
            <TabsTrigger value="week" className="flex items-center gap-2">
              <Columns className="w-4 h-4" />
              Week
            </TabsTrigger>
            <TabsTrigger value="month" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Month
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {viewMode === 'day' && (
        <DayView
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          currentDate={currentDate}
          nextPeriod={nextPeriod}
          prevPeriod={prevPeriod}
          getTodosForDate={getTodosForDate}
          showAddTodo={showAddTodo}
          setShowAddTodo={setShowAddTodo}
        />
      )}
      
      {viewMode === 'week' && (
        <WeekView
          currentDate={currentDate}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          nextPeriod={nextPeriod}
          prevPeriod={prevPeriod}
          getTodosForDate={getTodosForDate}
          showAddTodo={showAddTodo}
          setShowAddTodo={setShowAddTodo}
        />
      )}
      
      {viewMode === 'month' && (
        <MonthView
          currentDate={currentDate}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          nextPeriod={nextPeriod}
          prevPeriod={prevPeriod}
          getTodosForDate={getTodosForDate}
          showAddTodo={showAddTodo}
          setShowAddTodo={setShowAddTodo}
        />
      )}
    </div>
  );
}

// Day View Component
function DayView({
  selectedDate,
  setSelectedDate,
  currentDate,
  nextPeriod,
  prevPeriod,
  getTodosForDate,
  showAddTodo,
  setShowAddTodo,
}: any) {
  const { addTodo, toggleTodo, deleteTodo } = useStore();
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const todosForSelectedDate = getTodosForDate(selectedDate);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={prevPeriod}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextPeriod}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Add Todo Button */}
      <div className="mb-4">
        <Button onClick={() => setShowAddTodo(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>
      
      {/* Add Todo Form */}
      {showAddTodo && (
        <AddTodoForm
          date={selectedDateStr}
          onAdd={(title, goalId, tacticId) => {
            addTodo({
              title,
              date: selectedDateStr,
              completed: false,
              goalId,
              tacticId,
            });
            setShowAddTodo(false);
          }}
          onCancel={() => setShowAddTodo(false)}
        />
      )}
      
      {/* Todos List */}
      <div className="space-y-2">
        {todosForSelectedDate.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No tasks for this day</p>
          </div>
        ) : (
          todosForSelectedDate.map((todo: any) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={() => toggleTodo(todo.id)}
              onDelete={() => deleteTodo(todo.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Week View Component
function WeekView({
  currentDate,
  selectedDate,
  setSelectedDate,
  nextPeriod,
  prevPeriod,
  getTodosForDate,
  showAddTodo,
  setShowAddTodo,
}: any) {
  const { addTodo, toggleTodo, deleteTodo } = useStore();
  
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  
  const weekDays: Date[] = [];
  let day = weekStart;
  while (day <= weekEnd) {
    weekDays.push(day);
    day = addDays(day, 1);
  }
  
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  
  // Calculate week stats
  const allWeekTodos = weekDays.flatMap(d => getTodosForDate(d));
  const completedWeekTodos = allWeekTodos.filter((t: any) => t.completed).length;
  
  return (
    <div className="space-y-4">
      {/* Week Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </h3>
            <p className="text-gray-600 mt-1">
              {completedWeekTodos} / {allWeekTodos.length} tasks completed this week
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={prevPeriod}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextPeriod}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Week Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{
              width: `${allWeekTodos.length > 0 ? (completedWeekTodos / allWeekTodos.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
      
      {/* Week Days Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayTodos = getTodosForDate(day);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDate);
          
          return (
            <div
              key={day.toISOString()}
              className={`bg-white rounded-lg border-2 p-4 transition-all ${
                isSelected ? 'border-blue-600 shadow-md' : 'border-gray-200'
              }`}
            >
              <div className="mb-3">
                <div className="text-sm text-gray-600">{format(day, 'EEE')}</div>
                <div
                  className={`text-2xl font-bold ${
                    isToday ? 'text-blue-600' : 'text-gray-900'
                  }`}
                >
                  {format(day, 'd')}
                </div>
                {dayTodos.length > 0 && (
                  <Badge variant="secondary" className="mt-1">
                    {dayTodos.filter((t: any) => t.completed).length}/{dayTodos.length}
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {dayTodos.map((todo: any) => (
                  <div
                    key={todo.id}
                    onClick={() => setSelectedDate(day)}
                    className="cursor-pointer"
                  >
                    <WeekTodoItem
                      todo={todo}
                      onToggle={() => toggleTodo(todo.id)}
                    />
                  </div>
                ))}
                
                {dayTodos.length === 0 && (
                  <button
                    onClick={() => {
                      setSelectedDate(day);
                      setShowAddTodo(true);
                    }}
                    className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                  >
                    + Add task
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Add Todo Form (appears when showAddTodo is true) */}
      {showAddTodo && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold mb-4">Add task for {format(selectedDate, 'MMM d, yyyy')}</h4>
          <AddTodoForm
            date={selectedDateStr}
            onAdd={(title, goalId, tacticId) => {
              addTodo({
                title,
                date: selectedDateStr,
                completed: false,
                goalId,
                tacticId,
              });
              setShowAddTodo(false);
            }}
            onCancel={() => setShowAddTodo(false)}
          />
        </div>
      )}
    </div>
  );
}

// Month View Component
function MonthView({
  currentDate,
  selectedDate,
  setSelectedDate,
  nextPeriod,
  prevPeriod,
  getTodosForDate,
  showAddTodo,
  setShowAddTodo,
}: any) {
  const { addTodo, toggleTodo, deleteTodo } = useStore();
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const calendarDays: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }
  
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const todosForSelectedDate = getTodosForDate(selectedDate);
  
  // Calculate month stats
  const monthTodos = calendarDays
    .filter(d => isSameMonth(d, currentDate))
    .flatMap(d => getTodosForDate(d));
  const completedMonthTodos = monthTodos.filter((t: any) => t.completed).length;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Grid */}
      <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {completedMonthTodos} / {monthTodos.length} tasks completed this month
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={prevPeriod}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextPeriod}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-gray-600 py-2"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, idx) => {
            const dayTodos = getTodosForDate(day);
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);
            const completedTodos = dayTodos.filter((t: any) => t.completed).length;
            
            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={`
                  relative min-h-20 p-2 rounded-lg border transition-all hover:shadow-md
                  ${isSelected ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}
                  ${!isCurrentMonth ? 'opacity-40' : ''}
                `}
              >
                <div
                  className={`
                    text-sm font-medium mb-1
                    ${isToday ? 'text-blue-600 font-bold' : ''}
                    ${isSelected ? 'text-blue-600' : 'text-gray-900'}
                  `}
                >
                  {format(day, 'd')}
                </div>
                
                {dayTodos.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-center gap-0.5">
                      {dayTodos.slice(0, 3).map((_: any, i: number) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            i < completedTodos ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-gray-600">
                      {completedTodos}/{dayTodos.length}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Selected Day Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900">
              {format(selectedDate, 'MMM d, yyyy')}
            </h3>
            <p className="text-sm text-gray-600">{format(selectedDate, 'EEEE')}</p>
          </div>
          <Button onClick={() => setShowAddTodo(true)} size="icon">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Add Todo Form */}
        {showAddTodo && (
          <AddTodoForm
            date={selectedDateStr}
            onAdd={(title, goalId, tacticId) => {
              addTodo({
                title,
                date: selectedDateStr,
                completed: false,
                goalId,
                tacticId,
              });
              setShowAddTodo(false);
            }}
            onCancel={() => setShowAddTodo(false)}
          />
        )}
        
        {/* Todos List */}
        <div className="space-y-2">
          {todosForSelectedDate.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No tasks for this day</p>
            </div>
          ) : (
            todosForSelectedDate.map((todo: any) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={() => toggleTodo(todo.id)}
                onDelete={() => deleteTodo(todo.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Week Todo Item (compact version for week view)
function WeekTodoItem({ todo, onToggle }: { todo: any; onToggle: () => void }) {
  const { periods, activePeriodId } = useStore();
  const activePeriod = periods.find(p => p.id === activePeriodId);
  
  const linkedGoal = activePeriod?.goals.find(g => g.id === todo.goalId);
  const linkedTactic = linkedGoal?.tactics.find(t => t.id === todo.tacticId);
  
  return (
    <div className="flex items-start gap-2 p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors">
      <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="flex-shrink-0">
        {todo.completed ? (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        ) : (
          <Circle className="w-4 h-4 text-gray-400" />
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        <div
          className={`text-xs font-medium truncate ${
            todo.completed ? 'line-through text-gray-500' : 'text-gray-900'
          }`}
        >
          {todo.title}
        </div>
        
        {linkedTactic && (
          <div className="text-xs text-purple-600 truncate mt-0.5">
            {linkedTactic.title}
          </div>
        )}
      </div>
    </div>
  );
}

// Add Todo Form Component
function AddTodoForm({
  date,
  onAdd,
  onCancel,
}: {
  date: string;
  onAdd: (title: string, goalId?: string, tacticId?: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [selectedTacticId, setSelectedTacticId] = useState<string>('');
  
  const { periods, activePeriodId } = useStore();
  const activePeriod = periods.find(p => p.id === activePeriodId);
  
  const selectedGoal = activePeriod?.goals.find(g => g.id === selectedGoalId);
  
  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd(
      title,
      selectedGoalId || undefined,
      selectedTacticId || undefined
    );
    setTitle('');
    setSelectedGoalId('');
    setSelectedTacticId('');
  };
  
  return (
    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
        }}
        placeholder="Task title..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        autoFocus
      />
      
      {activePeriod && activePeriod.goals.length > 0 && (
        <>
          <select
            value={selectedGoalId}
            onChange={(e) => {
              setSelectedGoalId(e.target.value);
              setSelectedTacticId('');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">Link to goal (optional)</option>
            {activePeriod.goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
          
          {selectedGoal && selectedGoal.tactics.length > 0 && (
            <select
              value={selectedTacticId}
              onChange={(e) => setSelectedTacticId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">Link to tactic (optional)</option>
              {selectedGoal.tactics.map((tactic) => (
                <option key={tactic.id} value={tactic.id}>
                  {tactic.title}
                </option>
              ))}
            </select>
          )}
        </>
      )}
      
      <div className="flex gap-2">
        <Button onClick={handleSubmit} className="flex-1">
          Add Task
        </Button>
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
      </div>
    </div>
  );
}

// Todo Item Component
function TodoItem({
  todo,
  onToggle,
  onDelete,
}: {
  todo: any;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { periods, activePeriodId } = useStore();
  const activePeriod = periods.find(p => p.id === activePeriodId);
  
  const linkedGoal = activePeriod?.goals.find(g => g.id === todo.goalId);
  const linkedTactic = linkedGoal?.tactics.find(t => t.id === todo.tacticId);
  
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 group">
      <button onClick={onToggle} className="flex-shrink-0 mt-0.5">
        {todo.completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : (
          <Circle className="w-5 h-5 text-gray-400" />
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm font-medium ${
            todo.completed ? 'line-through text-gray-500' : 'text-gray-900'
          }`}
        >
          {todo.title}
        </div>
        
        {(linkedGoal || linkedTactic) && (
          <div className="flex flex-wrap gap-1 mt-1">
            {linkedGoal && (
              <Badge variant="secondary" className="text-xs">
                🎯 {linkedGoal.title}
              </Badge>
            )}
            {linkedTactic && (
              <Badge variant="outline" className="text-xs">
                {linkedTactic.title}
              </Badge>
            )}
          </div>
        )}
      </div>
      
      <button
        onClick={onDelete}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
