export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type NutritionEntrySource = 'manual' | 'mcp' | 'import';
export type NutritionSyncStatus = 'checking' | 'connected' | 'offline';

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionEntry {
  id: string;
  date: string;
  time: string;
  meal: MealType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  emoji?: string;
  imageUrl?: string;
  notes: string;
  source: NutritionEntrySource;
  createdAt: string;
  updatedAt: string;
}

export interface NutritionEntryInput {
  date?: string;
  time?: string;
  meal?: MealType | string;
  name: string;
  calories?: number | string;
  protein?: number | string;
  carbs?: number | string;
  fat?: number | string;
  emoji?: string;
  imageUrl?: string;
  notes?: string;
  source?: NutritionEntrySource;
}

export interface NutritionSummary {
  totals: NutritionTargets;
  remaining: NutritionTargets;
  progress: NutritionTargets;
  entriesByMeal: Record<MealType, NutritionEntry[]>;
}

export interface ReusableFoodItem {
  key: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  emoji?: string;
  imageUrl?: string;
  notes: string;
  meal: MealType;
  timesUsed: number;
  lastUsedDate: string;
  lastUsedAt: string;
}

export interface NutritionSyncStatusCopy {
  label: string;
  description: string;
}

const mealOrder: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const defaultNutritionTargets: NutritionTargets = {
  calories: 1800,
  protein: 150,
  carbs: 180,
  fat: 55,
};

