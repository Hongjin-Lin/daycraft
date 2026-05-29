import { useStore } from '../lib/store';
import { useNavigate } from 'react-router';
import { Calendar, Target, CheckCircle2, TrendingUp } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ProgressTracker } from './ProgressTracker';

export function Dashboard() {
  const navigate = useNavigate();
  const { periods, activePeriodId, todos, createPeriod } = useStore();
  
  const activePeriod = periods.find(p => p.id === activePeriodId);
  
  const handleCreatePeriod = () => {
    const today = new Date();
    createPeriod(today);
  };
  
  if (!activePeriod) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <Target className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Start Your 12 Week Year
          </h2>
          <p className="text-gray-600 mb-6">
            The 12 Week Year system helps you achieve more by focusing on 12-week goals
            instead of annual planning. Create your first period to get started.
          </p>
          <button
            onClick={handleCreatePeriod}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Create Your First 12 Week Period
          </button>
        </div>
      </div>
    );
  }
  
  const daysRemaining = differenceInDays(activePeriod.endDate, new Date());
  const totalGoals = activePeriod.goals.length;
  const averageProgress = totalGoals > 0
    ? Math.round(activePeriod.goals.reduce((sum, g) => sum + g.progress, 0) / totalGoals)
    : 0;
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayTodos = todos.filter(t => t.date === todayStr);
  const completedTodayTodos = todayTodos.filter(t => t.completed).length;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
        <p className="text-gray-600">
          {format(activePeriod.startDate, 'MMM d, yyyy')} - {format(activePeriod.endDate, 'MMM d, yyyy')}
        </p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Days Remaining</span>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{daysRemaining}</div>
          <div className="text-sm text-gray-500 mt-1">out of 84 days</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Total Goals</span>
            <Target className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalGoals}</div>
          <div className="text-sm text-gray-500 mt-1">
            <button
              onClick={() => navigate('/goals')}
              className="text-blue-600 hover:text-blue-700"
            >
              Manage goals →
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Average Progress</span>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{averageProgress}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${averageProgress}%` }}
            />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Today's Tasks</span>
            <CheckCircle2 className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {completedTodayTodos}/{todayTodos.length}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            <button
              onClick={() => navigate('/calendar')}
              className="text-blue-600 hover:text-blue-700"
            >
              View calendar →
            </button>
          </div>
        </div>
      </div>
      
      {/* Goals Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Goals Overview</h3>
            <button
              onClick={() => navigate('/goals')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View all →
            </button>
          </div>
          
          {activePeriod.goals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No goals yet for this period</p>
              <button
                onClick={() => navigate('/goals')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Add Your First Goal
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activePeriod.goals.map((goal) => (
                <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{goal.title}</h4>
                      <p className="text-sm text-gray-600">{goal.description}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-gray-900">{goal.progress}%</div>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    {goal.tactics.filter(t => t.completed).length} / {goal.tactics.length} tactics completed
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <ProgressTracker />
      </div>
    </div>
  );
}