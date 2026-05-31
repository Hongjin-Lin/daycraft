import { Bot, CheckCircle2, ClipboardList, Database, KeyRound, ShieldCheck, Terminal } from 'lucide-react';

const toolGroups = [
  {
    title: 'Planning',
    tools: ['agent_help', 'create_period', 'update_period', 'create_goal', 'create_tactic'],
  },
  {
    title: 'Execution',
    tools: ['create_todo', 'complete_todo', 'list_todos', 'score_week'],
  },
  {
    title: 'Review',
    tools: ['list_periods', 'list_goals', 'get_scorecard', 'get_analytics'],
  },
];

const setupItems = [
  'DAYCRAFT_SUPABASE_URL or VITE_SUPABASE_URL',
  'DAYCRAFT_SUPABASE_SERVICE_KEY',
  'DAYCRAFT_USER_ID',
];

export function Agents() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
              <Bot className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950">Agent management</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Manage the MCP surface that lets AI agents record goals, tactics, todos, period changes, and weekly scores without opening the app UI.
            </p>
          </div>
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Local MCP server prepared
            </div>
            <p className="mt-1 text-xs leading-5">Credentials stay in local env files and are not committed.</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AgentPanel icon={<Terminal className="h-5 w-5" />} title="MCP endpoint">
          <p className="text-sm leading-6 text-gray-600">
            The app ships with a local MCP server under <span className="font-mono text-xs">mcp-server/</span>. Agents can call tools instead of scraping the UI.
          </p>
        </AgentPanel>
        <AgentPanel icon={<ShieldCheck className="h-5 w-5" />} title="Boundaries">
          <p className="text-sm leading-6 text-gray-600">
            Current tools are limited to DayCraft planning data. External agents still need explicit local credentials before they can write data.
          </p>
        </AgentPanel>
        <AgentPanel icon={<Database className="h-5 w-5" />} title="Data source">
          <p className="text-sm leading-6 text-gray-600">
            MCP writes directly to Supabase with the same tables used by the web app, so records appear after the next realtime sync or refresh.
          </p>
        </AgentPanel>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-700" />
            <h3 className="text-lg font-semibold text-gray-950">Available tool groups</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {toolGroups.map(group => (
              <div key={group.title} className="rounded-md border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-950">{group.title}</h4>
                <div className="mt-3 space-y-2">
                  {group.tools.map(tool => (
                    <div key={tool} className="rounded-md bg-gray-50 px-2.5 py-2 font-mono text-xs text-gray-700">
                      {tool}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-950">Required env</h3>
          </div>
          <div className="space-y-2">
            {setupItems.map(item => (
              <div key={item} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700">
                {item}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-gray-600">
            After these values exist locally, Codex or another MCP-capable agent can operate DayCraft through the server configuration in this repo.
          </p>
        </div>
      </section>
    </div>
  );
}

function AgentPanel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-gray-950">
        <span className="text-blue-700">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
