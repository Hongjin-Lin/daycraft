#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataPath =
  process.env.DAYCRAFT_NUTRITION_DATA ||
  fileURLToPath(new URL('../data/nutrition-log.json', import.meta.url));
const port = Number(process.env.DAYCRAFT_NUTRITION_PORT || 8787);

const defaultTargets = {
  calories: 1800,
  protein: 150,
  carbs: 180,
  fat: 55,
};

const tools = [
  {
    name: 'log_food',
    description: 'Log a food or meal into Daycraft nutrition tracking.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in yyyy-MM-dd. Defaults to today.' },
        time: { type: 'string', description: 'Time in HH:mm. Defaults to now.' },
        meal: {
          type: 'string',
          enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          description: 'Meal bucket. If omitted, inferred from time.',
        },
        name: { type: 'string', description: 'Food or meal name.' },
        calories: { type: 'number', description: 'Calories in kcal.' },
        protein: { type: 'number', description: 'Protein in grams.' },
        carbs: { type: 'number', description: 'Carbohydrates in grams.' },
        fat: { type: 'number', description: 'Fat in grams.' },
        emoji: { type: 'string', description: 'Optional emoji for the food.' },
        imageUrl: { type: 'string', description: 'Optional image URL.' },
        notes: { type: 'string', description: 'Optional notes.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_day',
    description: 'List Daycraft nutrition entries and summary for one date.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in yyyy-MM-dd. Defaults to today.' },
      },
    },
  },
  {
    name: 'set_targets',
    description: 'Set Daycraft daily nutrition targets.',
    inputSchema: {
      type: 'object',
      properties: {
        calories: { type: 'number' },
        protein: { type: 'number' },
        carbs: { type: 'number' },
        fat: { type: 'number' },
      },
      required: ['calories', 'protein', 'carbs', 'fat'],
    },
  },
  {
    name: 'delete_food_entry',
    description: 'Delete a Daycraft nutrition entry by id.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    },
  },
];

startHttpBridge();
startMcpStdio();

function startHttpBridge() {
  const server = createServer(async (request, response) => {
    try {
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');

      if (request.method === 'OPTIONS') {
        response.writeHead(204);
        response.end();
        return;
      }

      const url = new URL(request.url || '/', `http://${request.headers.host}`);
      const pathname = url.pathname;

      if (request.method === 'GET' && pathname === '/health') {
        sendJson(response, 200, { ok: true, name: 'daycraft-nutrition-mcp' });
        return;
      }

      if (request.method === 'GET' && pathname === '/nutrition') {
        const store = await readStore();
        const date = normalizeDate(url.searchParams.get('date') || undefined);
        const entries = store.entries.filter((entry) => entry.date === date).sort(compareEntries);
        sendJson(response, 200, {
          date,
          targets: store.targets,
          entries,
          summary: calculateSummary(entries, store.targets),
        });
        return;
      }

      if (request.method === 'POST' && pathname === '/nutrition/entries') {
        const body = await readJson(request);
        const entry = body.entry ? normalizeStoredEntry(body.entry, 'manual') : createEntry(body, 'manual');
        const store = await readStore();
        await writeStore({ ...store, entries: upsertEntries(store.entries, [entry]) });
        sendJson(response, 201, { entry });
        return;
      }

      if (request.method === 'PUT' && pathname === '/nutrition/targets') {
        const body = await readJson(request);
        const store = await readStore();
        const targets = sanitizeTargets(body);
        await writeStore({ ...store, targets });
        sendJson(response, 200, { targets });
        return;
      }

      if (request.method === 'DELETE' && pathname.startsWith('/nutrition/entries/')) {
        const id = decodeURIComponent(pathname.split('/').pop() || '');
        const store = await readStore();
        const entries = store.entries.filter((entry) => entry.id !== id);
        await writeStore({ ...store, entries });
        sendJson(response, 200, { deleted: id, entries });
        return;
      }

      sendJson(response, 404, { error: 'Not found' });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  });

  server.listen(port, () => {
    console.error(`Daycraft Nutrition MCP bridge listening on http://localhost:${port}`);
    console.error(`Nutrition data file: ${dataPath}`);
  });
}

function startMcpStdio() {
  let buffer = '';
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (chunk) => {
    buffer += chunk;

    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const rawMessage = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (rawMessage) {
        handleJsonRpcMessage(rawMessage);
      }
      newlineIndex = buffer.indexOf('\n');
    }
  });
}

