import { Link, Outlet, useLocation } from 'react-router';
import {
  BarChart3,
  Bot,
  Calendar as CalendarIcon,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Target,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { daysInPeriod, weeksInPeriod } from '../lib/period-utils';
import { CURRENT_APP_VERSION } from '../lib/app-version';
import { fetchLatestVersionInfo, shouldShowUpdate } from '../lib/update-check';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { to: '/scorecard', label: 'Scorecard', icon: ClipboardCheck },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/agents', label: 'Agents', icon: Bot },
];

export function Layout() {
  const location = useLocation();
  const { periods, activePeriodId } = useStore();
  const activePeriod = periods.find(p => p.id === activePeriodId);

  const handleCheckUpdate = async () => {
    try {
      const remoteInfo = await fetchLatestVersionInfo();
      if (shouldShowUpdate(CURRENT_APP_VERSION, remoteInfo) && remoteInfo?.apkUrl) {
        window.open(remoteInfo.apkUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      window.alert(`DayCraft is up to date. Current version: ${CURRENT_APP_VERSION}`);
    } catch {
      window.alert('Could not check for updates. Please check your connection and try again.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-gray-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-gray-200 px-5 py-5">
          <div className="text-xl font-semibold tracking-tight">
            <span className="text-blue-600">Day</span>Craft
          </div>
          <p className="mt-1 text-xs text-gray-500">Planning OS</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(item => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          {activePeriod && (
            <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">
              <div className="font-semibold text-gray-900">Active period</div>
              <div className="mt-1">{weeksInPeriod(activePeriod.startDate, activePeriod.endDate)} weeks</div>
              <div>{daysInPeriod(activePeriod.startDate, activePeriod.endDate)} days total</div>
            </div>
          )}
          <button
            onClick={handleCheckUpdate}
            className="mt-3 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950"
          >
            <RefreshCw className="h-4 w-4" />
            Check updates
          </button>
          <button
            onClick={handleSignOut}
            className="mt-3 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 px-3 py-3 backdrop-blur lg:hidden">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">
            <span className="text-blue-600">Day</span>Craft
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleCheckUpdate} className="rounded-md p-2 text-gray-500 hover:bg-gray-100" aria-label="Check updates">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={handleSignOut} className="rounded-md p-2 text-gray-500 hover:bg-gray-100" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto">
          {navItems.map(item => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${
                  active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="px-3 py-4 sm:px-6 lg:ml-64 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
