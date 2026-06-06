import { useStore } from '../lib/store';
import { format, eachDayOfInterval, addDays, isWithinInterval } from 'date-fns';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, Target, Calendar, Award, Activity, Zap } from 'lucide-react';
import { Badge } from './ui/badge';
import { dateFromISO, daysInPeriod, daysPassedInPeriod, periodPercentComplete, weeksInPeriod } from '../lib/period-utils';
import { useLanguage } from '../lib/i18n';

export function Analytics() {
  const { language } = useLanguage();
  const { periods, activePeriodId, todos, weeklyScores } = useStore();
  const activePeriod = periods.find(p => p.id === activePeriodId);
  const copy = language === 'zh'
    ? {
        noPeriod: '请先在总览页创建一个规划周期。',
        title: '数据分析',
        description: '查看当前周期的进展、执行和趋势。',
        timeProgress: '时间进度',
        daysRemaining: '天剩余',
        goalProgress: '目标进度',
        goalsComplete: (done: number, total: number) => `${done} / ${total} 个目标完成`,
        ahead: '领先',
        behind: '落后',
        onTrack: '按计划',
        executionScore: '执行分',
        weeksTracked: '周已记录',
        startReview: '先做一次周复盘',
        excellent: '优秀',
        good: '良好',
        needsPlan: '需要收紧计划',
        predictedOutcome: '预测结果',
        projectedFinal: '预计最终进度',
        currentPace: '基于当前节奏',
        weeklyTrend: '周执行趋势',
        weeklyTrendDescription: '每周执行分与 85% 目标对比',
        target: '目标 (85%)',
        actualScore: '实际分',
        goalDistribution: '目标进度分布',
        goalDistributionDescription: '目标完成状态拆分',
        noGoals: '暂无目标可显示',
        cumulative: '累计任务完成',
        cumulativeDescription: '实际完成率与预期对比',
        day: '天',
        completion: '完成率 %',
        expected: '预期',
        actual: '实际',
        recentActivity: '最近活动（28 天）',
        recentActivityDescription: '每日任务完成率',
        completionLabel: '完成率',
        tasks: '任务',
        insights: '洞察与建议',
        behindTitle: '进度落后',
        behindBody: (delta: number) => `你比预期节奏落后 ${Math.abs(delta)}%。建议复盘目标，聚焦高优先级策略。`,
        aheadTitle: '进度领先',
        aheadBody: (delta: number) => `做得很好！你比预期节奏领先 ${delta}%。继续保持。`,
        lowExecutionTitle: '执行分偏低',
        lowExecutionBody: (score: number) => `当前平均执行分为 ${score}%。建议把每周承诺缩小到更现实的范围。`,
        noCompletedTitle: '还没有完成目标',
        noCompletedBody: (days: number) => `已经进行 ${days} 天仍未完成目标。可以把目标拆成更小、更容易推进的策略。`,
        outstandingTitle: '表现出色',
        outstandingBody: '执行和进度都很高，继续保持这个节奏。',
      }
    : {
        noPeriod: 'Please create a planning period first from the dashboard.',
        title: 'Analytics Dashboard',
        description: 'Comprehensive insights and predictions for your active period',
        timeProgress: 'Time Progress',
        daysRemaining: 'days remaining',
        goalProgress: 'Goal Progress',
        goalsComplete: (done: number, total: number) => `${done} of ${total} goals complete`,
        ahead: 'ahead',
        behind: 'behind',
        onTrack: 'On track',
        executionScore: 'Execution Score',
        weeksTracked: 'weeks tracked',
        startReview: 'Start with a weekly review',
        excellent: 'Excellent',
        good: 'Good',
        needsPlan: 'Needs a tighter plan',
        predictedOutcome: 'Predicted Outcome',
        projectedFinal: 'Projected final progress',
        currentPace: 'Based on current pace',
        weeklyTrend: 'Weekly Execution Trend',
        weeklyTrendDescription: 'Your weekly execution scores vs. 85% target',
        target: 'Target (85%)',
        actualScore: 'Actual Score',
        goalDistribution: 'Goal Progress Distribution',
        goalDistributionDescription: 'Breakdown of goal completion status',
        noGoals: 'No goals to display',
        cumulative: 'Cumulative Task Completion',
        cumulativeDescription: 'Actual vs. expected completion rate over time',
        day: 'Day',
        completion: 'Completion %',
        expected: 'Expected',
        actual: 'Actual',
        recentActivity: 'Recent Activity (Last 28 Days)',
        recentActivityDescription: 'Daily task completion rates',
        completionLabel: 'Completion',
        tasks: 'Tasks',
        insights: 'Insights & Recommendations',
        behindTitle: 'Behind Schedule',
        behindBody: (delta: number) => `You're ${Math.abs(delta)}% behind the expected pace. Consider reviewing your goals and focusing on high-priority tactics.`,
        aheadTitle: 'Ahead of Schedule',
        aheadBody: (delta: number) => `Great work! You're ${delta}% ahead of the expected pace. Keep up the momentum!`,
        lowExecutionTitle: 'Low Execution Score',
        lowExecutionBody: (score: number) => `Your average execution score is ${score}%. Aim for at least 85% to stay on track. Review your weekly commitments and ensure they're realistic.`,
        noCompletedTitle: 'No Completed Goals Yet',
        noCompletedBody: (days: number) => `You're ${days} days in without completing a goal. Consider breaking down your goals into smaller, more achievable tactics.`,
        outstandingTitle: 'Outstanding Performance',
        outstandingBody: "You're crushing it! Both your execution and progress scores are excellent. This is what winning looks like!",
      };
  
  if (!activePeriod) {
    return (
      <div className="text-center py-12">
        <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">{copy.noPeriod}</p>
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
  const scheduledTodos = todos.filter((todo) => Boolean(todo.date)) as Array<typeof todos[number] & { date: string }>;
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
    const weekTodos = scheduledTodos.filter(t => {
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
    { name: 'Needs a plan (0-34%)', value: activePeriod.goals.filter(g => g.progress < 35).length, color: '#ef4444' },
  ].filter(item => item.value > 0);
  
  // Daily Task Heatmap Data (last 4 weeks)
  const fourWeeksAgo = addDays(today, -28);
  const heatmapDays = eachDayOfInterval({ start: fourWeeksAgo, end: today });
  const heatmapData = heatmapDays.map(day => {
    const dayTodos = scheduledTodos.filter(t => t.date === format(day, 'yyyy-MM-dd'));
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
    const todosUpToDay = scheduledTodos.filter(t => t.date <= dayStr);
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
        <h2 className="mb-1 text-2xl font-bold text-gray-900 sm:mb-2 sm:text-3xl">{copy.title}</h2>
        <p className="hidden text-gray-600 sm:block">{copy.description}</p>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {copy.timeProgress}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">{percentComplete}%</div>
            <p className="text-sm text-gray-600">{daysRemaining} {copy.daysRemaining}</p>
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
              {copy.goalProgress}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">{averageProgress}%</div>
            <p className="text-sm text-gray-600">
              {copy.goalsComplete(completedGoals, totalGoals)}
            </p>
            <div className="flex items-center gap-2 mt-3">
              {progressDelta > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">+{progressDelta}% {copy.ahead}</span>
                </>
              ) : progressDelta < 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
                  <span className="text-sm font-medium text-red-600">{progressDelta}% {copy.behind}</span>
                </>
              ) : (
                <span className="text-sm font-medium text-gray-600">{copy.onTrack}</span>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              {copy.executionScore}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold mb-1 ${
              periodScores.length === 0 ? 'text-gray-900' :
              averageExecutionScore >= 85 ? 'text-green-600' :
              averageExecutionScore >= 65 ? 'text-blue-600' :
              averageExecutionScore >= 50 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {periodScores.length > 0 ? `${averageExecutionScore}%` : '—'}
            </div>
            <p className="text-sm text-gray-600">{periodScores.length} {copy.weeksTracked}</p>
            <Badge className="mt-3" variant={averageExecutionScore >= 85 ? 'default' : 'secondary'}>
              {periodScores.length === 0
                ? copy.startReview
                : averageExecutionScore >= 85
                  ? copy.excellent
                  : averageExecutionScore >= 65
                    ? copy.good
                    : copy.needsPlan}
            </Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              {copy.predictedOutcome}
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
            <p className="text-sm text-gray-600">{copy.projectedFinal}</p>
            <p className="mt-2 hidden text-xs text-gray-500 sm:block">{copy.currentPace}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Execution Trend */}
        <Card>
          <CardHeader>
            <CardTitle>{copy.weeklyTrend}</CardTitle>
            <CardDescription>{copy.weeklyTrendDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="target" fill="#94a3b8" name={copy.target} />
                <Bar dataKey="score" fill="#3b82f6" name={copy.actualScore} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Goal Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{copy.goalDistribution}</CardTitle>
            <CardDescription>{copy.goalDistributionDescription}</CardDescription>
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
                {copy.noGoals}
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
            <CardTitle>{copy.cumulative}</CardTitle>
            <CardDescription>{copy.cumulativeDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" label={{ value: copy.day, position: 'insideBottom', offset: -5 }} />
                <YAxis domain={[0, 100]} label={{ value: copy.completion, angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="expected" stroke="#94a3b8" fill="#e2e8f0" name={copy.expected} />
                <Area type="monotone" dataKey="actual" stroke="#3b82f6" fill="#93c5fd" name={copy.actual} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Daily Completion Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>{copy.recentActivity}</CardTitle>
            <CardDescription>{copy.recentActivityDescription}</CardDescription>
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
                          <p className="text-sm text-gray-600">{copy.completionLabel}: {payload[0].value}%</p>
                          <p className="text-sm text-gray-600">{copy.tasks}: {payload[0].payload.tasks}</p>
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
                  name={copy.completionLabel}
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
            {copy.insights}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {averageProgress < expectedProgress && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-1">⚠️ {copy.behindTitle}</h4>
              <p className="text-sm text-yellow-800">
                {copy.behindBody(progressDelta)}
              </p>
            </div>
          )}
          
          {averageProgress > expectedProgress && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-1">🎉 {copy.aheadTitle}</h4>
              <p className="text-sm text-green-800">
                {copy.aheadBody(progressDelta)}
              </p>
            </div>
          )}
          
          {periodScores.length > 0 && averageExecutionScore < 65 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-semibold text-red-900 mb-1">🚨 {copy.lowExecutionTitle}</h4>
              <p className="text-sm text-red-800">
                {copy.lowExecutionBody(averageExecutionScore)}
              </p>
            </div>
          )}
          
          {completedGoals === 0 && totalGoals > 0 && daysPassed > 28 && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-semibold text-orange-900 mb-1">💡 {copy.noCompletedTitle}</h4>
              <p className="text-sm text-orange-800">
                {copy.noCompletedBody(daysPassed)}
              </p>
            </div>
          )}
          
          {averageExecutionScore >= 85 && averageProgress >= 85 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-1">⭐ {copy.outstandingTitle}</h4>
              <p className="text-sm text-blue-800">
                {copy.outstandingBody}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
