import { Search, ChevronDown, User } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface TopBarProps {
  onCommandOpen: () => void;
}

export function TopBar({ onCommandOpen }: TopBarProps) {
  return (
    <div className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onCommandOpen}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-muted/50 hover:bg-muted text-sm text-muted-foreground transition-colors w-72"
        >
          <Search className="w-4 h-4" />
          <span>Search components, runs, repos...</span>
          <kbd className="ml-auto px-1.5 py-0.5 text-xs bg-background rounded border border-border">⌘K</kbd>
        </button>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card hover:bg-accent text-sm transition-colors">
            <span className="text-muted-foreground text-xs">Tenant:</span>
            <span className="font-medium">Acme Corp</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity">
          <User className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
