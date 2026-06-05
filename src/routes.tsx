import { createHashRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { Goals } from "./components/Goals";
import { Calendar } from "./components/Calendar";
import { Kanban } from "./components/Kanban";
import { Nutrition } from "./components/Nutrition";
import { Scorecard } from "./components/Scorecard";
import { Analytics } from "./components/Analytics";
import { Agents } from "./components/Agents";

export const router = createHashRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "goals", Component: Goals },
      { path: "calendar", Component: Calendar },
      { path: "kanban", Component: Kanban },
      { path: "nutrition", Component: Nutrition },
      { path: "scorecard", Component: Scorecard },
      { path: "analytics", Component: Analytics },
      { path: "agents", Component: Agents },
    ],
  },
]);
