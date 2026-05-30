import { createHashRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { Goals } from "./components/Goals";
import { Calendar } from "./components/Calendar";
import { Scorecard } from "./components/Scorecard";
import { Analytics } from "./components/Analytics";

export const router = createHashRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "goals", Component: Goals },
      { path: "calendar", Component: Calendar },
      { path: "scorecard", Component: Scorecard },
      { path: "analytics", Component: Analytics },
    ],
  },
]);