export const mealLabels: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export function getNutritionSyncStatusCopy(status: NutritionSyncStatus): NutritionSyncStatusCopy {
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

export function createNutritionEntry(
  input: NutritionEntryInput,
  options: {
    id?: () => string;
    now?: () => string;
  } = {}
): NutritionEntry {
  const now = options.now?.() ?? new Date().toISOString();
  const date = normalizeDate(input.date, now);
  const time = normalizeTime(input.time, now);
  const meal = normalizeMealType(input.meal) ?? inferMealFromTime(time);
  const name = input.name.trim() || 'Untitled food';
  const emoji = input.emoji?.trim() || inferFoodEmoji(name);
  const imageUrl = input.imageUrl?.trim();

  return {
    id: options.id?.() ?? createId(),
    date,
    time,
    meal,
    name,
    calories: normalizeMacro(input.calories),
    protein: normalizeMacro(input.protein),
    carbs: normalizeMacro(input.carbs),
    fat: normalizeMacro(input.fat),
    emoji,
    ...(imageUrl ? { imageUrl } : {}),
    notes: input.notes?.trim() ?? '',
    source: input.source ?? 'manual',
    createdAt: now,
    updatedAt: now,
  };
}

export function calculateNutritionSummary(
  entries: NutritionEntry[],
  targets: NutritionTargets
): NutritionSummary {
  const totals = entries.reduce<NutritionTargets>(
    (sum, entry) => ({
      calories: roundMacro(sum.calories + entry.calories),
      protein: roundMacro(sum.protein + entry.protein),
      carbs: roundMacro(sum.carbs + entry.carbs),
      fat: roundMacro(sum.fat + entry.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const entriesByMeal = mealOrder.reduce<Record<MealType, NutritionEntry[]>>(
    (groups, meal) => {
      groups[meal] = entries
        .filter((entry) => entry.meal === meal)
        .sort(compareNutritionEntries);
      return groups;
    },
    {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    }
  );

  return {
    totals,
    remaining: {
      calories: roundMacro(targets.calories - totals.calories),
      protein: roundMacro(targets.protein - totals.protein),
      carbs: roundMacro(targets.carbs - totals.carbs),
      fat: roundMacro(targets.fat - totals.fat),
    },
    progress: {
      calories: calculateProgress(totals.calories, targets.calories),
      protein: calculateProgress(totals.protein, targets.protein),
      carbs: calculateProgress(totals.carbs, targets.carbs),
      fat: calculateProgress(totals.fat, targets.fat),
    },
    entriesByMeal,
  };
}

export function mergeNutritionEntries(
  localEntries: NutritionEntry[],
  bridgeEntries: NutritionEntry[]
): NutritionEntry[] {
  const byId = new Map<string, NutritionEntry>();

  for (const entry of [...localEntries, ...bridgeEntries]) {
    const current = byId.get(entry.id);
    if (!current || entry.updatedAt >= current.updatedAt) {
      byId.set(entry.id, entry);
    }
  }

  return Array.from(byId.values()).sort(compareNutritionEntries);
}

export function getReusableFoodItems(entries: NutritionEntry[], query = ''): ReusableFoodItem[] {
  const byFood = new Map<string, { latest: NutritionEntry; timesUsed: number }>();

  for (const entry of entries) {
    const key = normalizeFoodKey(entry.name);
    if (!key) continue;

    const current = byFood.get(key);
    if (!current) {
      byFood.set(key, { latest: entry, timesUsed: 1 });
      continue;
    }

    byFood.set(key, {
      latest: entry.updatedAt >= current.latest.updatedAt ? entry : current.latest,
      timesUsed: current.timesUsed + 1,
    });
  }

  const normalizedQuery = query.trim().toLowerCase();

  return Array.from(byFood.entries())
    .map(([key, item]) => ({
      key,
      name: item.latest.name,
      calories: item.latest.calories,
      protein: item.latest.protein,
      carbs: item.latest.carbs,
      fat: item.latest.fat,
      emoji: item.latest.emoji,
      imageUrl: item.latest.imageUrl,
      notes: item.latest.notes,
      meal: item.latest.meal,
      timesUsed: item.timesUsed,
      lastUsedDate: item.latest.date,
      lastUsedAt: item.latest.updatedAt,
    }))
    .filter((item) => {
      if (!normalizedQuery) return true;
      const searchable = [
        item.name,
        `${item.calories} kcal`,
        `${item.protein}g protein`,
        `${item.carbs}g carbs`,
        `${item.fat}g fat`,
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(normalizedQuery);
    })
    .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
}

export function compareNutritionEntries(a: NutritionEntry, b: NutritionEntry) {
  const dateCompare = a.date.localeCompare(b.date);
  if (dateCompare !== 0) return dateCompare;

  const timeCompare = a.time.localeCompare(b.time);
  if (timeCompare !== 0) return timeCompare;

  return a.createdAt.localeCompare(b.createdAt);
}

export function normalizeMealType(meal?: string): MealType | undefined {
  if (!meal) return undefined;

  const normalized = meal.toLowerCase().trim();
  if (normalized === 'breakfast' || normalized === 'morning') return 'breakfast';
  if (normalized === 'lunch' || normalized === 'noon') return 'lunch';
  if (normalized === 'dinner' || normalized === 'supper' || normalized === 'evening') return 'dinner';
  if (normalized === 'snack' || normalized === 'snacks') return 'snack';

  return undefined;
}

export function inferMealFromTime(time: string): MealType {
  const hour = Number(time.slice(0, 2));
  if (!Number.isFinite(hour)) return 'snack';
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
}

export function inferFoodEmoji(name: string): string {
  const value = name.toLowerCase();
  const emojiRules: Array<[RegExp, string]> = [
    [/\b(yogurt|oat|oatmeal|cereal|granola)\b/, '🥣'],
    [/\b(egg|omelet|omelette)\b/, '🍳'],
    [/\b(chicken|turkey|drumstick)\b/, '🍗'],
    [/\b(beef|steak)\b/, '🥩'],
    [/\b(salmon|tuna|fish|shrimp)\b/, '🐟'],
    [/\b(rice|congee)\b/, '🍚'],
    [/\b(noodle|pasta|ramen)\b/, '🍜'],
    [/\b(salad|lettuce|spinach|greens)\b/, '🥗'],
    [/\b(protein|shake|smoothie)\b/, '🥤'],
    [/\b(coffee|latte|americano)\b/, '☕'],
    [/\b(apple|banana|berry|fruit)\b/, '🍎'],
    [/\b(bread|toast|sandwich)\b/, '🥪'],
    [/\b(bowl)\b/, '🥣'],
  ];

  return emojiRules.find(([pattern]) => pattern.test(value))?.[1] ?? '🍽️';
}

function normalizeFoodKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeDate(date: string | undefined, isoNow: string) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return isoNow.slice(0, 10);
}

function normalizeTime(time: string | undefined, isoNow: string) {
  if (time && /^\d{2}:\d{2}$/.test(time)) return time;

  const parsed = new Date(isoNow);
  if (Number.isNaN(parsed.getTime())) return '12:00';

  return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
}

function normalizeMacro(value: number | string | undefined) {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(parsed)) return 0;
  return roundMacro(Math.max(0, parsed ?? 0));
}

function calculateProgress(total: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((total / target) * 100));
}

function roundMacro(value: number) {
  return Math.round(value * 10) / 10;
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `nutrition-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
