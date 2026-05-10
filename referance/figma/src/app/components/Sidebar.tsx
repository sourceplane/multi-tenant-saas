import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Package,
  Rocket,
  Activity,
  CreditCard,
  Settings,
  ChevronLeft
} from "lucide-react";
import { cn } from "../lib/utils";
import { useState } from "react";

const navItems = [
  { path: "/", icon: Package, label: "Catalog" },
  { path: "/runs", icon: Activity, label: "Runs" },
  { path: "/deployments", icon: Rocket, label: "Deployments" },
  { path: "/repositories", icon: LayoutDashboard, label: "Repositories" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="h-14 border-b border-sidebar-border flex items-center justify-between px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-sidebar-primary rounded flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-semibold text-sm">O</span>
            </div>
            <span className="font-semibold text-sidebar-foreground">Orun</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-sidebar-accent rounded transition-colors"
        >
          <ChevronLeft className={cn(
            "w-4 h-4 text-sidebar-foreground transition-transform",
            collapsed && "rotate-180"
          )} />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className={cn(
          "px-3 py-2 text-xs text-sidebar-foreground/60",
          collapsed && "text-center"
        )}>
          {collapsed ? "v1" : "Orun v1.0.0"}
        </div>
      </div>
    </div>
  );
}
