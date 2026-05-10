import { Outlet } from "react-router";
import { Sidebar } from "../Sidebar";
import { TopBar } from "../TopBar";
import { CommandPalette } from "../CommandPalette";
import { useState } from "react";

export function RootLayout() {
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <div className="h-screen w-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onCommandOpen={() => setCommandOpen(true)} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
