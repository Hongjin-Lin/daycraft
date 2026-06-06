import { useNavigate } from 'react-router';
import type { ReactNode } from 'react';
import { ArrowRight, Calendar, CheckCircle2, ChevronRight, Target, TrendingUp } from 'lucide-react';
import { useStore } from '../lib/store';
import {
  daysInPeriod,
  daysPassedInPeriod,
  daysRemainingInPeriod,
  endDateForWeeks,
  formatISODate,
  periodPercentComplete,
  weeksInPeriod,
} from '../lib/period-utils';
import { PeriodSettings } from './PeriodSettings';
import { ProgressTracker } from './ProgressTracker';
import { formatCount, formatRangeDate, useLanguage } from '../lib/i18n';

export function Dashboard() {
  const navigate = useNavigate();
  const { periods, activePeriodId, todos, weeklyScores, createPeriod } = useStore();
  const { language } = useLanguage();
  const activePeriod = periods.find(p => p.id === activePeriodId);
  const copy = language === 'zh'
    ? {
        startTitle: '开始第一个规划周期',
        startDescription: '先创建一个默认 12 周周期，之后可以随时调整起止日期。',
        createPeriod: '创建周期',
        dashboard: '总览',
        daysLeft: '天剩余',
        days: '天',
        periodProgress: '周期进度',
        planToday: '安排今天',
        nextBestAction: '下一步',
        addFirstGoal: '添加首个目标',
        reviewGoals: '查看目标',
        firstGoalDescription: '先定义这个周期最重要的一个结果。',
        goalsInPeriod: (count: number) => `${count} 个目标正在进行。`,
        planTodaysTask: '安排今日任务',
        viewTodaysPlan: '查看今日计划',
        scheduleAction: '给今天安排一个具体行动。',
        tasksPlannedToday: (count: number) => `${count} 个任务安排在今天。`,
        reviewScorecard: '查看复盘',
        startScorecard: '开始复盘',
        checkExecution: '检查执行情况，微调本周计划。',
        createFirstReview: '创建第一次周执行复盘。',
        open: '打开',
        goals: '目标',
        averageProgress: '平均进度',
        todaysTasks: '今日任务',
        tasksCompletedToday: '今日已完成',
        noTasksToday: '今天还没有任务',
        executionScore: '执行分',
        periodTasks: '周期任务',
        topGoals: '目标',
        topGoalsDescription: '当前周期的优先目标。',
        viewAll: '全部',
        noGoals: '这个周期还没有目标。',
        addGoal: '添加目标',
        tacticsComplete: '策略完成',
      }
    : {
        startTitle: 'Start your first planning period',
        startDescription: 'Create a default 12 week period now. You can change the start and end dates after it is created.',
        createPeriod: 'Create period',
        dashboard: 'Dashboard',
        daysLeft: 'days left',
        days: 'days',
        periodProgress: 'Period progress',
        planToday: 'Plan today',
        nextBestAction: 'Next best action',
        addFirstGoal: 'Add first goal',
        reviewGoals: 'Review goals',
        firstGoalDescription: 'Define one outcome for this planning period.',
        goalsInPeriod: (count: number) => `${count} goal${count === 1 ? '' : 's'} in this period.`,
        planTodaysTask: "Plan today's task",
        viewTodaysPlan: "View today's plan",
        scheduleAction: 'Schedule the next concrete action for today.',
        tasksPlannedToday: (count: number) => `${count} task${count === 1 ? '' : 's'} planned today.`,
        reviewScorecard: 'Review scorecard',
        startScorecard: 'Start scorecard',
        checkExecution: 'Check execution and adjust the week.',
        createFirstReview: 'Create the first weekly execution review.',
        open: 'Open',
        goals: 'Goals',
        averageProgress: 'average progress',
        todaysTasks: "Today's Tasks",
        tasksCompletedToday: 'Tasks completed today',
        noTasksToday: 'No tasks planned today',
        executionScore: 'Execution Score',
        periodTasks: 'period tasks',
        topGoals: 'Goals',
        topGoalsDescription: 'Top goals for the active period.',
        viewAll: 'View all',
        noGoals: 'No goals yet for this period.',
        addGoal: 'Add goal',
        tacticsComplete: 'tactics complete',
      };

  const handleCreatePeriod = () => {
    const today = new Date();
    createPeriod(today, endDateForWeeks(today, 12));
  };

  if (!activePeriod) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <Target className="mx-auto mb-4 h-12 w-12 text-blue-600" />
          <h2 className="mb-2 text-2xl font-semibold text-gray-950">{copy.startTitle}</h2>
          <p className="mb-6 text-sm leading-6 text-gray-600">{copy.startDescription}</p>
          <button
            onClick={handleCreatePeriod}
            className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {copy.createPeriod}
          </button>
        </div>
      </div>
    );
  }

  const totalDays = daysInPeriod(activePeriod.startDate, activePeriod.endDate);
  const daysPassed = Math.min(totalDays, daysPassedInPeriod(activePeriod.startDate));
  const daysRemaining = daysRemainingInPeriod(activePeriod.endDate);
  const totalWeeks = weeksInPeriod(activePeriod.startDate, activePeriod.endDate);
  const timeProgress = periodPercentComplete(activePeriod.startDate, activePeriod.endDate);

  const totalGoals = activePeriod.goals.length;
  const averageProgress = totalGoals > 0
    ? Math.round(activePeriod.goals.reduce((sum, g) => sum + g.progress, 0) / totalGoals)
    : 0;

  const todayStr = formatISODate(new Date());
  const todayTodos = todos.filter(t => t.date === todayStr);
  const completedTodayTodos = todayTodos.filter(t => t.completed).length;
  const weekTodos = todos.filter(t => {
    const date = t.date;
    if (!date) return false;
    return date >= formatISODate(activePeriod.startDate) && date <= formatISODate(activePeriod.endDate);
  });
  const completedPeriodTodos = weekTodos.filter(t => t.completed).length;
  const executionRate = weekTodos.length > 0 ? Math.round((completedPeriodTodos / weekTodos.length) * 100) : 0;
  const hasAnyScorecard = weeklyScores.some(score => score.periodId === activePeriod.id);

  const topGoals = activePeriod.goals.slice(0, 4);
  const setupActions = [
    {
      title: totalGoals === 0 ? copy.addFirstGoal : copy.reviewGoals,
      description: totalGoals === 0
        ? copy.firstGoalDescription
        : copy.goalsInPeriod(totalGoals),
      path: '/goals',
      icon: Target,
      isDone: totalGoals > 0,
    },
    {
      title: todayTodos.length === 0 ? copy.planTodaysTask : copy.viewTodaysPlan,
      description: todayTodos.length === 0
        ? copy.scheduleAction
        : copy.tasksPlannedToday(todayTodos.length),
      path: '/calendar',
      icon: Calendar,
      isDone: todayTodos.length > 0,
    },
    {
      title: hasAnyScorecard ? copy.reviewScorecard : copy.startScorecard,
      description: hasAnyScorecard
        ? copy.checkExecution
        : copy.createFirstReview,
      path: '/scorecard',
      icon: CheckCircle2,
      isDone: hasAnyScorecard,
    },
  ];
  const nextAction = setupActions.find(action => !action.isDone) ?? setupActions[2];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-gray-950 sm:text-2xl">{copy.dashboard}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {formatRangeDate(language, activePeriod.startDate)} - {formatRangeDate(language, activePeriod.endDate)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-medium text-gray-600">
              <span className="rounded-md bg-gray-100 px-2.5 py-1">{formatCount(language, totalWeeks, 'week', 'weeks', '周')}</span>
              <span className="rounded-md bg-gray-100 px-2.5 py-1">{daysPassed}/{totalDays} {copy.days}</span>
              <span className="rounded-md bg-gray-100 px-2.5 py-1">{daysRemaining} {copy.daysLeft}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <PeriodSettings period={activePeriod} />
            <button
              onClick={() => navigate('/calendar')}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {copy.planToday}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">{copy.periodProgress}</span>
            <span className="font-semibold text-gray-950">{timeProgress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${timeProgress}%` }} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-blue-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-blue-700">{copy.nextBestAction}</p>
            <h3 className="text-xl font-semibold text-gray-950">{nextAction.title}</h3>
            <p className="mt-1 hidden text-sm leading-6 text-gray-600 sm:block">{nextAction.description}</p>
          </div>
          <button
            onClick={() => navigate(nextAction.path)}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {copy.open}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {setupActions.map((action) => {
            const Icon = action.icon;
            const recommended = action === nextAction;

            return (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className={`flex items-start justify-between gap-3 rounded-md border p-4 text-left transition-colors ${
                  recommended
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex min-w-0 items-start gap-2">
                  <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${action.isDone ? 'text-green-600' : 'text-blue-600'}`} />
                  <span className="min-w-0">
                    <span className="block font-semibold">{action.title}</span>
                    <span className="mt-1 hidden text-xs leading-5 text-gray-500 sm:block">{action.description}</span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          label={copy.goals}
          value={`${totalGoals}`}
          detail={`${averageProgress}% ${copy.averageProgress}`}
          icon={<Target className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          label={copy.todaysTasks}
          value={`${completedTodayTodos}/${todayTodos.length}`}
          detail={todayTodos.length > 0 ? copy.tasksCompletedToday : copy.noTasksToday}
          icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
        />
        <MetricCard
          label={copy.executionScore}
          value={`${executionRate}%`}
          detail={`${completedPeriodTodos}/${weekTodos.length} ${copy.periodTasks}`}
          icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-950">{copy.topGoals}</h3>
              <p className="hidden text-sm text-gray-500 sm:block">{copy.topGoalsDescription}</p>
            </div>
            <button
              onClick={() => navigate('/goals')}
              className="text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              {copy.viewAll}
            </button>
          </div>

          {topGoals.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center">
              <p className="mb-3 text-sm text-gray-600">{copy.noGoals}</p>
              <button
                onClick={() => navigate('/goals')}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {copy.addGoal}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {topGoals.map(goal => (
                <div key={goal.id} className="rounded-md border border-gray-200 p-4">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold text-gray-950">{goal.title}</h4>
                      {goal.description && <p className="mt-1 hidden text-sm text-gray-500 sm:line-clamp-2 sm:block">{goal.description}</p>}
                    </div>
                    <span className="text-sm font-semibold text-gray-950">{goal.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${goal.progress}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {goal.tactics.filter(t => t.completed).length}/{goal.tactics.length} {copy.tacticsComplete}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <ProgressTracker />
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-semibold tracking-tight text-gray-950">{value}</div>
      <div className="mt-1 text-sm text-gray-500">{detail}</div>
    </div>
  );
}
