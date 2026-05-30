import { Outlet, Link, useLocation } from 'react-router';
import { LayoutDashboard, Target, Calendar as CalendarIcon, ClipboardCheck, BarChart3, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Layout() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="font-bold text-xl text-gray-900">
                <span className="text-blue-600">Day</span>Craft
              </h1>
              <span className="text-gray-300">/</span>
              <span className="text-gray-500 text-sm">12 Week Year</span>
            </div>

            <div className="flex items-center space-x-1">
              <Link
                to="/"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive('/')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </Link>

              <Link
                to="/goals"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive('/goals')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Target className="w-5 h-5" />
                <span className="font-medium">Goals</span>
              </Link>

              <Link
                to="/calendar"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive('/calendar')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <CalendarIcon className="w-5 h-5" />
                <span className="font-medium">Calendar</span>
              </Link>

              <Link
                to="/scorecard"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive('/scorecard')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ClipboardCheck className="w-5 h-5" />
                <span className="font-medium">Scorecard</span>
              </Link>

              <Link
                to="/analytics"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive('/analytics')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="font-medium">Analytics</span>
              </Link>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-2"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
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
