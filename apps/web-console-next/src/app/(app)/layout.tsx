"use client";

import * as React from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { useRequireAuth } from "@/lib/use-async";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const ready = useRequireAuth();
  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Loading session…
      </div>
    );
  }
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 px-4 md:px-8 py-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
