import { Outlet, Link, useLocation } from 'react-router';
import { LayoutDashboard, Target, Calendar as CalendarIcon, ClipboardCheck, BarChart3, Home } from 'lucide-react';

export function Layout() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">DayCraft</span>
              </Link>
              <span className="text-gray-300">/</span>
              <h1 className="font-bold text-xl text-gray-900">12 Week Year</h1>
            </div>

            <div className="flex space-x-1">
              <Link
                to="/12weekyear"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive('/12weekyear')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </Link>

              <Link
                to="/12weekyear/goals"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive('/12weekyear/goals')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Target className="w-5 h-5" />
                <span className="font-medium">Goals</span>
              </Link>

              <Link
                to="/12weekyear/calendar"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive('/12weekyear/calendar')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <CalendarIcon className="w-5 h-5" />
                <span className="font-medium">Calendar</span>
              </Link>

              <Link
                to="/12weekyear/scorecard"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive('/12weekyear/scorecard')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ClipboardCheck className="w-5 h-5" />
                <span className="font-medium">Scorecard</span>
              </Link>

              <Link
                to="/12weekyear/analytics"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive('/12weekyear/analytics')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="font-medium">Analytics</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
