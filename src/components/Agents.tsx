import { Bot, CheckCircle2, ClipboardList, Database, KeyRound, ShieldCheck, Terminal } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

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
  const { language } = useLanguage();
  const copy = language === 'zh'
    ? {
        title: 'Agent 管理',
        description: '管理 MCP 能力，让 AI agent 不打开 App UI 也能记录目标、策略、任务、周期变更和周复盘。',
        prepared: '本地 MCP 服务已准备',
        credentials: '凭据保存在本地环境文件中，不会提交到仓库。',
        endpoint: 'MCP 端点',
        endpointBody: '应用包含 mcp-server/ 本地 MCP 服务。Agent 可以调用工具，而不是抓取 UI。',
        boundaries: '边界',
        boundariesBody: '当前工具只操作 DayCraft 规划数据。外部 agent 写入前仍需要本地凭据。',
        dataSource: '数据源',
        dataSourceBody: 'MCP 会写入 Web App 使用的同一套 Supabase 表，记录会在下一次实时同步或刷新后出现。',
        toolGroups: '可用工具组',
        requiredEnv: '必需环境变量',
        envBody: '这些值在本地存在后，Codex 或其他支持 MCP 的 agent 就能通过本仓库配置操作 DayCraft。',
      }
    : {
        title: 'Agent management',
        description: 'Manage the MCP surface that lets AI agents record goals, tactics, todos, period changes, and weekly scores without opening the app UI.',
        prepared: 'Local MCP server prepared',
        credentials: 'Credentials stay in local env files and are not committed.',
        endpoint: 'MCP endpoint',
        endpointBody: 'The app ships with a local MCP server under mcp-server/. Agents can call tools instead of scraping the UI.',
        boundaries: 'Boundaries',
        boundariesBody: 'Current tools are limited to DayCraft planning data. External agents still need explicit local credentials before they can write data.',
        dataSource: 'Data source',
        dataSourceBody: 'MCP writes directly to Supabase with the same tables used by the web app, so records appear after the next realtime sync or refresh.',
        toolGroups: 'Available tool groups',
        requiredEnv: 'Required env',
        envBody: 'After these values exist locally, Codex or another MCP-capable agent can operate DayCraft through the server configuration in this repo.',
      };
  const groupTitles = language === 'zh'
    ? { Planning: '规划', Execution: '执行', Review: '复盘' }
    : { Planning: 'Planning', Execution: 'Execution', Review: 'Review' };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
              <Bot className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950">{copy.title}</h2>
            <p className="mt-2 hidden text-sm leading-6 text-gray-600 sm:block">{copy.description}</p>
          </div>
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              {copy.prepared}
            </div>
            <p className="mt-1 hidden text-xs leading-5 sm:block">{copy.credentials}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AgentPanel icon={<Terminal className="h-5 w-5" />} title={copy.endpoint}>
          <p className="text-sm leading-6 text-gray-600">
            {copy.endpointBody}
          </p>
        </AgentPanel>
        <AgentPanel icon={<ShieldCheck className="h-5 w-5" />} title={copy.boundaries}>
          <p className="text-sm leading-6 text-gray-600">
            {copy.boundariesBody}
          </p>
        </AgentPanel>
        <AgentPanel icon={<Database className="h-5 w-5" />} title={copy.dataSource}>
          <p className="text-sm leading-6 text-gray-600">
            {copy.dataSourceBody}
          </p>
        </AgentPanel>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-700" />
            <h3 className="text-lg font-semibold text-gray-950">{copy.toolGroups}</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {toolGroups.map(group => (
              <div key={group.title} className="rounded-md border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-950">{groupTitles[group.title as keyof typeof groupTitles]}</h4>
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
            <h3 className="text-lg font-semibold text-gray-950">{copy.requiredEnv}</h3>
          </div>
          <div className="space-y-2">
            {setupItems.map(item => (
              <div key={item} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700">
                {item}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-gray-600">
            {copy.envBody}
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
