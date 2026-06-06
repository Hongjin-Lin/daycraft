import { useState } from 'react';
import { useStore } from '../lib/store';
import { Plus, Target, Trash2, CheckCircle2, Circle, Calendar as CalendarIcon, X, ChevronDown, ChevronRight } from 'lucide-react';
import { endOfDay, format, isWithinInterval, parseISO, startOfDay } from 'date-fns';
import { Calendar as CalendarPicker } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useLanguage } from '../lib/i18n';

export function Goals() {
  const { periods, activePeriodId, addGoal, deleteGoal, addTactic, toggleTactic, deleteTactic } = useStore();
  const { language } = useLanguage();
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTitleError, setGoalTitleError] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [tacticInputs, setTacticInputs] = useState<{ [key: string]: string }>({});
  const [tacticDueDates, setTacticDueDates] = useState<{ [key: string]: string | undefined }>({});
  const [openDuePicker, setOpenDuePicker] = useState<string | null>(null);
  const copy = language === 'zh'
    ? {
        titleRequired: '目标标题不能为空。',
        createFirstPeriod: '请先在总览页创建一个规划周期。',
        chooseDueDay: '选择截止日',
        dueDay: '截止日',
        pickDay: '选择周期内的一天',
        today: '今天',
        clear: '清除',
        pageTitle: '目标与策略',
        pageDescription: '定义目标，并拆成可执行策略',
        addGoal: '添加目标',
        createNewGoal: '创建新目标',
        goalTitle: '目标标题',
        goalPlaceholder: '例如：发布新产品',
        description: '描述',
        descriptionPlaceholder: '描述你想达成什么...',
        createGoal: '创建目标',
        cancel: '取消',
        noGoalsTitle: '还没有目标',
        noGoalsDescription: '先为这个周期创建第一个目标',
        createFirstGoal: '创建第一个目标',
        collapse: '收起',
        expand: '展开',
        goal: '目标',
        deleteGoal: '删除目标',
        deleteGoalConfirm: (title: string) => `确定删除目标“${title}”吗？`,
        tactics: '策略',
        noTactics: '还没有策略，先添加一个。',
        markIncomplete: '标记为未完成',
        markComplete: '标记为完成',
        deleteTactic: '删除策略',
        deleteTacticConfirm: (title: string) => `删除策略“${title}”？`,
        newTactic: (title: string) => `${title} 的新策略`,
        tacticPlaceholder: '添加策略...',
        addTactic: '添加策略',
      }
    : {
        titleRequired: 'Goal title is required.',
        createFirstPeriod: 'Please create a 12 week period first from the dashboard.',
        chooseDueDay: 'Choose due day',
        dueDay: 'Due day',
        pickDay: 'Pick one day inside this 12-week period',
        today: 'Today',
        clear: 'Clear',
        pageTitle: 'Goals & Tactics',
        pageDescription: 'Define your goals and break them down into actionable tactics',
        addGoal: 'Add Goal',
        createNewGoal: 'Create New Goal',
        goalTitle: 'Goal Title',
        goalPlaceholder: 'e.g., Launch new product',
        description: 'Description',
        descriptionPlaceholder: 'Describe what you want to achieve...',
        createGoal: 'Create Goal',
        cancel: 'Cancel',
        noGoalsTitle: 'No Goals Yet',
        noGoalsDescription: 'Start by creating your first goal for this 12 week period',
        createFirstGoal: 'Create Your First Goal',
        collapse: 'Collapse',
        expand: 'Expand',
        goal: 'goal',
        deleteGoal: 'Delete goal',
        deleteGoalConfirm: (title: string) => `Are you sure you want to delete the goal "${title}"?`,
        tactics: 'Tactics',
        noTactics: 'No tactics yet. Add your first tactic below.',
        markIncomplete: 'Mark tactic incomplete',
        markComplete: 'Mark tactic complete',
        deleteTactic: 'Delete tactic',
        deleteTacticConfirm: (title: string) => `Delete tactic "${title}"?`,
        newTactic: (title: string) => `New tactic for ${title}`,
        tacticPlaceholder: 'Add a new tactic...',
        addTactic: 'Add tactic',
      };
  
  const activePeriod = periods.find(p => p.id === activePeriodId);
  
  const handleAddGoal = () => {
    if (!goalTitle.trim()) {
      setGoalTitleError(copy.titleRequired);
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
        <p className="text-gray-600">{copy.createFirstPeriod}</p>
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
                : copy.chooseDueDay
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
                <div className="text-sm font-semibold text-gray-900">{copy.dueDay}</div>
                <div className="text-xs text-gray-500">
                  {selectedDate
                    ? format(selectedDate, 'EEEE, MMM d, yyyy')
                    : copy.pickDay}
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
              {copy.today}
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
              {copy.clear}
            </button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="mb-1 text-2xl font-bold text-gray-900 sm:mb-2 sm:text-3xl">{copy.pageTitle}</h2>
          <p className="hidden text-gray-600 sm:block">{copy.pageDescription}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowGoalForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          {copy.addGoal}
        </button>
      </div>
      
      {/* Add Goal Form */}
      {showGoalForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
          <h3 className="font-bold text-gray-900 mb-4">{copy.createNewGoal}</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="goal-title" className="block text-sm font-medium text-gray-700 mb-2">
                {copy.goalTitle}
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
                placeholder={copy.goalPlaceholder}
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
                {copy.description}
              </label>
              <textarea
                id="goal-description"
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                placeholder={copy.descriptionPlaceholder}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleAddGoal}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {copy.createGoal}
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
                {copy.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Goals List */}
      {activePeriod.goals.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center sm:p-12">
          <Target className="mx-auto mb-4 h-12 w-12 text-gray-400 sm:h-16 sm:w-16" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">{copy.noGoalsTitle}</h3>
          <p className="mb-6 text-gray-600">{copy.noGoalsDescription}</p>
          <button
            type="button"
            onClick={() => setShowGoalForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {copy.createFirstGoal}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {activePeriod.goals.map((goal) => {
            const isExpanded = expandedGoal === goal.id;
            const tacticsId = `goal-tactics-${goal.id}`;
            const tacticInputId = `tactic-title-${goal.id}`;

            return (
            <div key={goal.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              {/* Goal Header */}
              <div className="p-4 transition-colors hover:bg-gray-50 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <button
                    type="button"
                    aria-label={`${isExpanded ? copy.collapse : copy.expand} ${copy.goal} ${goal.title}`}
                    aria-expanded={isExpanded}
                    aria-controls={tacticsId}
                    title={`${isExpanded ? copy.collapse : copy.expand} ${copy.goal} ${goal.title}`}
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
                    {goal.description && <p className="ml-16 hidden text-gray-600 sm:block">{goal.description}</p>}

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
                        {goal.tactics.filter(t => t.completed).length}/{goal.tactics.length} {language === 'zh' ? '策略' : 'tactics'}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`${copy.deleteGoal} ${goal.title}`}
                      title={`${copy.deleteGoal} ${goal.title}`}
                      onClick={() => {
                        if (confirm(copy.deleteGoalConfirm(goal.title))) {
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
                <div id={tacticsId} className="border-t border-gray-200 bg-gray-50 p-4 sm:p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">{copy.tactics}</h4>
                  
                  {/* Tactics List */}
                  <div className="space-y-2 mb-4">
                    {goal.tactics.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">
                        {copy.noTactics}
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
                                ? `${copy.markIncomplete} ${tactic.title}`
                                : `${copy.markComplete} ${tactic.title}`
                            }
                            title={
                              tactic.completed
                                ? `${copy.markIncomplete} ${tactic.title}`
                                : `${copy.markComplete} ${tactic.title}`
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
                            aria-label={`${copy.deleteTactic} ${tactic.title}`}
                            title={`${copy.deleteTactic} ${tactic.title}`}
                            onClick={() => {
                              if (confirm(copy.deleteTacticConfirm(tactic.title))) {
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
                        {copy.newTactic(goal.title)}
                      </label>
                      <input
                        id={tacticInputId}
                        type="text"
                        value={tacticInputs[goal.id] || ''}
                        onChange={(e) =>
                          setTacticInputs({ ...tacticInputs, [goal.id]: e.target.value })
                        }
                        placeholder={copy.tacticPlaceholder}
                        className="min-w-[14rem] flex-[1_1_18rem] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {renderDueDatePicker(goal.id)}
                      <button
                        type="button"
                        aria-label={`${copy.addTactic} ${goal.title}`}
                        title={`${copy.addTactic} ${goal.title}`}
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
