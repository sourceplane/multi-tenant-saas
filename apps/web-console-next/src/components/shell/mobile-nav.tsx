"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Menu, Sun, Moon, LogOut, User2, ShieldCheck } from "lucide-react";
import { useTheme } from "next-themes";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavContent } from "./sidebar";
import { useSession } from "@/lib/session";

/**
 * Mobile navigation drawer. The desktop sidebar is `hidden md:flex`; on small
 * screens this hamburger opens a touch-tuned nav inside a left-anchored Sheet
 * that slides in/out. Closes on link navigation via `NavContent`'s `onNavigate`.
 * A footer keeps theme + logout reachable (the topbar hides them on mobile).
 */
export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setToken } = useSession();
  const { theme, setTheme } = useTheme();
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="md:hidden -ml-1.5 inline-flex h-11 w-11 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="px-0">
        <SheetHeader className="px-4 pt-1">
          <SheetTitle className="flex items-center gap-2 text-base">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-primary to-primary/40 text-[11px] font-bold text-primary-foreground">
              S
            </span>
            Sourceplane
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <NavContent mobile onNavigate={close} />
        </div>

        <div className="mt-auto space-y-0.5 border-t px-2 pt-2 pb-safe">
          <FooterButton
            icon={<User2 className="h-5 w-5 opacity-80" />}
            label="Profile"
            onClick={() => {
              close();
              router.push("/account");
            }}
          />
          <FooterButton
            icon={<ShieldCheck className="h-5 w-5 opacity-80" />}
            label="Security activity"
            onClick={() => {
              close();
              router.push("/account/security");
            }}
          />
          <FooterButton
            icon={
              theme === "dark" ? (
                <Sun className="h-5 w-5 opacity-80" />
              ) : (
                <Moon className="h-5 w-5 opacity-80" />
              )
            }
            label={theme === "dark" ? "Light mode" : "Dark mode"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          />
          <FooterButton
            icon={<LogOut className="h-5 w-5 opacity-80" />}
            label="Logout"
            onClick={() => {
              close();
              setToken(null);
              router.push("/login");
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FooterButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-[15px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground active:bg-accent"
    >
      {icon}
      {label}
    </button>
  );
}
