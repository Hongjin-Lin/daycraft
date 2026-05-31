import { useNavigate } from 'react-router';
import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { Bot, Calendar, CheckCircle2, ChevronRight, Target, TrendingUp } from 'lucide-react';
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

export function Dashboard() {
  const navigate = useNavigate();
  const { periods, activePeriodId, todos, createPeriod } = useStore();
  const activePeriod = periods.find(p => p.id === activePeriodId);

  const handleCreatePeriod = () => {
    const today = new Date();
    createPeriod(today, endDateForWeeks(today, 12));
  };

  if (!activePeriod) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <Target className="mx-auto mb-4 h-12 w-12 text-blue-600" />
          <h2 className="mb-2 text-2xl font-semibold text-gray-950">Start your first planning period</h2>
          <p className="mb-6 text-sm leading-6 text-gray-600">
            Create a default 12 week period now. You can change the start and end dates after it is created.
          </p>
          <button
            onClick={handleCreatePeriod}
            className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create period
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
    return date >= formatISODate(activePeriod.startDate) && date <= formatISODate(activePeriod.endDate);
  });
  const completedPeriodTodos = weekTodos.filter(t => t.completed).length;
  const executionRate = weekTodos.length > 0 ? Math.round((completedPeriodTodos / weekTodos.length) * 100) : 0;

  const topGoals = activePeriod.goals.slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-gray-950">Dashboard</h2>
              <p className="mt-1 text-sm text-gray-600">
                {format(activePeriod.startDate, 'MMM d, yyyy')} - {format(activePeriod.endDate, 'MMM d, yyyy')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-medium text-gray-600">
              <span className="rounded-md bg-gray-100 px-2.5 py-1">{totalWeeks} weeks</span>
              <span className="rounded-md bg-gray-100 px-2.5 py-1">{daysPassed}/{totalDays} days</span>
              <span className="rounded-md bg-gray-100 px-2.5 py-1">{daysRemaining} days left</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <PeriodSettings period={activePeriod} />
            <button
              onClick={() => navigate('/calendar')}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Plan today
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Period progress</span>
            <span className="font-semibold text-gray-950">{timeProgress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${timeProgress}%` }} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Goals"
          value={`${totalGoals}`}
          detail={`${averageProgress}% average progress`}
          icon={<Target className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          label="Today's Tasks"
          value={`${completedTodayTodos}/${todayTodos.length}`}
          detail={todayTodos.length > 0 ? 'Tasks completed today' : 'No tasks planned today'}
          icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
        />
        <MetricCard
          label="Execution Score"
          value={`${executionRate}%`}
          detail={`${completedPeriodTodos}/${weekTodos.length} period tasks`}
          icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
        />
        <MetricCard
          label="Agent Ready"
          value="MCP"
          detail="Prepared for background logging"
          icon={<Bot className="h-5 w-5 text-gray-700" />}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-950">Goals</h3>
              <p className="text-sm text-gray-500">Top goals for the active period.</p>
            </div>
            <button
              onClick={() => navigate('/goals')}
              className="text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              View all
            </button>
          </div>

          {topGoals.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center">
              <p className="mb-3 text-sm text-gray-600">No goals yet for this period.</p>
              <button
                onClick={() => navigate('/goals')}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Add goal
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {topGoals.map(goal => (
                <div key={goal.id} className="rounded-md border border-gray-200 p-4">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold text-gray-950">{goal.title}</h4>
                      {goal.description && <p className="mt-1 text-sm text-gray-500">{goal.description}</p>}
                    </div>
                    <span className="text-sm font-semibold text-gray-950">{goal.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${goal.progress}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {goal.tactics.filter(t => t.completed).length}/{goal.tactics.length} tactics complete
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-700" />
              <h3 className="text-sm font-semibold text-blue-950">AI agent workspace</h3>
            </div>
            <p className="text-sm leading-6 text-blue-900">
              MCP tools can create goals, tactics, todos, and scores without opening the app. The UI now keeps period dates explicit so agents can log against the correct range.
            </p>
            <div className="mt-4 rounded-md bg-white/70 px-3 py-2 text-xs font-medium text-blue-900">
              Next: expose authenticated agent tools with env-based credentials.
            </div>
          </div>
          <ProgressTracker />
        </div>
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
