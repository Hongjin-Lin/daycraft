import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadLocalEnv() {
  for (const file of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "..", ".env")]) {
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      if (!process.env[key]) {
        process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
      }
    }
  }
}

loadLocalEnv();

// Supabase config. These are intentionally local-only; never commit service-role keys.
const SUPABASE_URL = process.env.DAYCRAFT_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.DAYCRAFT_SUPABASE_SERVICE_KEY;
const USER_ID = process.env.DAYCRAFT_USER_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !USER_ID) {
  throw new Error(
    "Missing MCP config. Set DAYCRAFT_SUPABASE_URL, DAYCRAFT_SUPABASE_SERVICE_KEY, and DAYCRAFT_USER_ID in your environment or local .env."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const server = new McpServer({
  name: "daycraft",
  version: "1.0.0",
});

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

server.tool("agent_help", "Show DayCraft MCP capabilities for AI agents", {}, async () => {
  return {
    content: [{
      type: "text",
      text: [
        "DayCraft MCP is configured for local AI-agent operation.",
        "",
        "Common workflows:",
        "- create_period: start a planning period, defaulting to 12 weeks unless endDate is supplied.",
        "- update_period: change the active period date range.",
        "- create_goal / add_tactic: maintain goals and execution tactics.",
        "- add_todo / toggle_todo: log daily work without opening the app.",
        "- save_weekly_score: record weekly execution and reflection notes.",
        "- get_progress: summarize current progress for agent handoff.",
        "",
        "Safety:",
        "- This server uses service-role credentials from local environment variables.",
        "- Keep it local and only expose it to trusted agents."
      ].join("\n")
    }]
  };
});

// Helper: get active period
async function getActivePeriod() {
  const { data } = await supabase
    .from("periods")
    .select("*")
    .eq("user_id", USER_ID)
    .eq("active", true)
    .single();
  return data;
}

// ===== PERIODS =====

server.tool("list_periods", "List all 12-week periods", {}, async () => {
  const { data, error } = await supabase
    .from("periods")
    .select("*")
    .eq("user_id", USER_ID)
    .order("start_date", { ascending: false });

  if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

  const list = (data || []).map((p: any) =>
    `• ${p.id} | ${p.start_date} → ${p.end_date} | ${p.active ? "✅ Active" : ""}`
  ).join("\n");

  return { content: [{ type: "text", text: list || "No periods found." }] };
});

server.tool(
  "create_period",
  "Create a new 12-week period",
  {
    startDate: z.string().describe("Start date in YYYY-MM-DD format"),
    endDate: z.string().optional().describe("Optional end date in YYYY-MM-DD format. Defaults to 12 weeks."),
  },
  async ({ startDate, endDate }) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : addDays(start, 83);

    // Deactivate existing periods
    await supabase.from("periods").update({ active: false }).eq("user_id", USER_ID).eq("active", true);

    const { data, error } = await supabase
      .from("periods")
      .insert({
        user_id: USER_ID,
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
        active: true,
      })
      .select()
      .single();

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

    return { content: [{ type: "text", text: `✅ Created period: ${data.start_date} → ${data.end_date} (ID: ${data.id})` }] };
  }
);

server.tool(
  "update_period",
  "Update the active period start and end dates",
  {
    startDate: z.string().describe("Start date in YYYY-MM-DD format"),
    endDate: z.string().describe("End date in YYYY-MM-DD format"),
  },
  async ({ startDate, endDate }) => {
    const period = await getActivePeriod();
    if (!period) return { content: [{ type: "text", text: "No active period found." }] };

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return { content: [{ type: "text", text: "Error: endDate must be on or after startDate." }] };
    }

    const { data, error } = await supabase
      .from("periods")
      .update({ start_date: toISODate(start), end_date: toISODate(end) })
      .eq("id", period.id)
      .eq("user_id", USER_ID)
      .select()
      .single();

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

    return { content: [{ type: "text", text: `Updated period: ${data.start_date} -> ${data.end_date}` }] };
  }
);

// ===== GOALS =====

server.tool("list_goals", "List all goals in the active period", {}, async () => {
  const period = await getActivePeriod();
  if (!period) return { content: [{ type: "text", text: "No active period found." }] };

  const { data: goals } = await supabase
    .from("goals")
    .select("*, tactics(*)")
    .eq("user_id", USER_ID)
    .eq("period_id", period.id);

  if (!goals || goals.length === 0) return { content: [{ type: "text", text: "No goals yet." }] };

  const lines = goals.map((g: any) => {
    const tactics = (g.tactics || []).map((t: any) =>
      `    ${t.completed ? "✅" : "⬜"} ${t.title}${t.due_week ? ` (Week ${t.due_week})` : ""}`
    ).join("\n");
    return `🎯 ${g.title} (${g.progress}%)\n   ${g.description || "No description"}\n${tactics || "   No tactics"}`;
  });

  return { content: [{ type: "text", text: lines.join("\n\n") }] };
});

