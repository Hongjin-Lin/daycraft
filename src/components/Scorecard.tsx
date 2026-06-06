import { useState } from 'react';
import { addDays, format, isWithinInterval } from 'date-fns';
import { AlertCircle, Check, ChevronLeft, ChevronRight, Edit2, Trophy } from 'lucide-react';
import { useStore } from '../lib/store';
import { dateFromISO, getCurrentWeekNumber, weeksInPeriod } from '../lib/period-utils';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';

export function Scorecard() {
  const { periods, activePeriodId, todos, weeklyScores, saveWeeklyScore, updateWeeklyScore, getWeeklyScore } = useStore();
  const activePeriod = periods.find(p => p.id === activePeriodId);

  const [currentWeekNumber, setCurrentWeekNumber] = useState<number>(() => {
    if (!activePeriod) return 1;
    return getCurrentWeekNumber(activePeriod.startDate, activePeriod.endDate);
  });
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  if (!activePeriod) {
    return (
      <div className="py-12 text-center">
        <Trophy className="mx-auto mb-4 h-16 w-16 text-gray-400" />
        <p className="text-gray-600">Please create a planning period first from the dashboard.</p>
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
        <h2 className="mb-2 text-3xl font-bold text-gray-900">Scorecard</h2>
        <p className="text-gray-600">Track weekly execution for the active planning period.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Current Week</CardDescription>
            <CardTitle className="text-3xl">Week {activeWeekNumber}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">of {totalWeeks}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Average Score</CardDescription>
            <CardTitle className={`text-3xl ${getScoreColor(averageScore)}`}>{averageScore}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{allScores.length} weeks tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>This Week</CardDescription>
            <CardTitle className={`text-3xl ${getScoreColor(executionScore)}`}>{executionScore}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{completedWeekTodos} / {weekTodos.length} tasks</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>
                Week {activeWeekNumber}: {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </CardTitle>
              <CardDescription className="mt-1">{getScoreMessage(executionScore)}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous week"
                title="Previous week"
                onClick={() => setCurrentWeekNumber(Math.max(1, activeWeekNumber - 1))}
                disabled={activeWeekNumber === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next week"
                title="Next week"
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
              <span className="font-semibold text-gray-900">Execution Score</span>
              <span className={`text-2xl font-bold ${getScoreColor(executionScore)}`}>{executionScore}%</span>
            </div>
            <Progress value={executionScore} className="h-3" />
            <p className="mt-2 text-sm text-gray-600">
              Completed {completedWeekTodos} out of {weekTodos.length} planned tasks this week
            </p>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Weekly Reflection</h4>
              {editingWeek !== activeWeekNumber ? (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  {savedScore?.notes ? 'Edit Notes' : 'Add Notes'}
                </Button>
              ) : (
                <Button size="sm" onClick={handleSaveScore}>
                  <Check className="mr-2 h-4 w-4" />
                  Save
                </Button>
              )}
            </div>

            {editingWeek === activeWeekNumber ? (
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="What worked? What needs to change next week?"
                rows={5}
                className="w-full"
              />
            ) : (
              <div className="min-h-24 rounded-lg border border-gray-200 bg-gray-50 p-4">
                {savedScore?.notes ? (
                  <p className="whitespace-pre-wrap text-gray-700">{savedScore.notes}</p>
                ) : (
                  <p className="italic text-gray-400">No reflection notes yet.</p>
                )}
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-3 font-semibold text-gray-900">Task Breakdown</h4>
            {weekTodos.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 py-8 text-center">
                <AlertCircle className="mx-auto mb-2 h-10 w-10 text-gray-400" />
                <p className="text-gray-600">No tasks planned for this week</p>
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
                              Goal: {goal.title}
                              {tactic && ` -> ${tactic.title}`}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-600">
                          {todo.date ? format(dateFromISO(todo.date), 'MMM d') : 'Unscheduled'}
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
            Period Overview
          </CardTitle>
          <CardDescription>Your execution score across all weeks in this period</CardDescription>
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
                  <div className="mb-1 text-xs text-gray-600">Week {weekNum}</div>
                  {score ? (
                    <div className={`text-xl font-bold ${getScoreColor(score.executionScore)}`}>{score.executionScore}%</div>
                  ) : isPast ? (
                    <div className="text-xl font-bold text-gray-400">-</div>
                  ) : (
                    <div className="text-xs text-gray-400">Upcoming</div>
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
