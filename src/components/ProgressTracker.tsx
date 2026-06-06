import { useStore } from '../lib/store';
import { format, isWithinInterval } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { dateFromISO, getCurrentWeekNumber, periodPercentComplete, weeksInPeriod } from '../lib/period-utils';
import { useLanguage } from '../lib/i18n';

export function ProgressTracker() {
  const { language } = useLanguage();
  const { periods, activePeriodId, todos } = useStore();
  const activePeriod = periods.find(p => p.id === activePeriodId);
  
  if (!activePeriod) return null;
  
  const now = new Date();
  const weeksTotal = weeksInPeriod(activePeriod.startDate, activePeriod.endDate);
  const currentWeek = getCurrentWeekNumber(activePeriod.startDate, activePeriod.endDate, now);
  const expectedProgress = periodPercentComplete(activePeriod.startDate, activePeriod.endDate, now);
  
  const totalGoals = activePeriod.goals.length;
  const averageProgress = totalGoals > 0
    ? Math.round(activePeriod.goals.reduce((sum, g) => sum + g.progress, 0) / totalGoals)
    : 0;
  
  const progressDelta = averageProgress - expectedProgress;
  
  // Calculate weekly stats
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  const weekTodos = todos.filter(t => {
    if (!t.date) return false;
    const todoDate = dateFromISO(t.date);
    return isWithinInterval(todoDate, { start: startOfWeek, end: endOfWeek });
  });
  
  const completedWeekTodos = weekTodos.filter(t => t.completed).length;
  const weekCompletionRate = weekTodos.length > 0
    ? Math.round((completedWeekTodos / weekTodos.length) * 100)
    : 0;
  const copy = language === 'zh'
    ? {
        title: '进度追踪',
        overall: '整体进度',
        expected: '预期',
        week: '第',
        of: '共',
        thisWeek: '本周',
        tasks: '任务',
        completionRate: '完成率',
        goalsBreakdown: '目标拆解',
        noGoals: '暂无可追踪目标',
        tactics: '策略',
      }
    : {
        title: 'Progress Tracking',
        overall: 'Overall Progress',
        expected: 'Expected',
        week: 'Week',
        of: 'of',
        thisWeek: 'This Week',
        tasks: 'tasks',
        completionRate: 'completion rate',
        goalsBreakdown: 'Goals Breakdown',
        noGoals: 'No goals to track',
        tactics: 'tactics',
      };
  
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
      <h3 className="mb-4 text-lg font-bold text-gray-900 sm:mb-6 sm:text-xl">{copy.title}</h3>
      
      <div className="space-y-6">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{copy.overall}</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">{averageProgress}%</span>
              {progressDelta > 5 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : progressDelta < -5 ? (
                <TrendingDown className="w-5 h-5 text-red-600" />
              ) : (
                <Minus className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all relative"
              style={{ width: `${averageProgress}%` }}
            >
              {/* Expected progress marker */}
              {averageProgress > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-gray-400"
                  style={{ left: `${Math.min(100, (expectedProgress / averageProgress) * 100)}%` }}
                />
              )}
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">
              {copy.expected}: {expectedProgress}% ({copy.week} {currentWeek} {copy.of} {weeksTotal})
            </span>
            <span
              className={`text-xs font-medium ${
                progressDelta > 0 ? 'text-green-600' : progressDelta < 0 ? 'text-red-600' : 'text-gray-600'
              }`}
            >
              {progressDelta > 0 ? '+' : ''}{progressDelta}%
            </span>
          </div>
        </div>
        
        {/* This Week Stats */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{copy.thisWeek}</span>
            <span className="text-lg font-bold text-gray-900">
              {completedWeekTodos} / {weekTodos.length} {copy.tasks}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-600 h-3 rounded-full transition-all"
              style={{ width: `${weekCompletionRate}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {weekCompletionRate}% {copy.completionRate}
          </div>
        </div>
        
        {/* Goals Breakdown */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">{copy.goalsBreakdown}</h4>
          <div className="space-y-3">
            {activePeriod.goals.length === 0 ? (
              <p className="text-sm text-gray-500 italic">{copy.noGoals}</p>
            ) : (
              activePeriod.goals.map((goal) => (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-900">{goal.title}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {goal.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        goal.progress >= 80
                          ? 'bg-green-600'
                          : goal.progress >= 50
                          ? 'bg-blue-600'
                          : 'bg-orange-600'
                      }`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {goal.tactics.filter(t => t.completed).length} / {goal.tactics.length} {copy.tactics}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
