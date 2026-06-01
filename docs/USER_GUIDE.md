# DayCraft 使用说明

DayCraft 是一个基于 12 Week Year 方法的个人目标和执行管理工具。当前版本支持账号登录、云端同步、目标和战术管理、日历排程、周度 Scorecard、Analytics，以及移动端更新提醒。

## 访问入口

- Web/PWA: `https://daycraft-six.vercel.app/#/`
- 本地开发: `http://127.0.0.1:3000/#/`
- Android APK: 使用应用内更新提醒下载，或通过 `public/version.json` 中的 `apkUrl` 下载。

## 登录和注册

DayCraft 当前使用 Supabase Auth 的邮箱密码登录。

### 注册

1. 打开应用后，在登录页点击 `Sign Up`。
2. 输入邮箱和密码，密码长度至少 6 位。
3. 如果 Supabase 项目开启了邮箱确认，页面会提示先检查邮箱并完成确认。
4. 如果 Supabase 项目关闭了邮箱确认，注册成功后会直接进入应用。

### 登录

1. 在登录页输入已注册邮箱和密码。
2. 登录成功后，应用会加载云端数据。
3. 如果 token 过期，应用会自动使用 refresh token 换新 token。
4. 如果 refresh token 也失效，需要重新登录。

### 登出

点击导航栏里的登出按钮后，本地 session 会清空，页面回到登录页。

## 数据同步情况

当前核心业务数据存储在 Supabase，前端使用轻量 fetch client 直接调用 Supabase Auth 和 REST API。

### 已同步到 Supabase 的数据

- `periods`: 周期开始日期、结束日期、是否 active。
- `goals`: 目标标题、描述、进度、所属周期。
- `tactics`: 战术标题、完成状态、所属目标、due week。
- `todos`: 日历任务标题、日期、完成状态、关联目标和战术。
- `weekly_scores`: 每周执行分数、周起止日期、复盘 notes、所属周期。

所有这些表都按 `user_id` 写入和读取。数据库侧需要继续保持 RLS 策略，确保用户只能访问自己的记录。

### 仍在本地的辅助数据

日历事件的以下元数据当前存在浏览器 `localStorage`，key 为 `daycraft-calendar-event-meta`：

- 开始时间
- 结束时间
- 事件类型
- 事件颜色

这意味着同一个账号换设备后，任务本身会同步，但日历时间段、颜色和类型可能不会完整同步。后续应把这些字段迁移进 Supabase。

## 主要功能

### Dashboard

Dashboard 用于查看当前周期概览，包括目标进度、执行情况和近期任务。建议每天先从这里确认当天重点。

### Goals

Goals 用于创建目标和 tactics。

建议流程：

1. 先创建当前周期。
2. 添加 1 到 3 个最重要目标。
3. 给每个目标拆 tactics。
4. 给 tactics 设置对应周数。
5. 完成 tactics 后，目标进度会自动计算。

### Calendar

Calendar 用于安排和管理每日任务。

支持三种视图：

- Day: 查看单日时间网格。
- Week: 查看一周时间网格。
- Month: 按月份查看每天任务列表。

创建任务：

1. 点击 `Add task`，或在 Day/Week 时间网格中点击时间段。
2. 在 Day/Week 视图中拖拽时间网格，可以直接创建指定时长的任务。
3. 填写任务标题。
4. 可选择事件类型、颜色、关联目标、关联 tactic。
5. 点击 `Create task`。

任务显示规则：

- Day/Week 视图中，任务高度会按开始和结束时间计算。
- 30 分钟任务显示为半小时高度。
- 5 小时任务显示为 5 小时高度。
- Month 视图中，每天会列出 `开始时间 + 任务名称`。

如果创建任务失败，面板会显示明确错误，例如登录过期或数据库写入失败。

### Scorecard

Scorecard 用于每周复盘执行分数。当前周期不再固定只能是 12 周，应用会根据周期开始和结束日期计算周数。

建议每周填写：

- 本周完成率
- 复盘 notes
- 下周调整点

### Analytics

