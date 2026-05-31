# DayCraft MCP Server

This MCP server lets trusted local AI agents operate DayCraft without opening the app.

## Local configuration

Set these values in the repository `.env` file or in the shell environment that launches MCP:

```bash
DAYCRAFT_SUPABASE_URL=https://your-project-id.supabase.co
DAYCRAFT_SUPABASE_SERVICE_KEY=your-service-role-key
DAYCRAFT_USER_ID=your-supabase-user-id
```

`DAYCRAFT_SUPABASE_SERVICE_KEY` is a Supabase service-role key. Keep this server local and only expose it to trusted agents.

## Agent workflows

- `agent_help` describes available workflows and safety assumptions.
- `create_period` creates a period with either a custom end date or the default 12-week range.
- `update_period` changes the active period date range.
- `create_goal`, `add_tactic`, `add_todo`, and `save_weekly_score` let agents log planning work directly.
- `get_progress` gives an agent-readable summary for handoff.
