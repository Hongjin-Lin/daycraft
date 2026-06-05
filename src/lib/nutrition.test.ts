import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateNutritionSummary,
  createNutritionEntry,
  getNutritionSyncStatusCopy,
  getReusableFoodItems,
  mergeNutritionEntries,
  type NutritionEntry,
} from './nutrition.ts';

test('getNutritionSyncStatusCopy describes offline sync without developer terms', () => {
  assert.deepEqual(getNutritionSyncStatusCopy('offline'), {
    label: 'AI sync offline',
    description: 'Manual food logging still works. We will sync again when the local AI service is available.',
  });
});

test('createNutritionEntry normalizes an AI food log with useful defaults', () => {
  const entry = createNutritionEntry(
    {
      date: '2026-06-05',
      time: '08:20',
      name: 'Greek yogurt bowl',
      calories: 320,
      protein: 32,
      carbs: 35,
      fat: 7,
      source: 'mcp',
    },
    {
      id: () => 'entry-1',
      now: () => '2026-06-05T08:21:00.000Z',
    }
  );

  assert.deepEqual(entry, {
    id: 'entry-1',
    date: '2026-06-05',
    time: '08:20',
    meal: 'breakfast',
    name: 'Greek yogurt bowl',
    calories: 320,
    protein: 32,
    carbs: 35,
    fat: 7,
    emoji: '🥣',
    notes: '',
    source: 'mcp',
    createdAt: '2026-06-05T08:21:00.000Z',
    updatedAt: '2026-06-05T08:21:00.000Z',
  });
});

test('calculateNutritionSummary totals macros and remaining targets for one day', () => {
  const entries: NutritionEntry[] = [
    {
      id: 'a',
      date: '2026-06-05',
      time: '08:00',
      meal: 'breakfast',
      name: 'Eggs',
      calories: 300,
      protein: 25,
      carbs: 2,
      fat: 20,
      emoji: '🍳',
      notes: '',
      source: 'manual',
      createdAt: '2026-06-05T08:00:00.000Z',
      updatedAt: '2026-06-05T08:00:00.000Z',
    },
    {
      id: 'b',
      date: '2026-06-05',
      time: '12:30',
      meal: 'lunch',
      name: 'Chicken rice',
      calories: 650,
      protein: 55,
      carbs: 80,
      fat: 12,
      emoji: '🍗',
      notes: '',
      source: 'mcp',
      createdAt: '2026-06-05T12:30:00.000Z',
      updatedAt: '2026-06-05T12:30:00.000Z',
    },
  ];

  const summary = calculateNutritionSummary(entries, {
    calories: 1800,
    protein: 150,
    carbs: 180,
    fat: 55,
  });

  assert.deepEqual(summary.totals, {
    calories: 950,
    protein: 80,
    carbs: 82,
    fat: 32,
  });
  assert.deepEqual(summary.remaining, {
    calories: 850,
    protein: 70,
    carbs: 98,
    fat: 23,
  });
  assert.equal(summary.progress.calories, 53);
  assert.equal(summary.entriesByMeal.breakfast.length, 1);
  assert.equal(summary.entriesByMeal.lunch.length, 1);
});

test('mergeNutritionEntries deduplicates and keeps the newest bridge version', () => {
  const baseEntry: NutritionEntry = {
    id: 'same-id',
    date: '2026-06-05',
    time: '19:10',
    meal: 'dinner',
    name: 'Salmon',
    calories: 520,
    protein: 42,
    carbs: 18,
    fat: 28,
    emoji: '🐟',
    notes: '',
    source: 'manual',
    createdAt: '2026-06-05T19:10:00.000Z',
    updatedAt: '2026-06-05T19:10:00.000Z',
  };

  const merged = mergeNutritionEntries(
    [baseEntry],
    [
      {
        ...baseEntry,
        calories: 560,
        notes: 'Adjusted by AI',
        source: 'mcp',
        updatedAt: '2026-06-05T19:12:00.000Z',
      },
      {
        ...baseEntry,
        id: 'earlier',
        time: '07:40',
        meal: 'breakfast',
        name: 'Protein shake',
      },
    ]
  );

  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'earlier');
  assert.equal(merged[1].id, 'same-id');
  assert.equal(merged[1].calories, 560);
  assert.equal(merged[1].source, 'mcp');
});

test('getReusableFoodItems returns unique foods sorted by recent use with usage counts', () => {
  const entries: NutritionEntry[] = [
    {
      id: 'old-yogurt',
      date: '2026-06-01',
      time: '08:10',
      meal: 'breakfast',
      name: 'Greek yogurt bowl',
      calories: 280,
      protein: 28,
      carbs: 31,
      fat: 6,
      emoji: '🥣',
      notes: 'old macro',
      source: 'manual',
      createdAt: '2026-06-01T08:10:00.000Z',
      updatedAt: '2026-06-01T08:10:00.000Z',
    },
    {
      id: 'chicken',
      date: '2026-06-02',
      time: '12:30',
      meal: 'lunch',
      name: 'Chicken rice',
      calories: 650,
      protein: 55,
      carbs: 80,
      fat: 12,
      emoji: '🍗',
      notes: '',
      source: 'mcp',
      createdAt: '2026-06-02T12:30:00.000Z',
      updatedAt: '2026-06-02T12:30:00.000Z',
    },
    {
      id: 'latest-yogurt',
      date: '2026-06-05',
      time: '08:20',
      meal: 'breakfast',
      name: 'Greek Yogurt Bowl',
      calories: 320,
      protein: 32,
      carbs: 35,
      fat: 7,
      emoji: '🥣',
      notes: 'latest macro',
      source: 'manual',
      createdAt: '2026-06-05T08:20:00.000Z',
      updatedAt: '2026-06-05T08:20:00.000Z',
    },
  ];

  const items = getReusableFoodItems(entries);

  assert.equal(items.length, 2);
  assert.deepEqual(items[0], {
    key: 'greek yogurt bowl',
    name: 'Greek Yogurt Bowl',
    calories: 320,
    protein: 32,
    carbs: 35,
    fat: 7,
    emoji: '🥣',
    notes: 'latest macro',
    imageUrl: undefined,
    meal: 'breakfast',
    timesUsed: 2,
    lastUsedDate: '2026-06-05',
    lastUsedAt: '2026-06-05T08:20:00.000Z',
  });
  assert.equal(items[1].name, 'Chicken rice');
});

test('getReusableFoodItems filters by food name and macro text', () => {
  const entries: NutritionEntry[] = [
    {
      id: 'shake',
      date: '2026-06-04',
      time: '15:00',
      meal: 'snack',
      name: 'Protein shake',
      calories: 180,
      protein: 30,
      carbs: 8,
      fat: 2,
      emoji: '🥤',
      notes: '',
      source: 'manual',
      createdAt: '2026-06-04T15:00:00.000Z',
      updatedAt: '2026-06-04T15:00:00.000Z',
    },
    {
      id: 'salmon',
      date: '2026-06-05',
      time: '19:00',
      meal: 'dinner',
      name: 'Salmon plate',
      calories: 520,
      protein: 42,
      carbs: 20,
      fat: 28,
      emoji: '🐟',
      notes: '',
      source: 'manual',
      createdAt: '2026-06-05T19:00:00.000Z',
      updatedAt: '2026-06-05T19:00:00.000Z',
    },
  ];

  assert.deepEqual(
    getReusableFoodItems(entries, 'shake').map((item) => item.name),
    ['Protein shake']
  );
  assert.deepEqual(
    getReusableFoodItems(entries, '42g').map((item) => item.name),
    ['Salmon plate']
  );
});
