import { useNavigate } from "react-router";
import { useEffect } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import {
  LayoutDashboard,
  Package,
  Rocket,
  Activity,
  Settings,
  GitBranch,
  Search,
  Zap
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const commands = [
  { path: "/", icon: Package, label: "Catalog", group: "Navigation", description: "View all components" },
  { path: "/runs", icon: Activity, label: "Runs", group: "Navigation", description: "Pipeline run history" },
  { path: "/deployments", icon: Rocket, label: "Deployments", group: "Navigation", description: "Track deployments" },
  { path: "/repositories", icon: LayoutDashboard, label: "Repositories", group: "Navigation", description: "Linked Git repos" },
  { path: "/settings", icon: Settings, label: "Settings", group: "Navigation", description: "Tenant settings" },
  { path: "/components/api-edge-worker", icon: Package, label: "api-edge-worker", group: "Components", description: "API Edge Worker" },
  { path: "/components/web-console", icon: Package, label: "web-console", group: "Components", description: "Web Console" },
  { path: "/components/billing-worker", icon: Package, label: "billing-worker", group: "Components", description: "Billing Worker" },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const handleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  const groups = Array.from(new Set(commands.map(c => c.group)));

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search components, runs, repositories..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map(group => (
          <CommandGroup key={group} heading={group}>
            {commands.filter(c => c.group === group).map((cmd) => (
              <CommandItem
                key={cmd.path}
                onSelect={() => handleSelect(cmd.path)}
              >
                <cmd.icon className="mr-2 h-4 w-4" />
                <div className="flex-1">
                  <span>{cmd.label}</span>
                  {cmd.description && (
                    <p className="text-xs text-muted-foreground">{cmd.description}</p>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
