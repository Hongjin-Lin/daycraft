# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React TypeScript SPA implementing the "12 Week Year" goal-setting methodology. Users create 12-week periods, define goals with tactics, track daily todos, and monitor execution via scorecards and analytics.

## Commands

```bash
npm i              # Install dependencies
npm run dev        # Start Vite dev server on port 3000 (auto-opens browser)
npm run build      # Production build to build/ directory
```

No lint, test, or type-check scripts are configured yet.

## Architecture

### Tech Stack
- **React 18** + **TypeScript** with **Vite** (SWC compiler)
- **Zustand** for state management with localStorage persistence (key: `'12-week-year-storage'`)
- **Tailwind CSS v4** with OKLCH color variables and dark mode support
- **Radix UI** primitives via shadcn/ui component library (70+ components in `src/components/ui/`)
- **Recharts** for data visualization
- **React Router** for client-side routing
- **date-fns** for date manipulation

### Routing (`src/routes.tsx`)
All routes wrapped in `Layout` component (persistent nav bar):
- `/` — Dashboard (KPIs, period overview, goals summary)
- `/goals` — Goal & tactic CRUD with collapsible sections
- `/calendar` — Day/Week/Month views with todo management
- `/scorecard` — Weekly execution score tracking with reflection notes
- `/analytics` — Charts, predictions, heatmaps

### State Management (`src/lib/store.ts`)
Single Zustand store with `persist` middleware. Custom serialization handles Date objects (string ↔ Date conversion).

**Core state**: `periods: WeekPeriod[]`, `todos: Todo[]`, `activePeriodId`, `weeklyScores: WeeklyScore[]`

**Key actions**: `createPeriod()`, `addGoal()`, `addTactic()`, `toggleTactic()`, `addTodo()`, `toggleTodo()`, `saveWeeklyScore()`, `calculateGoalProgress()`

### Data Model (`src/lib/types.ts`)
- **WeekPeriod**: 84-day (12-week) planning period containing Goals
- **Goal**: Has title, description, and Tactics; progress auto-calculated from tactic completion
- **Tactic**: Sub-task of a goal, optionally assigned to a specific week (1-12)
- **Todo**: Daily task, optionally linked to a goal/tactic via `goalId`/`tacticId`
- **WeeklyScore**: Execution score (0-100) per week with notes, tied to a period

### Data Flow
1. User action → Zustand store update (immutable)
2. Components re-render via store subscriptions
3. localStorage auto-persists via middleware
4. Toggling a todo can cascade: checks if linked tactic should complete → recalculates goal progress

### Business Logic
- Goal progress = `(completed_tactics / total_tactics) * 100`
- Execution score = `(completed_todos / total_todos) * 100`, target is 85%
- Analytics predictions extrapolate from current pace vs expected `(days_passed / 84) * 100`

## Path Aliases
`@` maps to `src/` (configured in vite.config.ts). All 30+ Radix UI packages are also aliased in the Vite config.
