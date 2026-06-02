"use client";

import * as React from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { useRequireAuth } from "@/lib/use-async";

/**
 * App shell. The frame (sidebar + topbar rails) paints immediately so there's
 * no full-screen blank flash; the data-dependent shell content and page
 * children mount only once the session token has hydrated (`ready`), which
 * avoids firing requests with no token. `useRequireAuth` still redirects to
 * /login when there is genuinely no token (Task 0130 / PERF1).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const ready = useRequireAuth();
  return (
    <div className="flex min-h-screen bg-background">
      {ready ? (
        <Sidebar />
      ) : (
        <aside className="hidden md:flex w-60 shrink-0 border-r bg-card/40" aria-hidden />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        {ready ? (
          <Topbar />
        ) : (
          <header className="sticky top-0 z-30 h-12 border-b bg-background/80 backdrop-blur-md" aria-hidden />
        )}
        <main className="flex-1 px-4 md:px-8 py-6 max-w-7xl w-full mx-auto">
          {ready ? (
            children
          ) : (
            <div className="text-sm text-muted-foreground">Loading session…</div>
          )}
        </main>
      </div>
    </div>
  );
}
