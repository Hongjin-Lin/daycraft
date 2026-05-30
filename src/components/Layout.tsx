import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { LayoutDashboard, Target, Calendar as CalendarIcon, ClipboardCheck, BarChart3, LogOut, Menu, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Layout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/goals', label: 'Goals', icon: Target },
    { to: '/calendar', label: 'Calendar', icon: CalendarIcon },
    { to: '/scorecard', label: 'Scorecard', icon: ClipboardCheck },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <h1 className="font-bold text-lg sm:text-xl text-gray-900">
                <span className="text-blue-600">Day</span>Craft
              </h1>
              <span className="text-gray-300 hidden lg:inline">/</span>
              <span className="text-gray-500 text-sm hidden lg:inline">12 Week Year</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
                    isActive(item.to)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}

              <button
                onClick={handleSignOut}
                className="flex items-center px-2 py-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-1"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {menuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 z-50 border-t border-gray-100 bg-white shadow-lg">
            <div className="px-4 py-2 space-y-1">
              {navItems.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.to)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
              <button
                onClick={() => { handleSignOut(); setMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors w-full"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
