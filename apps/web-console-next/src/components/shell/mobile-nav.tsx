"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavContent } from "./sidebar";

/**
 * Mobile navigation drawer. The desktop sidebar is `hidden md:flex`; on small
 * screens this hamburger opens the same nav body inside a left-anchored Sheet.
 * Closes on link navigation via `NavContent`'s `onNavigate`.
 */
export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </SheetTrigger>
      <SheetContent side="left" className="px-1">
        <SheetHeader className="px-3 pt-1">
          <SheetTitle className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-primary/40 grid place-items-center text-primary-foreground text-[10px] font-bold">
              S
            </span>
            Sourceplane
          </SheetTitle>
        </SheetHeader>
        <NavContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
