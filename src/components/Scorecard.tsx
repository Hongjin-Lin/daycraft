import { useState } from 'react';
import { useStore } from '../lib/store';
import { format, startOfWeek, endOfWeek, addDays, differenceInWeeks, isWithinInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Edit2, Check, Trophy, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';

export function Scorecard() {
  const { periods, activePeriodId, todos, weeklyScores, saveWeeklyScore, updateWeeklyScore, getWeeklyScore } = useStore();
  const activePeriod = periods.find(p => p.id === activePeriodId);
  
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number>(() => {
    if (!activePeriod) return 1;
    const weeksPassed = Math.floor(differenceInWeeks(new Date(), activePeriod.startDate));
    return Math.min(Math.max(weeksPassed + 1, 1), 12);
  });
  
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  
  if (!activePeriod) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Please create a 12 week period first from the dashboard.</p>
      </div>
    );
  }
  
  // Calculate week dates
  const getWeekDates = (weekNum: number) => {
    const weekStart = addDays(activePeriod.startDate, (weekNum - 1) * 7);
    const weekEnd = addDays(weekStart, 6);
    return { weekStart, weekEnd };
  };
  
  const { weekStart, weekEnd } = getWeekDates(currentWeekNumber);
  
  // Get todos for current week
  const weekTodos = todos.filter(t => {
    const todoDate = new Date(t.date);
    return isWithinInterval(todoDate, { start: weekStart, end: weekEnd });
  });
  
  const completedWeekTodos = weekTodos.filter(t => t.completed).length;
  const executionScore = weekTodos.length > 0 
    ? Math.round((completedWeekTodos / weekTodos.length) * 100)
    : 0;
  
  // Get saved weekly score
  const savedScore = getWeeklyScore(activePeriod.id, currentWeekNumber);
  
  const handleSaveScore = () => {
    if (savedScore) {
      updateWeeklyScore(savedScore.id, {
        executionScore,
        notes,
      });
    } else {
      saveWeeklyScore({
        weekNumber: currentWeekNumber,
        weekStartDate: format(weekStart, 'yyyy-MM-dd'),
        weekEndDate: format(weekEnd, 'yyyy-MM-dd'),
        executionScore,
        notes,
        periodId: activePeriod.id,
      });
    }
    setEditingWeek(null);
  };
  
  const startEditing = () => {
    setEditingWeek(currentWeekNumber);
    setNotes(savedScore?.notes || '');
  };
  
  // Calculate overall period stats
  const allScores = weeklyScores.filter(s => s.periodId === activePeriod.id);
  const averageScore = allScores.length > 0
    ? Math.round(allScores.reduce((sum, s) => sum + s.executionScore, 0) / allScores.length)
    : 0;
  
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 65) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getScoreMessage = (score: number) => {
    if (score >= 85) return 'Outstanding! Keep up the excellent work!';
    if (score >= 65) return 'Good progress! Stay focused.';
    if (score >= 50) return 'Room for improvement. You can do better!';
    return 'Critical! Refocus and recommit to your goals.';
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Weekly Scorecard</h2>
        <p className="text-gray-600">Track your weekly execution and maintain accountability</p>
      </div>
      
      {/* Period Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Current Week</CardDescription>
            <CardTitle className="text-3xl">Week {currentWeekNumber}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">of 12</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Average Score</CardDescription>
            <CardTitle className={`text-3xl ${getScoreColor(averageScore)}`}>
              {averageScore}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{allScores.length} weeks tracked</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>This Week</CardDescription>
            <CardTitle className={`text-3xl ${getScoreColor(executionScore)}`}>
              {executionScore}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              {completedWeekTodos} / {weekTodos.length} tasks
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Week {currentWeekNumber}: {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </CardTitle>
              <CardDescription className="mt-1">
                {getScoreMessage(executionScore)}
              </CardDescription>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeekNumber(Math.max(1, currentWeekNumber - 1))}
                disabled={currentWeekNumber === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeekNumber(Math.min(12, currentWeekNumber + 1))}
                disabled={currentWeekNumber === 12}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Execution Score */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900">Execution Score</span>
              <span className={`text-2xl font-bold ${getScoreColor(executionScore)}`}>
                {executionScore}%
              </span>
            </div>
            <Progress value={executionScore} className="h-3" />
            <p className="text-sm text-gray-600 mt-2">
              Completed {completedWeekTodos} out of {weekTodos.length} planned tasks this week
            </p>
          </div>
          
          {/* Weekly Notes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Weekly Reflection</h4>
              {editingWeek !== currentWeekNumber ? (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  {savedScore?.notes ? 'Edit Notes' : 'Add Notes'}
                </Button>
              ) : (
                <Button size="sm" onClick={handleSaveScore}>
                  <Check className="w-4 h-4 mr-2" />
                  Save
                </Button>
              )}
            </div>
            
            {editingWeek === currentWeekNumber ? (
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What went well this week? What could be improved? Any insights or lessons learned?"
                rows={6}
                className="w-full"
              />
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-32">
                {savedScore?.notes ? (
                  <p className="text-gray-700 whitespace-pre-wrap">{savedScore.notes}</p>
                ) : (
                  <p className="text-gray-400 italic">No reflection notes yet. Click "Add Notes" to record your thoughts.</p>
                )}
              </div>
            )}
          </div>
          
          {/* Task Breakdown */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Task Breakdown</h4>
            {weekTodos.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No tasks planned for this week</p>
              </div>
            ) : (
              <div className="space-y-2">
                {weekTodos.map((todo) => {
                  const { periods } = useStore.getState();
                  const period = periods.find(p => p.goals.some(g => g.id === todo.goalId));
                  const goal = period?.goals.find(g => g.id === todo.goalId);
                  const tactic = goal?.tactics.find(t => t.id === todo.tacticId);
                  
                  return (
                    <div
                      key={todo.id}
                      className={`p-3 rounded-lg border ${
                        todo.completed
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {todo.completed ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium ${todo.completed ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                            {todo.title}
                          </div>
                          {goal && (
                            <div className="text-xs text-gray-600 mt-1">
                              🎯 {goal.title}
                              {tactic && ` → ${tactic.title}`}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-600">
                          {format(new Date(todo.date), 'MMM d')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Tactics Due This Week */}
          {activePeriod.goals.length > 0 && (() => {
            const dueTactics = activePeriod.goals.flatMap(goal =>
              goal.tactics
                .filter(t => t.dueWeek === currentWeekNumber)
                .map(t => ({ ...t, goal }))
            );
            
            if (dueTactics.length === 0) return null;
            
            return (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Tactics Due This Week</h4>
                <div className="space-y-2">
                  {dueTactics.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border ${
                        item.completed
                          ? 'bg-green-50 border-green-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {item.completed ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium ${item.completed ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                            {item.title}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            🎯 {item.goal.title}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
      
      {/* 12 Week Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            12 Week Overview
          </CardTitle>
          <CardDescription>Your execution score across all weeks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((weekNum) => {
              const score = getWeeklyScore(activePeriod.id, weekNum);
              const { weekStart: wStart } = getWeekDates(weekNum);
              const isPast = wStart < new Date();
              const isCurrent = weekNum === currentWeekNumber;
              
              return (
                <button
                  key={weekNum}
                  onClick={() => setCurrentWeekNumber(weekNum)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isCurrent
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-xs text-gray-600 mb-1">Week {weekNum}</div>
                  {score ? (
                    <div className={`text-xl font-bold ${getScoreColor(score.executionScore)}`}>
                      {score.executionScore}%
                    </div>
                  ) : isPast ? (
                    <div className="text-xl font-bold text-gray-400">—</div>
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