server.tool(
  "create_goal",
  "Create a new goal in the active period",
  {
    title: z.string().describe("Goal title"),
    description: z.string().optional().describe("Goal description"),
  },
  async ({ title, description }) => {
    const period = await getActivePeriod();
    if (!period) return { content: [{ type: "text", text: "No active period found. Create one first." }] };

    const { data, error } = await supabase
      .from("goals")
      .insert({
        user_id: USER_ID,
        period_id: period.id,
        title,
        description: description || "",
        progress: 0,
      })
      .select()
      .single();

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

    return { content: [{ type: "text", text: `✅ Created goal: "${data.title}" (ID: ${data.id})` }] };
  }
);

server.tool(
  "delete_goal",
  "Delete a goal and all its tactics",
  { goalId: z.string().describe("Goal ID") },
  async ({ goalId }) => {
    const { error } = await supabase.from("goals").delete().eq("id", goalId);
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: `✅ Goal deleted.` }] };
  }
);

// ===== TACTICS =====

server.tool(
  "add_tactic",
  "Add a tactic to a goal",
  {
    goalId: z.string().describe("Goal ID"),
    title: z.string().describe("Tactic title"),
    dueWeek: z.number().optional().describe("Due week (1-12)"),
  },
  async ({ goalId, title, dueWeek }) => {
    const { data, error } = await supabase
      .from("tactics")
      .insert({
        user_id: USER_ID,
        goal_id: goalId,
        title,
        completed: false,
        due_week: dueWeek || null,
      })
      .select()
      .single();

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

    return { content: [{ type: "text", text: `✅ Added tactic: "${data.title}" (ID: ${data.id})` }] };
  }
);

server.tool(
  "toggle_tactic",
  "Mark a tactic as complete or incomplete",
  {
    tacticId: z.string().describe("Tactic ID"),
  },
  async ({ tacticId }) => {
    const { data: tactic } = await supabase.from("tactics").select("*").eq("id", tacticId).single();
    if (!tactic) return { content: [{ type: "text", text: "Tactic not found." }] };

    const { error } = await supabase.from("tactics").update({ completed: !tactic.completed }).eq("id", tacticId);
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

    // Recalculate goal progress
    const { data: allTactics } = await supabase.from("tactics").select("completed").eq("goal_id", tactic.goal_id);
    if (allTactics) {
      const progress = Math.round((allTactics.filter((t: any) => t.completed).length / allTactics.length) * 100);
      await supabase.from("goals").update({ progress }).eq("id", tactic.goal_id);
    }

    return { content: [{ type: "text", text: `✅ Tactic "${tactic.title}" marked as ${!tactic.completed ? "complete" : "incomplete"}.` }] };
  }
);

// ===== TODOS =====

server.tool(
  "list_todos",
  "List todos for a specific date (defaults to today)",
  { date: z.string().optional().describe("Date in YYYY-MM-DD format (default: today)") },
  async ({ date }) => {
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", USER_ID)
      .eq("date", targetDate)
      .order("created_at", { ascending: true });

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

    if (!data || data.length === 0) return { content: [{ type: "text", text: `No todos for ${targetDate}.` }] };

    const lines = data.map((t: any) =>
      `${t.completed ? "✅" : "⬜"} ${t.title} (ID: ${t.id})`
    );

    return { content: [{ type: "text", text: `📋 Todos for ${targetDate}:\n${lines.join("\n")}` }] };
  }
);

server.tool(
  "add_todo",
  "Add a new todo",
  {
    title: z.string().describe("Todo title"),
    date: z.string().optional().describe("Date in YYYY-MM-DD format (default: today)"),
    goalId: z.string().optional().describe("Link to a goal"),
    tacticId: z.string().optional().describe("Link to a tactic"),
  },
  async ({ title, date, goalId, tacticId }) => {
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("todos")
      .insert({
        user_id: USER_ID,
        title,
        date: targetDate,
        completed: false,
        goal_id: goalId || null,
        tactic_id: tacticId || null,
      })
      .select()
      .single();

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

    return { content: [{ type: "text", text: `✅ Added todo: "${data.title}" for ${targetDate}` }] };
  }
);