async function handleJsonRpcMessage(rawMessage) {
  let message;
  try {
    message = JSON.parse(rawMessage);
  } catch {
    sendRpcError(null, -32700, 'Parse error');
    return;
  }

  if (!message.method) return;

  try {
    switch (message.method) {
      case 'initialize':
        sendRpcResult(message.id, {
          protocolVersion: message.params?.protocolVersion || '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'daycraft-nutrition', version: '0.1.0' },
        });
        break;
      case 'notifications/initialized':
        break;
      case 'ping':
        sendRpcResult(message.id, {});
        break;
      case 'tools/list':
        sendRpcResult(message.id, { tools });
        break;
      case 'tools/call':
        sendRpcResult(message.id, await callTool(message.params?.name, message.params?.arguments || {}));
        break;
      case 'resources/list':
        sendRpcResult(message.id, { resources: [] });
        break;
      case 'prompts/list':
        sendRpcResult(message.id, { prompts: [] });
        break;
      default:
        sendRpcError(message.id, -32601, `Unknown method: ${message.method}`);
    }
  } catch (error) {
    sendRpcResult(message.id, {
      content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
      isError: true,
    });
  }
}

async function callTool(name, args) {
  switch (name) {
    case 'log_food': {
      const entry = createEntry(args, 'mcp');
      const store = await readStore();
      const entries = upsertEntries(store.entries, [entry]);
      await writeStore({ ...store, entries });
      return toolResult({ entry, summary: calculateSummary(entries.filter((item) => item.date === entry.date), store.targets) });
    }
    case 'list_day': {
      const store = await readStore();
      const date = normalizeDate(args.date);
      const entries = store.entries.filter((entry) => entry.date === date).sort(compareEntries);
      return toolResult({ date, targets: store.targets, entries, summary: calculateSummary(entries, store.targets) });
    }
    case 'set_targets': {
      const store = await readStore();
      const targets = sanitizeTargets(args);
      await writeStore({ ...store, targets });
      return toolResult({ targets });
    }
    case 'delete_food_entry': {
      const store = await readStore();
      const entries = store.entries.filter((entry) => entry.id !== args.id);
      await writeStore({ ...store, entries });
      return toolResult({ deleted: args.id, remainingEntries: entries.length });
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function readStore() {
  try {
    const raw = await readFile(dataPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      targets: sanitizeTargets(parsed.targets || defaultTargets),
      entries: Array.isArray(parsed.entries)
        ? parsed.entries.map((entry) => normalizeStoredEntry(entry, entry.source || 'mcp')).sort(compareEntries)
        : [],
    };
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return { targets: defaultTargets, entries: [] };
  }
}

async function writeStore(store) {
  await mkdir(dirname(dataPath), { recursive: true });
  await writeFile(dataPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

function createEntry(input, fallbackSource) {
  const now = new Date().toISOString();
  const date = normalizeDate(input.date);
  const time = normalizeTime(input.time);
  const meal = normalizeMealType(input.meal) || inferMealFromTime(time);
  const name = String(input.name || '').trim();
  if (!name) throw new Error('Food name is required');

  return {
    id: createId(),
    date,
    time,
    meal,
    name,
    calories: normalizeNumber(input.calories),
    protein: normalizeNumber(input.protein),
    carbs: normalizeNumber(input.carbs),
    fat: normalizeNumber(input.fat),
    emoji: String(input.emoji || '').trim() || inferFoodEmoji(name),
    ...(String(input.imageUrl || '').trim() ? { imageUrl: String(input.imageUrl).trim() } : {}),
    notes: String(input.notes || '').trim(),
    source: input.source === 'manual' || input.source === 'import' ? input.source : fallbackSource,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeStoredEntry(input, fallbackSource) {
  const now = new Date().toISOString();
  const name = String(input.name || '').trim();
  if (!name) throw new Error('Food name is required');

  return {
    id: String(input.id || createId()),
    date: normalizeDate(input.date),
    time: normalizeTime(input.time),
    meal: normalizeMealType(input.meal) || inferMealFromTime(normalizeTime(input.time)),
    name,
    calories: normalizeNumber(input.calories),
    protein: normalizeNumber(input.protein),
    carbs: normalizeNumber(input.carbs),
    fat: normalizeNumber(input.fat),
    emoji: String(input.emoji || '').trim() || inferFoodEmoji(name),
    ...(String(input.imageUrl || '').trim() ? { imageUrl: String(input.imageUrl).trim() } : {}),
    notes: String(input.notes || '').trim(),
    source: ['manual', 'mcp', 'import'].includes(input.source) ? input.source : fallbackSource,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}

function upsertEntries(currentEntries, incomingEntries) {
  const byId = new Map();
  for (const entry of [...currentEntries, ...incomingEntries]) {
    const current = byId.get(entry.id);
    if (!current || entry.updatedAt >= current.updatedAt) {
      byId.set(entry.id, entry);
    }
  }
  return Array.from(byId.values()).sort(compareEntries);
}

function calculateSummary(entries, targets) {
  const totals = entries.reduce(
    (sum, entry) => ({
      calories: round(sum.calories + entry.calories),
      protein: round(sum.protein + entry.protein),
      carbs: round(sum.carbs + entry.carbs),
      fat: round(sum.fat + entry.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    totals,
    remaining: {
      calories: round(targets.calories - totals.calories),
      protein: round(targets.protein - totals.protein),
      carbs: round(targets.carbs - totals.carbs),
      fat: round(targets.fat - totals.fat),
    },
    progress: {
      calories: progress(totals.calories, targets.calories),
      protein: progress(totals.protein, targets.protein),
      carbs: progress(totals.carbs, targets.carbs),
      fat: progress(totals.fat, targets.fat),
    },
  };
}

function sanitizeTargets(targets) {
  return {
    calories: normalizeNumber(targets.calories ?? defaultTargets.calories),
    protein: normalizeNumber(targets.protein ?? defaultTargets.protein),
    carbs: normalizeNumber(targets.carbs ?? defaultTargets.carbs),
    fat: normalizeNumber(targets.fat ?? defaultTargets.fat),
  };
}

function normalizeDate(date) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return toLocalDate(new Date());
}

function normalizeTime(time) {
  if (typeof time === 'string' && /^\d{2}:\d{2}$/.test(time)) return time;
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function normalizeMealType(meal) {
  const normalized = String(meal || '').toLowerCase().trim();
  if (normalized === 'breakfast' || normalized === 'morning') return 'breakfast';
  if (normalized === 'lunch' || normalized === 'noon') return 'lunch';
  if (normalized === 'dinner' || normalized === 'supper' || normalized === 'evening') return 'dinner';
  if (normalized === 'snack' || normalized === 'snacks') return 'snack';
  return undefined;
}

function inferMealFromTime(time) {
  const hour = Number(time.slice(0, 2));
  if (!Number.isFinite(hour)) return 'snack';
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
}

function inferFoodEmoji(name) {
  const value = name.toLowerCase();
  const rules = [
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
  return rules.find(([pattern]) => pattern.test(value))?.[1] || '🍽️';
}

function normalizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? round(Math.max(0, parsed)) : 0;
}

function progress(total, target) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((total / target) * 100));
}

function compareEntries(a, b) {
  const dateCompare = a.date.localeCompare(b.date);
  if (dateCompare !== 0) return dateCompare;
  const timeCompare = a.time.localeCompare(b.time);
  if (timeCompare !== 0) return timeCompare;
  return a.createdAt.localeCompare(b.createdAt);
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `nutrition-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toLocalDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function sendRpcResult(id, result) {
  if (id === undefined || id === null) return;
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
}

function sendRpcError(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })}\n`);
}

function toolResult(data) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    isError: false,
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}