Analytics 用于查看执行趋势、目标完成情况和预测。它依赖 goals、tactics、todos 和 weekly scores 的数据质量。

### Agents

Agents 页面用于预留 AI agent 集成能力。当前它主要是管理入口，后续可以接入外部 agent、MCP server 或后台任务，让 AI 在不打开 App 的情况下记录任务、更新目标或生成复盘。

## 移动端更新

当前移动端更新逻辑依赖 `public/version.json`：

```json
{
  "version": "1.0.3",
  "apkUrl": "https://github.com/Hongjin-Lin/daycraft/raw/master/android/app/build/outputs/apk/debug/app-debug.apk"
}
```

移动端会比较本地版本和 GitHub 上的远端版本：

- 远端版本高于本地版本时，弹出更新提醒。
- 相同版本或远端版本更低时，不弹提醒。
- Android、移动网页和 PWA 都会进入更新检查逻辑。

Web/PWA 更新方式：

1. 等 Vercel 完成部署。
2. 手机浏览器刷新页面。
3. 如果是添加到主屏幕的 PWA，关闭后台后重新打开。

Android APK 更新方式：

1. 应用内看到更新提醒后点击下载。
2. 下载新的 APK。
3. Android 可能要求允许浏览器安装未知来源应用。
4. 安装完成后重新打开 DayCraft。

## 常见问题

### 点击 Create task 没反应

当前版本已经修复这个问题。真实原因通常是 Supabase 返回了 auth 或数据库错误。现在表单会显示错误信息。

如果看到 `Your session expired. Please sign in again.`，重新登录即可。

### 注册后不能直接进入应用

这取决于 Supabase 是否开启邮箱确认。如果开启，必须先在邮箱里确认账号，再回到应用登录。

### 换手机后日历颜色或时间不一致

任务标题和日期会从 Supabase 同步，但日历事件时间、颜色、类型仍在本地 localStorage。后续需要数据库迁移来彻底解决。

### 页面仍是旧版本

可能是 Vercel 或浏览器缓存。先刷新页面；PWA 需要关闭后台后重新打开。Android APK 需要安装新包。

## 未来优化方向

### 1. 完整数据库化 Calendar meta

把 `startTime`、`endTime`、`kind`、`color` 从 localStorage 迁移到 Supabase。建议新增 `calendar_event_meta` 表，或给 `todos` 表增加对应字段。

### 2. 引入正式 Supabase client

当前使用轻量 fetch client，能工作但维护成本较高。后续可以切回 `@supabase/supabase-js`，统一 auth refresh、error handling、realtime subscription。

### 3. 强化认证体验

建议补充：

- 忘记密码
- 邮箱确认后的回跳处理
- session 失效后的全局提示
- 登录错误的中文化展示

### 4. 真正的实时同步

当前 `subscribeToChanges` 还是 placeholder。后续可以接入 Supabase Realtime，让多设备同时打开时能自动同步更新。

### 5. AI Agent 写入接口

为 AI agent 预留稳定接口：

- 创建 todo
- 更新 todo 完成状态
- 创建 weekly reflection
- 查询今天任务
- 查询当前目标和 tactics

建议通过 MCP server 暴露这些能力，并让 MCP server 直接调用 Supabase，而不是依赖浏览器 localStorage。

### 6. 移动端发布流程

当前 APK 是 debug build。后续应该建立正式 Android release 流程：

- release keystore
- versionCode/versionName 自动递增
- GitHub Release 上传 APK
- `version.json` 指向 release asset
- 可选接入 Play Store 内测渠道

### 7. 测试覆盖

建议补充：

- Auth token refresh 单元测试
- Calendar 创建任务集成测试
- Month/Week 视图截图回归测试
- Supabase RLS 策略检查
- 移动端 390px 宽度视觉检查

## 开发命令

```bash
npm i
npm run dev
npm run typecheck
npm run test:period
npm run build
```

Android 同步和构建：

```bash
npm run build
npx cap sync android
cd android
gradlew.bat assembleDebug
```

如果 Windows 上没有配置 Java，可临时使用 Android Studio 自带 JBR：

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
cd android
.\gradlew.bat assembleDebug
```
