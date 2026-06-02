"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { SessionProvider } from "@/lib/session";
import { ToastProvider } from "@/components/ui/toast";
import { CommandPaletteProvider } from "@/components/shell/command-palette";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SessionProvider>
        <ToastProvider>
          <TooltipProvider delayDuration={200}>
            <CommandPaletteProvider>{children}</CommandPaletteProvider>
          </TooltipProvider>
        </ToastProvider>
      </SessionProvider>
    </NextThemesProvider>
  );
}
