import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/layouts/RootLayout";
import { CatalogPage } from "./pages/CatalogPage";
import { ComponentDetailPage } from "./pages/ComponentDetailPage";
import { RunsPage } from "./pages/RunsPage";
import { DeploymentsPage } from "./pages/DeploymentsPage";
import { RepositoriesPage } from "./pages/RepositoriesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: CatalogPage },
      { path: "components/:componentId", Component: ComponentDetailPage },
      { path: "runs", Component: RunsPage },
      { path: "deployments", Component: DeploymentsPage },
      { path: "repositories", Component: RepositoriesPage },
      { path: "settings", Component: SettingsPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
