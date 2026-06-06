import { Link, Outlet, useLocation } from 'react-router';
import {
  BarChart3,
  Bot,
  Calendar as CalendarIcon,
  Columns,
  ClipboardCheck,
  LayoutDashboard,
  Languages,
  LogOut,
  RefreshCw,
  Target,
  Utensils,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { daysInPeriod, weeksInPeriod } from '../lib/period-utils';
import { CURRENT_APP_VERSION } from '../lib/app-version';
import { fetchLatestVersionInfo, shouldShowUpdate } from '../lib/update-check';
import { useLanguage } from '../lib/i18n';

const navItems = [
  { to: '/', label: { en: 'Dashboard', zh: '总览' }, mobileLabel: { en: 'Home', zh: '总览' }, icon: LayoutDashboard },
  { to: '/goals', label: { en: 'Goals', zh: '目标' }, mobileLabel: { en: 'Goals', zh: '目标' }, icon: Target },
  { to: '/calendar', label: { en: 'Calendar', zh: '日历' }, mobileLabel: { en: 'Cal', zh: '日历' }, icon: CalendarIcon },
  { to: '/kanban', label: { en: 'Kanban', zh: '看板' }, mobileLabel: { en: 'Board', zh: '看板' }, icon: Columns },
  { to: '/nutrition', label: { en: 'Nutrition', zh: '营养' }, mobileLabel: { en: 'Food', zh: '营养' }, icon: Utensils },
  { to: '/scorecard', label: { en: 'Scorecard', zh: '复盘' }, mobileLabel: { en: 'Score', zh: '复盘' }, icon: ClipboardCheck },
  { to: '/analytics', label: { en: 'Analytics', zh: '分析' }, mobileLabel: { en: 'Stats', zh: '分析' }, icon: BarChart3 },
  { to: '/agents', label: { en: 'Agents', zh: '助手' }, mobileLabel: { en: 'AI', zh: '助手' }, icon: Bot },
];

export function Layout() {
  const location = useLocation();
  const { language } = useLanguage();
  const { periods, activePeriodId } = useStore();
  const activePeriod = periods.find(p => p.id === activePeriodId);
  const copy = language === 'zh'
    ? {
        activePeriod: '当前周期',
        weeks: '周',
        daysTotal: '天总计',
        checkUpdates: '检查更新',
        signOut: '退出',
        tagline: '规划系统',
        upToDate: `DayCraft 已是最新版本。当前版本：${CURRENT_APP_VERSION}`,
        updateError: '无法检查更新，请确认网络后重试。',
      }
    : {
        activePeriod: 'Active period',
        weeks: 'weeks',
        daysTotal: 'days total',
        checkUpdates: 'Check updates',
        signOut: 'Sign Out',
        tagline: 'Planning OS',
        upToDate: `DayCraft is up to date. Current version: ${CURRENT_APP_VERSION}`,
        updateError: 'Could not check for updates. Please check your connection and try again.',
      };
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleCheckUpdate = async () => {
    try {
      const remoteInfo = await fetchLatestVersionInfo();
      if (shouldShowUpdate(CURRENT_APP_VERSION, remoteInfo) && remoteInfo?.apkUrl) {
        window.open(remoteInfo.apkUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      window.alert(copy.upToDate);
    } catch {
      window.alert(copy.updateError);
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
          <p className="mt-1 text-xs text-gray-500">{copy.tagline}</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(item => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label[language]}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          {activePeriod && (
            <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">
              <div className="font-semibold text-gray-900">{copy.activePeriod}</div>
              <div className="mt-1">{weeksInPeriod(activePeriod.startDate, activePeriod.endDate)} {copy.weeks}</div>
              <div>{daysInPeriod(activePeriod.startDate, activePeriod.endDate)} {copy.daysTotal}</div>
            </div>
          )}
          <LanguageToggle />
          <button
            onClick={handleCheckUpdate}
            className="mt-3 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950"
          >
            <RefreshCw className="h-4 w-4" />
            {copy.checkUpdates}
          </button>
          <button
            onClick={handleSignOut}
            className="mt-3 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950"
          >
            <LogOut className="h-4 w-4" />
            {copy.signOut}
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 px-3 py-3 backdrop-blur lg:hidden">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">
            <span className="text-blue-600">Day</span>Craft
          </div>
          <div className="flex items-center gap-1">
            <LanguageToggle compact />
            <button onClick={handleCheckUpdate} className="rounded-md p-2 text-gray-500 hover:bg-gray-100" aria-label={copy.checkUpdates}>
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={handleSignOut} className="rounded-md p-2 text-gray-500 hover:bg-gray-100" aria-label={copy.signOut}>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-1">
          {navItems.map(item => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium ${
                  active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.mobileLabel[language]}
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

function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();
  const ariaLabel = language === 'zh' ? '语言设置' : 'Language setting';

  return (
    <div
      className={`${compact ? 'mr-1' : 'mt-3'} inline-flex items-center rounded-md border border-gray-200 bg-white p-0.5`}
      aria-label={ariaLabel}
      role="group"
    >
      <Languages className={`${compact ? 'ml-1.5 h-3.5 w-3.5' : 'ml-2 h-4 w-4'} text-gray-500`} />
      {(['en', 'zh'] as const).map(option => (
        <button
          key={option}
          type="button"
          onClick={() => setLanguage(option)}
          className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
            language === option
              ? 'bg-blue-600 text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          }`}
          aria-pressed={language === option}
        >
          {option === 'en' ? 'EN' : '中'}
        </button>
      ))}
    </div>
  );
}
