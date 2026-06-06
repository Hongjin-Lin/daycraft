import { useState } from 'react';
import { addDays, format, isWithinInterval } from 'date-fns';
import { AlertCircle, Check, ChevronLeft, ChevronRight, Edit2, Trophy } from 'lucide-react';
import { useStore } from '../lib/store';
import { dateFromISO, getCurrentWeekNumber, weeksInPeriod } from '../lib/period-utils';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { useLanguage } from '../lib/i18n';

export function Scorecard() {
  const { language } = useLanguage();
  const { periods, activePeriodId, todos, weeklyScores, saveWeeklyScore, updateWeeklyScore, getWeeklyScore } = useStore();
  const activePeriod = periods.find(p => p.id === activePeriodId);

  const [currentWeekNumber, setCurrentWeekNumber] = useState<number>(() => {
    if (!activePeriod) return 1;
    return getCurrentWeekNumber(activePeriod.startDate, activePeriod.endDate);
  });
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const copy = language === 'zh'
    ? {
        noPeriod: '请先在总览页创建一个规划周期。',
        title: '周复盘',
        description: '追踪当前规划周期的每周执行情况。',
        currentWeek: '当前周',
        week: '第',
        of: '共',
        averageScore: '平均分',
        weeksTracked: '周已记录',
        thisWeek: '本周',
        tasks: '任务',
        previousWeek: '上一周',
        nextWeek: '下一周',
        executionScore: '执行分',
        completedOutOf: (done: number, total: number) => `本周完成 ${done} / ${total} 个计划任务`,
        reflection: '每周反思',
        editNotes: '编辑笔记',
        addNotes: '添加笔记',
        save: '保存',
        placeholder: '哪些有效？下周需要改变什么？',
        noNotes: '还没有反思笔记。',
        taskBreakdown: '任务明细',
        noTasks: '本周还没有计划任务',
        goal: '目标',
        unscheduled: '未安排',
        overview: '周期概览',
        overviewDescription: '这个周期所有周的执行分',
        upcoming: '未开始',
      }
    : {
        noPeriod: 'Please create a planning period first from the dashboard.',
        title: 'Scorecard',
        description: 'Track weekly execution for the active planning period.',
        currentWeek: 'Current Week',
        week: 'Week',
        of: 'of',
        averageScore: 'Average Score',
        weeksTracked: 'weeks tracked',
        thisWeek: 'This Week',
        tasks: 'tasks',
        previousWeek: 'Previous week',
        nextWeek: 'Next week',
        executionScore: 'Execution Score',
        completedOutOf: (done: number, total: number) => `Completed ${done} out of ${total} planned tasks this week`,
        reflection: 'Weekly Reflection',
        editNotes: 'Edit Notes',
        addNotes: 'Add Notes',
        save: 'Save',
        placeholder: 'What worked? What needs to change next week?',
        noNotes: 'No reflection notes yet.',
        taskBreakdown: 'Task Breakdown',
        noTasks: 'No tasks planned for this week',
        goal: 'Goal',
        unscheduled: 'Unscheduled',
        overview: 'Period Overview',
        overviewDescription: 'Your execution score across all weeks in this period',
        upcoming: 'Upcoming',
      };

  if (!activePeriod) {
    return (
      <div className="py-12 text-center">
        <Trophy className="mx-auto mb-4 h-16 w-16 text-gray-400" />
        <p className="text-gray-600">{copy.noPeriod}</p>
      </div>
    );
  }

  const totalWeeks = weeksInPeriod(activePeriod.startDate, activePeriod.endDate);
  const activeWeekNumber = Math.min(currentWeekNumber, totalWeeks);

  const getWeekDates = (weekNum: number) => {
    const weekStart = addDays(activePeriod.startDate, (weekNum - 1) * 7);
    const naturalWeekEnd = addDays(weekStart, 6);
    const weekEnd = naturalWeekEnd > activePeriod.endDate ? activePeriod.endDate : naturalWeekEnd;
    return { weekStart, weekEnd };
  };

  const { weekStart, weekEnd } = getWeekDates(activeWeekNumber);
  const weekTodos = todos.filter(t => {
    if (!t.date) return false;
    const todoDate = dateFromISO(t.date);
    return isWithinInterval(todoDate, { start: weekStart, end: weekEnd });
  });
  const completedWeekTodos = weekTodos.filter(t => t.completed).length;
  const executionScore = weekTodos.length > 0
    ? Math.round((completedWeekTodos / weekTodos.length) * 100)
    : 0;
  const savedScore = getWeeklyScore(activePeriod.id, activeWeekNumber);

  const allScores = weeklyScores.filter(s => s.periodId === activePeriod.id);
  const averageScore = allScores.length > 0
    ? Math.round(allScores.reduce((sum, s) => sum + s.executionScore, 0) / allScores.length)
    : 0;

  const handleSaveScore = async () => {
    if (savedScore) {
      await updateWeeklyScore(savedScore.id, { executionScore, notes });
    } else {
      await saveWeeklyScore({
        weekNumber: activeWeekNumber,
        weekStartDate: format(weekStart, 'yyyy-MM-dd'),
        weekEndDate: format(weekEnd, 'yyyy-MM-dd'),
        executionScore,
        notes,
        periodId: activePeriod.id,
      });
    }
    setEditingWeek(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 65) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreMessage = (score: number) => {
    if (language === 'zh') {
      if (score >= 85) return '执行很出色。';
      if (score >= 65) return '进展不错，继续保持聚焦。';
      if (score >= 50) return '执行参差，收紧计划。';
      return '执行偏低，减少范围后重新承诺。';
    }
    if (score >= 85) return 'Outstanding execution.';
    if (score >= 65) return 'Good progress. Keep the week focused.';
    if (score >= 50) return 'Mixed execution. Tighten the plan.';
    return 'Low execution. Reduce scope and recommit.';
  };

  const startEditing = () => {
    setEditingWeek(activeWeekNumber);
    setNotes(savedScore?.notes || '');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-2xl font-bold text-gray-900 sm:mb-2 sm:text-3xl">{copy.title}</h2>
        <p className="hidden text-gray-600 sm:block">{copy.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{copy.currentWeek}</CardDescription>
            <CardTitle className="text-3xl">{copy.week} {activeWeekNumber}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{copy.of} {totalWeeks}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{copy.averageScore}</CardDescription>
            <CardTitle className={`text-3xl ${getScoreColor(averageScore)}`}>{averageScore}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{allScores.length} {copy.weeksTracked}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{copy.thisWeek}</CardDescription>
            <CardTitle className={`text-3xl ${getScoreColor(executionScore)}`}>{executionScore}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{completedWeekTodos} / {weekTodos.length} {copy.tasks}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>
                {copy.week} {activeWeekNumber}: {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </CardTitle>
              <CardDescription className="mt-1">{getScoreMessage(executionScore)}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label={copy.previousWeek}
                title={copy.previousWeek}
                onClick={() => setCurrentWeekNumber(Math.max(1, activeWeekNumber - 1))}
                disabled={activeWeekNumber === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label={copy.nextWeek}
                title={copy.nextWeek}
                onClick={() => setCurrentWeekNumber(Math.min(totalWeeks, activeWeekNumber + 1))}
                disabled={activeWeekNumber === totalWeeks}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-gray-900">{copy.executionScore}</span>
              <span className={`text-2xl font-bold ${getScoreColor(executionScore)}`}>{executionScore}%</span>
            </div>
            <Progress value={executionScore} className="h-3" />
            <p className="mt-2 text-sm text-gray-600">
              {copy.completedOutOf(completedWeekTodos, weekTodos.length)}
            </p>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">{copy.reflection}</h4>
              {editingWeek !== activeWeekNumber ? (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  {savedScore?.notes ? copy.editNotes : copy.addNotes}
                </Button>
              ) : (
                <Button size="sm" onClick={handleSaveScore}>
                  <Check className="mr-2 h-4 w-4" />
                  {copy.save}
                </Button>
              )}
            </div>

            {editingWeek === activeWeekNumber ? (
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={copy.placeholder}
                rows={5}
                className="w-full"
              />
            ) : (
              <div className="min-h-24 rounded-lg border border-gray-200 bg-gray-50 p-4">
                {savedScore?.notes ? (
                  <p className="whitespace-pre-wrap text-gray-700">{savedScore.notes}</p>
                ) : (
                  <p className="italic text-gray-400">{copy.noNotes}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-3 font-semibold text-gray-900">{copy.taskBreakdown}</h4>
            {weekTodos.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 py-8 text-center">
                <AlertCircle className="mx-auto mb-2 h-10 w-10 text-gray-400" />
                <p className="text-gray-600">{copy.noTasks}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {weekTodos.map(todo => {
                  const period = periods.find(p => p.goals.some(g => g.id === todo.goalId));
                  const goal = period?.goals.find(g => g.id === todo.goalId);
                  const tactic = goal?.tactics.find(t => t.id === todo.tacticId);

                  return (
                    <div
                      key={todo.id}
                      className={`rounded-lg border p-3 ${todo.completed ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {todo.completed ? (
                            <Check className="h-5 w-5 text-green-600" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium ${todo.completed ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                            {todo.title}
                          </div>
                          {goal && (
                            <div className="mt-1 text-xs text-gray-600">
                              {copy.goal}: {goal.title}
                              {tactic && ` -> ${tactic.title}`}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-600">
                          {todo.date ? format(dateFromISO(todo.date), 'MMM d') : copy.unscheduled}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {copy.overview}
          </CardTitle>
          <CardDescription>{copy.overviewDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(weekNum => {
              const score = getWeeklyScore(activePeriod.id, weekNum);
              const { weekStart: wStart } = getWeekDates(weekNum);
              const isPast = wStart < new Date();
              const isCurrent = weekNum === activeWeekNumber;

              return (
                <button
                  key={weekNum}
                  onClick={() => setCurrentWeekNumber(weekNum)}
                  className={`rounded-lg border-2 p-3 transition-all ${
                    isCurrent ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="mb-1 text-xs text-gray-600">{copy.week} {weekNum}</div>
                  {score ? (
                    <div className={`text-xl font-bold ${getScoreColor(score.executionScore)}`}>{score.executionScore}%</div>
                  ) : isPast ? (
                    <div className="text-xl font-bold text-gray-400">-</div>
                  ) : (
                    <div className="text-xs text-gray-400">{copy.upcoming}</div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
