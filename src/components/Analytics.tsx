import { useStore } from '../lib/store';
import { format, eachDayOfInterval, addDays, isWithinInterval } from 'date-fns';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, Target, Calendar, Award, Activity, Zap } from 'lucide-react';
import { Badge } from './ui/badge';
import { dateFromISO, daysInPeriod, daysPassedInPeriod, periodPercentComplete, weeksInPeriod } from '../lib/period-utils';

export function Analytics() {
  const { periods, activePeriodId, todos, weeklyScores } = useStore();
  const activePeriod = periods.find(p => p.id === activePeriodId);
  
  if (!activePeriod) {
    return (
      <div className="text-center py-12">
        <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Please create a planning period first from the dashboard.</p>
      </div>
    );
  }
  
  // Calculate time-based metrics
  const today = new Date();
  const totalDays = daysInPeriod(activePeriod.startDate, activePeriod.endDate);
  const totalWeeks = weeksInPeriod(activePeriod.startDate, activePeriod.endDate);
  const daysPassed = Math.min(totalDays, daysPassedInPeriod(activePeriod.startDate, today));
  const daysRemaining = Math.max(0, totalDays - daysPassed);
  const currentWeek = Math.min(Math.floor(Math.max(0, daysPassed - 1) / 7) + 1, totalWeeks);
  const percentComplete = periodPercentComplete(activePeriod.startDate, activePeriod.endDate, today);
  
  // Goal metrics
  const totalGoals = activePeriod.goals.length;
  const averageProgress = totalGoals > 0
    ? Math.round(activePeriod.goals.reduce((sum, g) => sum + g.progress, 0) / totalGoals)
    : 0;
  const completedGoals = activePeriod.goals.filter(g => g.progress === 100).length;
  
  // Task metrics
  const allTodos = todos;
  const completedTodos = todos.filter(t => t.completed).length;
  const overallCompletionRate = allTodos.length > 0
    ? Math.round((completedTodos / allTodos.length) * 100)
    : 0;
  
  // Weekly execution scores
  const periodScores = weeklyScores.filter(s => s.periodId === activePeriod.id);
  const averageExecutionScore = periodScores.length > 0
    ? Math.round(periodScores.reduce((sum, s) => sum + s.executionScore, 0) / periodScores.length)
    : 0;
  
  // Prediction based on current pace
  const expectedProgress = Math.min(Math.round((daysPassed / totalDays) * 100), 100);
  const progressDelta = averageProgress - expectedProgress;
  const predictedFinalProgress = Math.max(0, Math.min(100, averageProgress + (progressDelta * ((totalDays - daysPassed) / Math.max(daysPassed, 1)))));
  
  // Weekly Execution Trend Chart Data
  const weeklyTrendData = Array.from({ length: totalWeeks }, (_, i) => {
    const weekNum = i + 1;
    const score = periodScores.find(s => s.weekNumber === weekNum);
    
    // Calculate actual completion for each week
    const weekStart = addDays(activePeriod.startDate, i * 7);
    const weekEnd = addDays(weekStart, 6);
    const weekTodos = todos.filter(t => {
      const todoDate = dateFromISO(t.date);
      return isWithinInterval(todoDate, { start: weekStart, end: weekEnd });
    });
    const weekCompleted = weekTodos.filter(t => t.completed).length;
    const actualScore = weekTodos.length > 0 ? Math.round((weekCompleted / weekTodos.length) * 100) : 0;
    
    return {
      week: `W${weekNum}`,
      score: score?.executionScore || (weekNum <= currentWeek ? actualScore : null),
      target: 85, // 85% is the recommended target
    };
  });
  
  // Goal Progress Distribution
  const goalDistributionData = [
    { name: 'Completed (100%)', value: activePeriod.goals.filter(g => g.progress === 100).length, color: '#22c55e' },
    { name: 'On Track (65-99%)', value: activePeriod.goals.filter(g => g.progress >= 65 && g.progress < 100).length, color: '#3b82f6' },
    { name: 'At Risk (35-64%)', value: activePeriod.goals.filter(g => g.progress >= 35 && g.progress < 65).length, color: '#f59e0b' },
    { name: 'Critical (0-34%)', value: activePeriod.goals.filter(g => g.progress < 35).length, color: '#ef4444' },
  ].filter(item => item.value > 0);
  
  // Daily Task Heatmap Data (last 4 weeks)
  const fourWeeksAgo = addDays(today, -28);
  const heatmapDays = eachDayOfInterval({ start: fourWeeksAgo, end: today });
  const heatmapData = heatmapDays.map(day => {
    const dayTodos = todos.filter(t => t.date === format(day, 'yyyy-MM-dd'));
    const completed = dayTodos.filter(t => t.completed).length;
    const total = dayTodos.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      date: format(day, 'MMM d'),
      completion: rate,
      tasks: total,
    };
  });
  
  // Cumulative Progress Chart
  const cumulativeData = Array.from({ length: Math.min(daysPassed + 1, totalDays) }, (_, i) => {
    const day = addDays(activePeriod.startDate, i);
    const dayStr = format(day, 'yyyy-MM-dd');
    const todosUpToDay = todos.filter(t => t.date <= dayStr);
    const completedUpToDay = todosUpToDay.filter(t => t.completed).length;
    const rate = todosUpToDay.length > 0 ? Math.round((completedUpToDay / todosUpToDay.length) * 100) : 0;
    
    return {
      day: i + 1,
      actual: rate,
      expected: Math.round(((i + 1) / totalDays) * 85), // Expected to maintain 85% throughout
    };
  }).filter((_, i) => i % 3 === 0); // Sample every 3 days for readability
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h2>
        <p className="text-gray-600">Comprehensive insights and predictions for your active period</p>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Time Progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">{percentComplete}%</div>
            <p className="text-sm text-gray-600">{daysRemaining} days remaining</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Goal Progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">{averageProgress}%</div>
            <p className="text-sm text-gray-600">
              {completedGoals} of {totalGoals} goals complete
            </p>
            <div className="flex items-center gap-2 mt-3">
              {progressDelta > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">+{progressDelta}% ahead</span>
                </>
              ) : progressDelta < 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
                  <span className="text-sm font-medium text-red-600">{progressDelta}% behind</span>
                </>
              ) : (
                <span className="text-sm font-medium text-gray-600">On track</span>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Execution Score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold mb-1 ${
              averageExecutionScore >= 85 ? 'text-green-600' :
              averageExecutionScore >= 65 ? 'text-blue-600' :
              averageExecutionScore >= 50 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {averageExecutionScore}%
            </div>
            <p className="text-sm text-gray-600">{periodScores.length} weeks tracked</p>
            <Badge className="mt-3" variant={averageExecutionScore >= 85 ? 'default' : 'secondary'}>
              {averageExecutionScore >= 85 ? 'Excellent' : averageExecutionScore >= 65 ? 'Good' : 'Needs Focus'}
            </Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Predicted Outcome
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold mb-1 ${
              predictedFinalProgress >= 85 ? 'text-green-600' :
              predictedFinalProgress >= 65 ? 'text-blue-600' :
              'text-yellow-600'
            }`}>
              {Math.round(predictedFinalProgress)}%
            </div>
            <p className="text-sm text-gray-600">Projected final progress</p>
            <p className="text-xs text-gray-500 mt-2">Based on current pace</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Execution Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Execution Trend</CardTitle>
            <CardDescription>Your weekly execution scores vs. 85% target</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="target" fill="#94a3b8" name="Target (85%)" />
                <Bar dataKey="score" fill="#3b82f6" name="Actual Score" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Goal Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Goal Progress Distribution</CardTitle>
            <CardDescription>Breakdown of goal completion status</CardDescription>
          </CardHeader>
          <CardContent>
            {goalDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={goalDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {goalDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No goals to display
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Cumulative Task Completion</CardTitle>
            <CardDescription>Actual vs. expected completion rate over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" label={{ value: 'Day', position: 'insideBottom', offset: -5 }} />
                <YAxis domain={[0, 100]} label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="expected" stroke="#94a3b8" fill="#e2e8f0" name="Expected" />
                <Area type="monotone" dataKey="actual" stroke="#3b82f6" fill="#93c5fd" name="Actual" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Daily Completion Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity (Last 28 Days)</CardTitle>
            <CardDescription>Daily task completion rates</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={heatmapData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={3}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-semibold">{payload[0].payload.date}</p>
                          <p className="text-sm text-gray-600">Completion: {payload[0].value}%</p>
                          <p className="text-sm text-gray-600">Tasks: {payload[0].payload.tasks}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="completion" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  name="Completion Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Insights & Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {averageProgress < expectedProgress && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-1">⚠️ Behind Schedule</h4>
              <p className="text-sm text-yellow-800">
                You're {Math.abs(progressDelta)}% behind the expected pace. Consider reviewing your goals and focusing on high-priority tactics.
              </p>
            </div>
          )}
          
          {averageProgress > expectedProgress && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-1">🎉 Ahead of Schedule</h4>
              <p className="text-sm text-green-800">
                Great work! You're {progressDelta}% ahead of the expected pace. Keep up the momentum!
              </p>
            </div>
          )}
          
          {averageExecutionScore < 65 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-semibold text-red-900 mb-1">🚨 Low Execution Score</h4>
              <p className="text-sm text-red-800">
                Your average execution score is {averageExecutionScore}%. Aim for at least 85% to stay on track. Review your weekly commitments and ensure they're realistic.
              </p>
            </div>
          )}
          
          {completedGoals === 0 && totalGoals > 0 && daysPassed > 28 && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-semibold text-orange-900 mb-1">💡 No Completed Goals Yet</h4>
              <p className="text-sm text-orange-800">
                You're {daysPassed} days in without completing a goal. Consider breaking down your goals into smaller, more achievable tactics.
              </p>
            </div>
          )}
          
          {averageExecutionScore >= 85 && averageProgress >= 85 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-1">⭐ Outstanding Performance</h4>
              <p className="text-sm text-blue-800">
                You're crushing it! Both your execution and progress scores are excellent. This is what winning looks like!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
