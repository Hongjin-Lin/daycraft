import { useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { CalendarDays, RotateCcw, Trash2, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { WeekPeriod } from '../lib/types';
import { dateFromISO, daysInPeriod, endDateForWeeks, formatISODate, weeksInPeriod } from '../lib/period-utils';
import { Button } from './ui/button';
import { useLanguage } from '../lib/i18n';

interface PeriodSettingsProps {
  period: WeekPeriod;
  triggerClassName?: string;
}

const presets = [
  { weeks: 6 },
  { weeks: 12 },
  { weeks: 16 },
];

export function PeriodSettings({ period, triggerClassName }: PeriodSettingsProps) {
  const { language } = useLanguage();
  const periods = useStore(s => s.periods);
  const updatePeriod = useStore(s => s.updatePeriod);
  const createPeriod = useStore(s => s.createPeriod);
  const activatePeriod = useStore(s => s.activatePeriod);
  const deletePeriod = useStore(s => s.deletePeriod);
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(formatISODate(period.startDate));
  const [endDate, setEndDate] = useState(formatISODate(period.endDate));
  const [saving, setSaving] = useState(false);
  const [busyPeriodId, setBusyPeriodId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const copy = language === 'zh'
    ? {
        trigger: '周期设置',
        close: '关闭周期设置',
        title: '周期',
        description: '设置任意规划范围，不限 12 周。',
        startDate: '开始日期',
        endDate: '结束日期',
        length: '长度',
        weeks: '周',
        days: '天',
        history: '周期历史',
        historyDescription: '切换旧周期，或删除不再需要的周期。',
        noPeriods: '暂无保存的周期。',
        active: '当前',
        goals: '目标',
        activate: '启用周期',
        delete: '删除周期',
        savePeriod: '保存周期',
        saving: '保存中...',
        createNew: '新建',
        cancel: '取消',
        invalidRange: '结束日期必须等于或晚于开始日期。',
        saveError: '无法保存周期。',
        createError: '无法创建周期。',
        activateError: '无法启用周期。',
        deleteError: '无法删除周期。',
        deleteConfirm: (label: string) => `删除周期 ${label}？这也会删除它的目标、策略、周复盘和关联任务。`,
      }
    : {
        trigger: 'Period settings',
        close: 'Close period settings',
        title: 'Period',
        description: 'Set any planning range, not just 12 weeks.',
        startDate: 'Start date',
        endDate: 'End date',
        length: 'Length',
        weeks: 'weeks',
        days: 'days',
        history: 'Period history',
        historyDescription: 'Switch back to an older period or delete periods you no longer need.',
        noPeriods: 'No saved periods.',
        active: 'Active',
        goals: 'goals',
        activate: 'Activate period',
        delete: 'Delete period',
        savePeriod: 'Save period',
        saving: 'Saving...',
        createNew: 'Create new',
        cancel: 'Cancel',
        invalidRange: 'End date must be on or after the start date.',
        saveError: 'Could not save period.',
        createError: 'Could not create period.',
        activateError: 'Could not activate period.',
        deleteError: 'Could not delete period.',
        deleteConfirm: (label: string) => `Delete period ${label}? This also deletes its goals, tactics, weekly scores, and linked tasks.`,
      };

  const sortedPeriods = useMemo(
    () => [...periods].sort((a, b) => b.startDate.getTime() - a.startDate.getTime()),
    [periods]
  );

  const preview = useMemo(() => {
    const start = dateFromISO(startDate);
    const end = dateFromISO(endDate);
    return {
      days: daysInPeriod(start, end),
      weeks: weeksInPeriod(start, end),
      invalid: end < start,
    };
  }, [startDate, endDate]);

  const openEditor = () => {
    setStartDate(formatISODate(period.startDate));
    setEndDate(formatISODate(period.endDate));
    setError('');
    setOpen(true);
  };

  const applyPreset = (weeks: number) => {
    const start = dateFromISO(startDate);
    setEndDate(formatISODate(endDateForWeeks(start, weeks)));
  };

  const save = async () => {
    if (preview.invalid) {
      setError(copy.invalidRange);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await updatePeriod(period.id, {
        startDate: dateFromISO(startDate),
        endDate: dateFromISO(endDate),
      });
      setOpen(false);
    } catch (err: any) {
      setError(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const createNew = async () => {
    if (preview.invalid) {
      setError(copy.invalidRange);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await createPeriod(dateFromISO(startDate), dateFromISO(endDate));
      setOpen(false);
    } catch (err: any) {
      setError(err.message || copy.createError);
    } finally {
      setSaving(false);
    }
  };

  const activate = async (periodId: string) => {
    setBusyPeriodId(periodId);
    setError('');
    try {
      await activatePeriod(periodId);
    } catch (err: any) {
      setError(err.message || copy.activateError);
    } finally {
      setBusyPeriodId(null);
    }
  };

  const remove = async (target: WeekPeriod) => {
    const label = `${format(target.startDate, 'MMM d, yyyy')} - ${format(target.endDate, 'MMM d, yyyy')}`;
    if (!window.confirm(copy.deleteConfirm(label))) {
      return;
    }

    setBusyPeriodId(target.id);
    setError('');
    try {
      await deletePeriod(target.id);
      if (target.id === period.id) setOpen(false);
    } catch (err: any) {
      setError(err.message || copy.deleteError);
    } finally {
      setBusyPeriodId(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        className={triggerClassName || 'inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-blue-200 hover:text-blue-700'}
      >
        <CalendarDays className="h-4 w-4" />
        {copy.trigger}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label={copy.close}
            className="absolute inset-0 bg-gray-950/20"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-950">{copy.title}</h2>
                <p className="text-sm text-gray-500">{copy.description}</p>
              </div>
              <button
                type="button"
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  <span>{copy.startDate}</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => {
                      const nextStart = e.target.value;
                      setStartDate(nextStart);
                      if (dateFromISO(endDate) < dateFromISO(nextStart)) {
                        setEndDate(formatISODate(addDays(dateFromISO(nextStart), preview.days - 1)));
                      }
                    }}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-gray-700">
                  <span>{copy.endDate}</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-gray-700">{copy.length}</div>
                <div className="grid grid-cols-3 gap-2">
                  {presets.map(preset => (
                    <button
                      type="button"
                      key={preset.weeks}
                      onClick={() => applyPreset(preset.weeks)}
                      className="rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {preset.weeks} {copy.weeks}
                    </button>
                  ))}
                </div>
                <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  {preview.weeks} {copy.weeks}, {preview.days} {copy.days}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-5">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-950">{copy.history}</h3>
                  <p className="mt-1 text-sm text-gray-500">{copy.historyDescription}</p>
                </div>

                {sortedPeriods.length === 0 ? (
                  <div className="rounded-md border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
                    {copy.noPeriods}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedPeriods.map(savedPeriod => {
                      const isBusy = busyPeriodId === savedPeriod.id;
                      return (
                        <div
                          key={savedPeriod.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-3"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-gray-950">
                                {format(savedPeriod.startDate, 'MMM d, yyyy')} - {format(savedPeriod.endDate, 'MMM d, yyyy')}
                              </span>
                              {savedPeriod.active && (
                                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                  {copy.active}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              {weeksInPeriod(savedPeriod.startDate, savedPeriod.endDate)} {copy.weeks}, {savedPeriod.goals.length} {copy.goals}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            {!savedPeriod.active && (
                              <button
                                type="button"
                                className="rounded-md p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={() => activate(savedPeriod.id)}
                                disabled={isBusy}
                                title={copy.activate}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              className="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => remove(savedPeriod)}
                              disabled={isBusy}
                              title={copy.delete}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row">
              <Button className="flex-1" onClick={save} disabled={saving || preview.invalid}>
                {saving ? copy.saving : copy.savePeriod}
              </Button>
              <Button variant="outline" onClick={createNew} disabled={saving || preview.invalid}>
                {copy.createNew}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {copy.cancel}
              </Button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
