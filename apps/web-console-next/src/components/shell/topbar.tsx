"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Sun, Moon, LogOut, User2, Command as CommandIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { ScopeSwitcher } from "./scope-switcher";
import { MobileNav } from "./mobile-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/session";
import { usePalette } from "./command-palette";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export function Topbar() {
  const { token, target, isLocked, setToken } = useSession();
  const palette = usePalette();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md">
      <MobileNav />
      <ScopeSwitcher />

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => palette.open()} className="h-8 gap-2">
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs text-muted-foreground">Search…</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            <CommandIcon className="h-3 w-3" /> K
          </kbd>
        </Button>

        <Badge variant={isLocked ? "secondary" : "outline"} className="hidden md:inline-flex">
          {isLocked ? `locked · ${target.name}` : `target · ${target.name}`}
        </Badge>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Account menu">
              <User2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => router.push("/orgs")}>Organizations</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                setToken(null);
                router.push("/login");
              }}
            >
              <LogOut className="h-4 w-4 opacity-70" /> Logout
            </DropdownMenuItem>
            {!token && (
              <DropdownMenuItem onSelect={() => router.push("/login")}>Sign in</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