server.tool(
  "toggle_todo",
  "Mark a todo as complete or incomplete",
  { todoId: z.string().describe("Todo ID") },
  async ({ todoId }) => {
    const { data: todo } = await supabase.from("todos").select("*").eq("id", todoId).single();
    if (!todo) return { content: [{ type: "text", text: "Todo not found." }] };

    const { error } = await supabase.from("todos").update({ completed: !todo.completed }).eq("id", todoId);
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

    return { content: [{ type: "text", text: `✅ "${todo.title}" marked as ${!todo.completed ? "complete" : "incomplete"}.` }] };
  }
);

server.tool(
  "delete_todo",
  "Delete a todo",
  { todoId: z.string().describe("Todo ID") },
  async ({ todoId }) => {
    const { error } = await supabase.from("todos").delete().eq("id", todoId);
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: `✅ Todo deleted.` }] };
  }
);

// ===== PROGRESS =====

server.tool("get_progress", "Get progress overview for the active period", {}, async () => {
  const period = await getActivePeriod();
  if (!period) return { content: [{ type: "text", text: "No active period found." }] };

  const { data: goals } = await supabase
    .from("goals")
    .select("*, tactics(*)")
    .eq("user_id", USER_ID)
    .eq("period_id", period.id);

  const { data: todos } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", USER_ID)
    .gte("date", period.start_date)
    .lte("date", period.end_date);

  const { data: scores } = await supabase
    .from("weekly_scores")
    .select("*")
    .eq("user_id", USER_ID)
    .eq("period_id", period.id)
    .order("week_number");

  const now = new Date();
  const start = new Date(period.start_date);
  const end = new Date(period.end_date);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const daysPassed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, totalDays - daysPassed);

  const totalGoals = goals?.length || 0;
  const avgProgress = totalGoals > 0
    ? Math.round((goals || []).reduce((sum: number, g: any) => sum + (g.progress || 0), 0) / totalGoals)
    : 0;

  const totalTodos = todos?.length || 0;
  const completedTodos = (todos || []).filter((t: any) => t.completed).length;
  const executionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  const goalLines = (goals || []).map((g: any) => {
    const t = g.tactics || [];
    const done = t.filter((x: any) => x.completed).length;
    return `  🎯 ${g.title}: ${g.progress}% (${done}/${t.length} tactics)`;
  });

  const scoreLines = (scores || []).map((s: any) =>
    `  Week ${s.week_number}: ${s.execution_score}%${s.notes ? ` - ${s.notes}` : ""}`
  );

  const text = [
    `📊 Progress Overview`,
    `Period: ${period.start_date} → ${period.end_date}`,
    `Days: ${daysPassed} passed, ${daysRemaining} remaining of ${totalDays}`,
    ``,
    `Goals (${totalGoals}):`,
    ...goalLines,
    `Average Progress: ${avgProgress}%`,
    ``,
    `Execution:`,
    `Todos: ${completedTodos}/${totalTodos} completed (${executionRate}%)`,
    ``,
    `Weekly Scores:`,
    ...(scoreLines.length > 0 ? scoreLines : ["  No scores yet"]),
  ].join("\n");

  return { content: [{ type: "text", text }] };
});

// ===== WEEKLY SCORES =====

server.tool(
  "save_weekly_score",
  "Save or update a weekly execution score",
  {
    weekNumber: z.number().describe("Week number (1-12)"),
    score: z.number().describe("Execution score (0-100)"),
    notes: z.string().optional().describe("Reflection notes"),
  },
  async ({ weekNumber, score, notes }) => {
    const period = await getActivePeriod();
    if (!period) return { content: [{ type: "text", text: "No active period found." }] };

    const startDate = new Date(period.start_date);
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Check if score exists
    const { data: existing } = await supabase
      .from("weekly_scores")
      .select("id")
      .eq("user_id", USER_ID)
      .eq("period_id", period.id)
      .eq("week_number", weekNumber)
      .single();

    if (existing) {
      await supabase
        .from("weekly_scores")
        .update({ execution_score: score, notes: notes || "" })
        .eq("id", existing.id);
      return { content: [{ type: "text", text: `✅ Updated Week ${weekNumber} score: ${score}%` }] };
    }

    const { error } = await supabase.from("weekly_scores").insert({
      user_id: USER_ID,
      period_id: period.id,
      week_number: weekNumber,
      week_start_date: weekStart.toISOString().slice(0, 10),
      week_end_date: weekEnd.toISOString().slice(0, 10),
      execution_score: score,
      notes: notes || "",
    });

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

    return { content: [{ type: "text", text: `✅ Saved Week ${weekNumber} score: ${score}%` }] };
  }
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("DayCraft MCP Server running");
