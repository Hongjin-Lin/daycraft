import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Flame,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Search,
  Target,
  Trash2,
  Utensils,
} from 'lucide-react';
import { useStore } from '../lib/store';
import {
  calculateNutritionSummary,
  defaultNutritionTargets,
  getReusableFoodItems,
  mealLabels,
  type MealType,
  type NutritionEntry,
  type NutritionEntryInput,
  type ReusableFoodItem,
  type NutritionSyncStatus,
  type NutritionTargets,
} from '../lib/nutrition';
import { useLanguage, type Language } from '../lib/i18n';

const bridgeUrl = 'http://localhost:8787';
const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const emptyForm = () => ({
  meal: 'breakfast' as MealType,
  time: format(new Date(), 'HH:mm'),
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  emoji: '',
  imageUrl: '',
  notes: '',
});

type EntryForm = ReturnType<typeof emptyForm>;

export function Nutrition() {
  const { language } = useLanguage();
  const {
    nutritionEntries,
    nutritionTargets,
    addNutritionEntry,
    importNutritionEntries,
    deleteNutritionEntry,
    setNutritionTargets,
  } = useStore();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entryForm, setEntryForm] = useState<EntryForm>(() => emptyForm());
  const [targetDraft, setTargetDraft] = useState<NutritionTargets>(nutritionTargets || defaultNutritionTargets);
  const [bridgeStatus, setBridgeStatus] = useState<NutritionSyncStatus>('checking');
  const [historyQuery, setHistoryQuery] = useState('');
  const copy = language === 'zh'
    ? {
        title: '健康与营养',
        description: '记录每天的营养目标，支撑 12 周健康计划。',
        previousDay: '前一天',
        nextDay: '后一天',
        calories: '热量',
        protein: '蛋白质',
        carbs: '碳水',
        fat: '脂肪',
        saveTargets: '保存目标',
        addFood: '添加食物',
        meal: '餐次',
        time: '时间',
        food: '食物',
        foodPlaceholder: '希腊酸奶碗',
        emoji: 'Emoji',
        imageUrl: '图片链接',
        imagePlaceholder: 'https://...',
        notes: '备注',
        recentFoods: '最近食物',
        shown: '条',
        searchHistory: '搜索历史',
        searchPlaceholder: '食物、蛋白质、42g...',
        reusableEmpty: '你记录的食物会出现在这里，方便复用。',
        reusableNoMatch: '没有匹配的历史食物。',
        noFoodTitle: '今天还没记录',
        noFoodDescription: '先手动添加下一餐；AI 同步可用时会自动显示同步记录。',
        use: '使用',
        logAgain: '再记一次',
        used: '使用',
        last: '最近',
        of: '目标',
        left: '剩余',
        over: '超出',
        delete: '删除',
        manual: '手动',
        ai: 'AI',
      }
    : {
        title: 'Health & Nutrition',
        description: 'Track daily nutrition targets that support your 12-week health goals.',
        previousDay: 'Previous day',
        nextDay: 'Next day',
        calories: 'Calories',
        protein: 'Protein',
        carbs: 'Carbs',
        fat: 'Fat',
        saveTargets: 'Save Daily Targets',
        addFood: 'Add Food',
        meal: 'Meal',
        time: 'Time',
        food: 'Food',
        foodPlaceholder: 'Greek yogurt bowl',
        emoji: 'Emoji',
        imageUrl: 'Image URL',
        imagePlaceholder: 'https://...',
        notes: 'Notes',
        recentFoods: 'Recent Foods',
        shown: 'shown',
        searchHistory: 'Search history',
        searchPlaceholder: 'food, protein, 42g...',
        reusableEmpty: 'Foods you log will appear here for quick reuse.',
        reusableNoMatch: 'No previous foods match this search.',
        noFoodTitle: 'No food logged',
        noFoodDescription: 'Add your next meal manually. Synced entries will appear here when AI sync is available.',
        use: 'Use',
        logAgain: 'Log again',
        used: 'Used',
        last: 'Last',
        of: 'of',
        left: 'left',
        over: 'over',
        delete: 'Delete',
        manual: 'Manual',
        ai: 'AI',
      };
  const mealCopy: Record<MealType, string> = language === 'zh'
    ? {
        breakfast: '早餐',
        lunch: '午餐',
        dinner: '晚餐',
        snack: '加餐',
      }
    : mealLabels;

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  const dayEntries = useMemo(
    () =>
      nutritionEntries
        .filter((entry) => entry.date === selectedDateStr)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [nutritionEntries, selectedDateStr]
  );

  const summary = useMemo(
    () => calculateNutritionSummary(dayEntries, nutritionTargets || defaultNutritionTargets),
    [dayEntries, nutritionTargets]
  );

  const reusableFoods = useMemo(
    () => getReusableFoodItems(nutritionEntries, historyQuery).slice(0, 8),
    [historyQuery, nutritionEntries]
  );

  useEffect(() => {
    setTargetDraft(nutritionTargets || defaultNutritionTargets);
  }, [nutritionTargets]);

  const refreshBridge = useCallback(async () => {
    try {
      const response = await fetch(`${bridgeUrl}/nutrition?date=${selectedDateStr}`);
      if (!response.ok) throw new Error('Bridge unavailable');

      const payload = await response.json();
      if (Array.isArray(payload.entries)) {
        await importNutritionEntries(payload.entries);
      }
      if (payload.targets) {
        await setNutritionTargets(payload.targets);
      }
      setBridgeStatus('connected');
    } catch {
      setBridgeStatus('offline');
    }
  }, [importNutritionEntries, selectedDateStr, setNutritionTargets]);

  useEffect(() => {
    setBridgeStatus('checking');
    refreshBridge();
  }, [refreshBridge]);

  const handleAddEntry = async () => {
    if (!entryForm.name.trim()) return;

    const input: NutritionEntryInput = {
      ...entryForm,
      date: selectedDateStr,
      calories: entryForm.calories,
      protein: entryForm.protein,
      carbs: entryForm.carbs,
      fat: entryForm.fat,
      source: 'manual',
    };

    const entry = await addNutritionEntry(input);
    setEntryForm(emptyForm());

    if (bridgeStatus === 'connected') {
      try {
        await fetch(`${bridgeUrl}/nutrition/entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entry }),
        });
        refreshBridge();
      } catch {
        setBridgeStatus('offline');
      }
    }
  };

  const handleLogReusableFood = async (food: ReusableFoodItem) => {
    const entry = await addNutritionEntry({
      date: selectedDateStr,
      time: format(new Date(), 'HH:mm'),
      meal: food.meal,
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      emoji: food.emoji,
      imageUrl: food.imageUrl,
      notes: food.notes,
      source: 'manual',
    });

    if (bridgeStatus === 'connected') {
      try {
        await fetch(`${bridgeUrl}/nutrition/entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entry }),
        });
        refreshBridge();
      } catch {
        setBridgeStatus('offline');
      }
    }
  };

  const handleUseReusableFood = (food: ReusableFoodItem) => {
    updateForm({
      meal: food.meal,
      name: food.name,
      calories: String(food.calories),
      protein: String(food.protein),
      carbs: String(food.carbs),
      fat: String(food.fat),
      emoji: food.emoji || '',
      imageUrl: food.imageUrl || '',
      notes: food.notes,
    });
  };

  const handleDeleteEntry = async (entry: NutritionEntry) => {
    await deleteNutritionEntry(entry.id);

    if (bridgeStatus === 'connected') {
      try {
        await fetch(`${bridgeUrl}/nutrition/entries/${entry.id}`, { method: 'DELETE' });
      } catch {
        setBridgeStatus('offline');
      }
    }
  };

  const handleSaveTargets = async () => {
    await setNutritionTargets(targetDraft);

    if (bridgeStatus === 'connected') {
      try {
        await fetch(`${bridgeUrl}/nutrition/targets`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(targetDraft),
        });
        refreshBridge();
      } catch {
        setBridgeStatus('offline');
      }
    }
  };

  const updateForm = (updates: Partial<EntryForm>) => {
    setEntryForm((current) => ({ ...current, ...updates }));
  };

  const updateTargets = (key: keyof NutritionTargets, value: string) => {
    setTargetDraft((current) => ({
      ...current,
      [key]: Number(value) || 0,
    }));
  };

  const syncStatusCopy = getSyncStatusCopy(bridgeStatus, language);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="mb-1 text-2xl font-bold text-gray-900 sm:mb-2 sm:text-3xl">{copy.title}</h2>
          <p className="hidden text-gray-600 sm:block">{copy.description}</p>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-1">
          <button
            type="button"
            onClick={refreshBridge}
            title={syncStatusCopy.description}
            aria-label={`${syncStatusCopy.label}. ${syncStatusCopy.description}`}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border font-medium transition-colors ${
              bridgeStatus === 'connected'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {bridgeStatus === 'checking' ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
            {syncStatusCopy.label}
          </button>
          <p className="hidden max-w-xs text-xs text-gray-500 sm:block sm:text-right">{syncStatusCopy.description}</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={copy.previousDay}
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <input
              type="date"
              value={selectedDateStr}
              onChange={(event) => {
                if (event.target.value) {
                  setSelectedDate(parseISO(event.target.value));
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              aria-label={copy.nextDay}
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <TargetInput
              label={copy.calories}
              testId="calories"
              value={targetDraft.calories}
              onChange={(value) => updateTargets('calories', value)}
            />
            <TargetInput
              label={copy.protein}
              testId="protein"
              value={targetDraft.protein}
              suffix="g"
              onChange={(value) => updateTargets('protein', value)}
            />
            <TargetInput
              label={copy.carbs}
              testId="carbs"
              value={targetDraft.carbs}
              suffix="g"
              onChange={(value) => updateTargets('carbs', value)}
            />
            <TargetInput
              label={copy.fat}
              testId="fat"
              value={targetDraft.fat}
              suffix="g"
              onChange={(value) => updateTargets('fat', value)}
            />
          </div>

          <button
            type="button"
            onClick={handleSaveTargets}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Target className="w-4 h-4" />
            {copy.saveTargets}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <MacroCard
          label={copy.calories}
          value={summary.totals.calories}
          target={nutritionTargets.calories}
          remaining={summary.remaining.calories}
          progress={summary.progress.calories}
          color="#2563eb"
          icon={<Flame className="w-5 h-5" />}
          language={language}
          copy={copy}
        />
        <MacroCard
          label={copy.protein}
          value={summary.totals.protein}
          target={nutritionTargets.protein}
          remaining={summary.remaining.protein}
          progress={summary.progress.protein}
          suffix="g"
          color="#16a34a"
          icon={<Utensils className="w-5 h-5" />}
          language={language}
          copy={copy}
        />
        <MacroCard
          label={copy.carbs}
          value={summary.totals.carbs}
          target={nutritionTargets.carbs}
          remaining={summary.remaining.carbs}
          progress={summary.progress.carbs}
          suffix="g"
          color="#ea580c"
          icon={<Target className="w-5 h-5" />}
          language={language}
          copy={copy}
        />
        <MacroCard
          label={copy.fat}
          value={summary.totals.fat}
          target={nutritionTargets.fat}
          remaining={summary.remaining.fat}
          progress={summary.progress.fat}
          suffix="g"
          color="#9333ea"
          icon={<ImageIcon className="w-5 h-5" />}
          language={language}
          copy={copy}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
          <h3 className="mb-4 text-lg font-bold text-gray-900 sm:text-xl">{copy.addFood}</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{copy.meal}</label>
                <select
                  value={entryForm.meal}
                  onChange={(event) => updateForm({ meal: event.target.value as MealType })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {meals.map((meal) => (
                    <option key={meal} value={meal}>
                      {mealCopy[meal]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{copy.time}</label>
                <input
                  type="time"
                  data-testid="nutrition-entry-time"
                  value={entryForm.time}
                  onChange={(event) => updateForm({ time: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{copy.food}</label>
              <input
                type="text"
                data-testid="nutrition-entry-name"
                value={entryForm.name}
                onChange={(event) => updateForm({ name: event.target.value })}
                placeholder={copy.foodPlaceholder}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MacroInput
                label={copy.calories}
                testId="calories"
                value={entryForm.calories}
                onChange={(value) => updateForm({ calories: value })}
              />
              <MacroInput
                label={copy.protein}
                testId="protein"
                suffix="g"
                value={entryForm.protein}
                onChange={(value) => updateForm({ protein: value })}
              />
              <MacroInput
                label={copy.carbs}
                testId="carbs"
                suffix="g"
                value={entryForm.carbs}
                onChange={(value) => updateForm({ carbs: value })}
              />
              <MacroInput
                label={copy.fat}
                testId="fat"
                suffix="g"
                value={entryForm.fat}
                onChange={(value) => updateForm({ fat: value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{copy.emoji}</label>
                <input
                  type="text"
                  data-testid="nutrition-entry-emoji"
                  value={entryForm.emoji}
                  onChange={(event) => updateForm({ emoji: event.target.value })}
                  placeholder="Auto"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{copy.imageUrl}</label>
                <input
                  type="url"
                  data-testid="nutrition-entry-image-url"
                  value={entryForm.imageUrl}
                  onChange={(event) => updateForm({ imageUrl: event.target.value })}
                  placeholder={copy.imagePlaceholder}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{copy.notes}</label>
              <textarea
                data-testid="nutrition-entry-notes"
                value={entryForm.notes}
                onChange={(event) => updateForm({ notes: event.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="button"
              data-testid="nutrition-add-entry"
              onClick={handleAddEntry}
              className="inline-flex w-full items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {copy.addFood}
            </button>
          </div>

          <div className="border-t border-gray-200 mt-6 pt-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900 sm:text-xl">{copy.recentFoods}</h3>
              <span className="text-sm text-gray-500">{reusableFoods.length} {copy.shown}</span>
            </div>

            <label className="block mb-4">
              <span className="block text-sm font-medium text-gray-700 mb-2">{copy.searchHistory}</span>
              <span className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="search"
                  data-testid="nutrition-history-search"
                  value={historyQuery}
                  onChange={(event) => setHistoryQuery(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="w-full bg-transparent focus:outline-none text-gray-900"
                />
              </span>
            </label>

            {nutritionEntries.length === 0 ? (
              <p className="text-sm text-gray-500">{copy.reusableEmpty}</p>
            ) : reusableFoods.length === 0 ? (
              <p className="text-sm text-gray-500">{copy.reusableNoMatch}</p>
            ) : (
              <div className="space-y-2">
                {reusableFoods.map((food) => (
                  <ReusableFoodRow
                    key={food.key}
                    food={food}
                    onUse={() => handleUseReusableFood(food)}
                    onLog={() => handleLogReusableFood(food)}
                    copy={copy}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {dayEntries.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Utensils className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">{copy.noFoodTitle}</h3>
              <p className="text-gray-600">{copy.noFoodDescription}</p>
            </div>
          ) : (
            meals.map((meal) => {
              const entries = summary.entriesByMeal[meal];
              if (entries.length === 0) return null;

              return (
                <div key={meal} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900">{mealCopy[meal]}</h3>
                    <span className="text-sm text-gray-600">
                      {entries.reduce((sum, entry) => sum + entry.calories, 0)} kcal
                    </span>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {entries.map((entry) => (
                      <FoodEntryRow
                        key={entry.id}
                        entry={entry}
                        onDelete={() => handleDeleteEntry(entry)}
                        copy={copy}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function getSyncStatusCopy(status: NutritionSyncStatus, language: Language) {
  if (language === 'zh') {
    if (status === 'connected') {
      return {
        label: 'AI 同步已连接',
        description: '可从本地 AI 服务刷新同步营养记录。',
      };
    }

    if (status === 'checking') {
      return {
        label: '检查 AI 同步',
        description: '正在查找本地 AI 服务。你可以继续手动记录食物。',
      };
    }

    return {
      label: 'AI 同步离线',
      description: '手动记录仍可使用；本地 AI 服务可用后会再次同步。',
    };
  }

  if (status === 'connected') {
    return {
      label: 'AI sync connected',
      description: 'Synced nutrition entries can refresh from your local AI service.',
    };
  }

  if (status === 'checking') {
    return {
      label: 'Checking AI sync',
      description: 'Looking for your local AI service. You can keep logging food manually.',
    };
  }

  return {
    label: 'AI sync offline',
    description: 'Manual food logging still works. We will sync again when the local AI service is available.',
  };
}

function TargetInput({
  label,
  testId,
  value,
  suffix = '',
  onChange,
}: {
  label: string;
  testId: string;
  value: number;
  suffix?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-500 mb-1">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          data-testid={`nutrition-target-${testId}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
      </span>
    </label>
  );
}

function MacroInput({
  label,
  testId,
  value,
  suffix = '',
  onChange,
}: {
  label: string;
  testId: string;
  value: string;
  suffix?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-2">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          data-testid={`nutrition-macro-${testId}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
      </span>
    </label>
  );
}

function MacroCard({
  label,
  value,
  target,
  remaining,
  progress,
  suffix = '',
  color,
  icon,
  language,
  copy,
}: {
  label: string;
  value: number;
  target: number;
  remaining: number;
  progress: number;
  suffix?: string;
  color: string;
  icon: ReactNode;
  language: Language;
  copy: {
    of: string;
    left: string;
    over: string;
  };
}) {
  const remainingText =
    language === 'zh'
      ? remaining >= 0
        ? `${copy.left} ${remaining}${suffix}`
        : `${copy.over} ${Math.abs(remaining)}${suffix}`
      : remaining >= 0
        ? `${remaining}${suffix} ${copy.left}`
        : `${Math.abs(remaining)}${suffix} ${copy.over}`;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-600 text-sm">{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 sm:text-3xl">
        {value}
        <span className="text-lg text-gray-500 ml-1">{suffix}</span>
      </div>
      <div className="mt-1 text-xs text-gray-500 sm:text-sm">
        {copy.of} {target}
        {suffix} · {remainingText}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${progress}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function ReusableFoodRow({
  food,
  onUse,
  onLog,
  copy,
}: {
  food: ReusableFoodItem;
  onUse: () => void;
  onLog: () => void;
  copy: {
    use: string;
    logAgain: string;
    used: string;
    last: string;
  };
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
          {food.imageUrl ? (
            <img src={food.imageUrl} alt="" className="w-full h-full" style={{ objectFit: 'cover' }} />
          ) : (
            <span className="text-2xl">{food.emoji || '🍽️'}</span>
          )}
        </div>

        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{food.name}</h4>
          <div className="text-sm text-gray-600">
            {food.calories} kcal · P {food.protein}g · C {food.carbs}g · F {food.fat}g
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {copy.used} {food.timesUsed}x · {copy.last} {food.lastUsedDate}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          type="button"
          onClick={onUse}
          className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
        >
          {copy.use}
        </button>
        <button
          type="button"
          onClick={onLog}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {copy.logAgain}
        </button>
      </div>
    </div>
  );
}

function FoodEntryRow({
  entry,
  onDelete,
  copy,
}: {
  entry: NutritionEntry;
  onDelete: () => void;
  copy: {
    delete: string;
    manual: string;
    ai: string;
  };
}) {
  return (
    <div className="p-4 flex items-center gap-4">
      <div className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
        {entry.imageUrl ? (
          <img src={entry.imageUrl} alt="" className="w-full h-full" style={{ objectFit: 'cover' }} />
        ) : (
          <span className="text-3xl">{entry.emoji || '🍽️'}</span>
        )}
      </div>

      <div className="flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
          <h4 className="font-semibold text-gray-900">{entry.name}</h4>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
              entry.source === 'mcp' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {entry.source === 'mcp' ? copy.ai : copy.manual}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          {entry.time} · {entry.calories} kcal · P {entry.protein}g · C {entry.carbs}g · F {entry.fat}g
        </div>
        {entry.notes && <p className="text-sm text-gray-500 mt-1">{entry.notes}</p>}
      </div>

      <button
        type="button"
        aria-label={`${copy.delete} ${entry.name}`}
        onClick={onDelete}
        className="text-gray-400 hover:text-red-600 transition-colors"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}
