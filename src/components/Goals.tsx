import { useState } from 'react';
import { useStore } from '../lib/store';
import { Plus, Target, Trash2, CheckCircle2, Circle, Calendar as CalendarIcon, X, ChevronDown, ChevronRight } from 'lucide-react';
import { endOfDay, format, isWithinInterval, parseISO, startOfDay } from 'date-fns';
import { Calendar as CalendarPicker } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export function Goals() {
  const { periods, activePeriodId, addGoal, deleteGoal, addTactic, toggleTactic, deleteTactic } = useStore();
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTitleError, setGoalTitleError] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [tacticInputs, setTacticInputs] = useState<{ [key: string]: string }>({});
  const [tacticDueDates, setTacticDueDates] = useState<{ [key: string]: string | undefined }>({});
  const [openDuePicker, setOpenDuePicker] = useState<string | null>(null);
  
  const activePeriod = periods.find(p => p.id === activePeriodId);
  
  const handleAddGoal = () => {
    if (!goalTitle.trim()) {
      setGoalTitleError('Goal title is required.');
      return;
    }
    
    addGoal({
      title: goalTitle,
      description: goalDescription,
      tactics: [],
    });
    
    setGoalTitle('');
    setGoalTitleError('');
    setGoalDescription('');
    setShowGoalForm(false);
  };
  
  const handleAddTactic = (goalId: string) => {
    const tacticTitle = tacticInputs[goalId]?.trim();
    if (!tacticTitle) return;
    
    const dueDate = tacticDueDates[goalId];
    addTactic(goalId, tacticTitle, dueDate);
    setTacticInputs({ ...tacticInputs, [goalId]: '' });
    setTacticDueDates({ ...tacticDueDates, [goalId]: undefined });
    setOpenDuePicker(null);
  };
  
  if (!activePeriod) {
    return (
      <div className="text-center py-12">
        <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Please create a 12 week period first from the dashboard.</p>
      </div>
    );
  }

  const today = new Date();
  const isTodayInActivePeriod = isWithinInterval(today, {
    start: startOfDay(activePeriod.startDate),
    end: endOfDay(activePeriod.endDate),
  });

  const setDueDateForGoal = (goalId: string, date?: Date) => {
    setTacticDueDates((currentDueDates) => ({
      ...currentDueDates,
      [goalId]: date ? format(date, 'yyyy-MM-dd') : undefined,
    }));
  };

  const renderDueDatePicker = (goalId: string) => {
    const dueDateValue = tacticDueDates[goalId];
    const selectedDate = dueDateValue ? parseISO(dueDateValue) : undefined;

    return (
      <Popover
        open={openDuePicker === goalId}
        onOpenChange={(open) => setOpenDuePicker(open ? goalId : null)}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={
              selectedDate
                ? `Due day ${format(selectedDate, 'MMM d, yyyy')}`
                : 'Choose due day'
            }
            className={`inline-flex min-w-[10rem] flex-[1_1_10rem] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              selectedDate
                ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            {selectedDate ? format(selectedDate, 'MMM d') : 'No due date'}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[calc(100vw-2rem)] max-w-[22rem] overflow-hidden rounded-lg border-gray-200 bg-white p-0 shadow-xl"
        >
          <div className="border-b border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Due day</div>
                <div className="text-xs text-gray-500">
                  {selectedDate
                    ? format(selectedDate, 'EEEE, MMM d, yyyy')
                    : 'Pick one day inside this 12-week period'}
                </div>
              </div>
            </div>
          </div>

          <CalendarPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              setDueDateForGoal(goalId, date);
              setOpenDuePicker(null);
            }}
            fromDate={activePeriod.startDate}
            toDate={activePeriod.endDate}
            initialFocus
          />

          <div className="flex items-center justify-between gap-2 border-t border-gray-100 p-3">
            <button
              type="button"
              disabled={!isTodayInActivePeriod}
              onClick={() => {
                setDueDateForGoal(goalId, today);
                setOpenDuePicker(null);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:pointer-events-none disabled:text-gray-300"
            >
              <CalendarIcon className="w-4 h-4" />
              Today
            </button>
            <button
              type="button"
              disabled={!selectedDate}
              onClick={() => {
                setDueDateForGoal(goalId);
                setOpenDuePicker(null);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:pointer-events-none disabled:text-gray-300"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Goals & Tactics</h2>
          <p className="text-gray-600">Define your goals and break them down into actionable tactics</p>
        </div>
        <button
          type="button"
          onClick={() => setShowGoalForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Goal
        </button>
      </div>
      
      {/* Add Goal Form */}
      {showGoalForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Create New Goal</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="goal-title" className="block text-sm font-medium text-gray-700 mb-2">
                Goal Title
              </label>
              <input
                id="goal-title"
                type="text"
                value={goalTitle}
                onChange={(e) => {
                  setGoalTitle(e.target.value);
                  if (goalTitleError) setGoalTitleError('');
                }}
                aria-invalid={goalTitleError ? 'true' : 'false'}
                aria-describedby={goalTitleError ? 'goal-title-error' : undefined}
                placeholder="e.g., Launch new product"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  goalTitleError ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {goalTitleError && (
                <p id="goal-title-error" role="alert" className="mt-2 text-sm text-red-600">
                  {goalTitleError}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="goal-description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="goal-description"
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                placeholder="Describe what you want to achieve..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleAddGoal}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Create Goal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowGoalForm(false);
                  setGoalTitle('');
                  setGoalTitleError('');
                  setGoalDescription('');
                }}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Goals List */}
      {activePeriod.goals.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Goals Yet</h3>
          <p className="text-gray-600 mb-6">
            Start by creating your first goal for this 12 week period
          </p>
          <button
            type="button"
            onClick={() => setShowGoalForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {activePeriod.goals.map((goal) => {
            const isExpanded = expandedGoal === goal.id;
            const tacticsId = `goal-tactics-${goal.id}`;
            const tacticInputId = `tactic-title-${goal.id}`;

            return (
            <div key={goal.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Goal Header */}
              <div className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <button
                    type="button"
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} goal ${goal.title}`}
                    aria-expanded={isExpanded}
                    aria-controls={tacticsId}
                    title={`${isExpanded ? 'Collapse' : 'Expand'} goal ${goal.title}`}
                    onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setExpandedGoal(isExpanded ? null : goal.id);
                      }
                    }}
                    className="min-w-0 flex-1 rounded-md text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" aria-hidden="true" />
                      )}
                      <Target className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <h3 className="font-bold text-gray-900">{goal.title}</h3>
                    </div>
                    <p className="text-gray-600 ml-16">{goal.description}</p>

                    <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </button>
                  
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{goal.progress}%</div>
                      <div className="text-sm text-gray-500">
                        {goal.tactics.filter(t => t.completed).length}/{goal.tactics.length} tactics
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete goal ${goal.title}`}
                      title={`Delete goal ${goal.title}`}
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete the goal "${goal.title}"?`)) {
                          deleteGoal(goal.id);
                        }
                      }}
                      className="rounded-md p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Tactics Section */}
              {isExpanded && (
                <div id={tacticsId} className="border-t border-gray-200 p-6 bg-gray-50">
                  <h4 className="font-semibold text-gray-900 mb-4">Tactics</h4>
                  
                  {/* Tactics List */}
                  <div className="space-y-2 mb-4">
                    {goal.tactics.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">
                        No tactics yet. Add your first tactic below.
                      </p>
                    ) : (
                      goal.tactics.map((tactic) => (
                        <div
                          key={tactic.id}
                          className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200"
                        >
                          <button
                            type="button"
                            aria-label={
                              tactic.completed
                                ? `Mark tactic ${tactic.title} incomplete`
                                : `Mark tactic ${tactic.title} complete`
                            }
                            title={
                              tactic.completed
                                ? `Mark tactic ${tactic.title} incomplete`
                                : `Mark tactic ${tactic.title} complete`
                            }
                            onClick={() => toggleTactic(goal.id, tactic.id)}
                            className="flex-shrink-0 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            {tactic.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                          <div className="flex-1">
                            <span
                              className={`${
                                tactic.completed
                                  ? 'line-through text-gray-500'
                                  : 'text-gray-900'
                              }`}
                            >
                              {tactic.title}
                            </span>
                            {tactic.dueDate ? (
                              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                <CalendarIcon className="w-3 h-3" />
                                {format(parseISO(tactic.dueDate), 'MMM d, yyyy')}
                              </span>
                            ) : tactic.dueWeek ? (
                              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                <CalendarIcon className="w-3 h-3" />
                                Week {tactic.dueWeek}
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            aria-label={`Delete tactic ${tactic.title}`}
                            title={`Delete tactic ${tactic.title}`}
                            onClick={() => {
                              if (confirm(`Delete tactic "${tactic.title}"?`)) {
                                deleteTactic(goal.id, tactic.id);
                              }
                            }}
                            className="rounded-md p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Add Tactic Input */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <label htmlFor={tacticInputId} className="sr-only">
                        New tactic for {goal.title}
                      </label>
                      <input
                        id={tacticInputId}
                        type="text"
                        value={tacticInputs[goal.id] || ''}
                        onChange={(e) =>
                          setTacticInputs({ ...tacticInputs, [goal.id]: e.target.value })
                        }
                        placeholder="Add a new tactic..."
                        className="min-w-[14rem] flex-[1_1_18rem] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {renderDueDatePicker(goal.id)}
                      <button
                        type="button"
                        aria-label={`Add tactic to goal ${goal.title}`}
                        title={`Add tactic to goal ${goal.title}`}
                        onClick={() => handleAddTactic(goal.id)}
                        className="inline-flex min-w-12 flex-[0_0_3rem] items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )})}
        </div>
      )}
    </div>
  );
}
