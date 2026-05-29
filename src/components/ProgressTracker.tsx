import { useStore } from '../lib/store';
import { format, isWithinInterval } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function ProgressTracker() {
  const { periods, activePeriodId, todos } = useStore();
  const activePeriod = periods.find(p => p.id === activePeriodId);
  
  if (!activePeriod) return null;
  
  const now = new Date();
  const weeksPassed = Math.floor(
    (now.getTime() - activePeriod.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  const weeksTotal = 12;
  const expectedProgress = Math.min(Math.round((weeksPassed / weeksTotal) * 100), 100);
  
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
    const todoDate = new Date(t.date);
    return isWithinInterval(todoDate, { start: startOfWeek, end: endOfWeek });
  });
  
  const completedWeekTodos = weekTodos.filter(t => t.completed).length;
  const weekCompletionRate = weekTodos.length > 0
    ? Math.round((completedWeekTodos / weekTodos.length) * 100)
    : 0;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Progress Tracking</h3>
      
      <div className="space-y-6">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
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
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-gray-400"
                style={{ left: `${(expectedProgress / averageProgress) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">
              Expected: {expectedProgress}% (Week {weeksPassed + 1} of {weeksTotal})
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
            <span className="text-sm font-medium text-gray-700">This Week</span>
            <span className="text-lg font-bold text-gray-900">
              {completedWeekTodos} / {weekTodos.length} tasks
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-600 h-3 rounded-full transition-all"
              style={{ width: `${weekCompletionRate}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {weekCompletionRate}% completion rate
          </div>
        </div>
        
        {/* Goals Breakdown */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Goals Breakdown</h4>
          <div className="space-y-3">
            {activePeriod.goals.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No goals to track</p>
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
                    {goal.tactics.filter(t => t.completed).length} / {goal.tactics.length} tactics
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
