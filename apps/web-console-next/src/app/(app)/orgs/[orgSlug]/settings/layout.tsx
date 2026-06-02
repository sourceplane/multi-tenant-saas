"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  Building2,
  Users,
  Mail,
  Receipt,
  KeyRound,
  Webhook,
  SlidersHorizontal,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  buildSettingsNav,
  flattenSettingsNav,
  isSettingsLinkActive,
  type SettingsNavLink,
} from "@/components/shell/settings-nav";

const ICONS: Record<string, LucideIcon> = {
  Building2,
  Users,
  Mail,
  Receipt,
  KeyRound,
  Webhook,
  SlidersHorizontal,
  ScrollText,
};

/**
 * Settings shell. Gives every org-administration page a single, cohesive
 * surface: a masthead plus a secondary navigation rail, so the primary sidebar
 * can stay product-focused. This is the modern "settings has its own sidebar"
 * pattern (Stripe / Vercel / Linear). The rail is a sticky vertical list on
 * large screens and a horizontally scrollable pill bar on small ones.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ orgSlug: string }>();
  const pathname = usePathname();
  const orgSlug = params?.orgSlug ?? "";
  const groups = buildSettingsNav(orgSlug);
  const flat = flattenSettingsNav(groups);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {orgSlug}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your organization&apos;s identity, members, billing, and developer integrations.
        </p>
      </header>

      {/* Mobile: horizontal pill bar */}
      <nav
        aria-label="Settings"
        className="lg:hidden -mx-4 flex gap-1 overflow-x-auto scrollbar-thin px-4 pb-2"
      >
        {flat.map((link) => (
          <PillLink key={link.href} link={link} active={isSettingsLinkActive(link, pathname)} />
        ))}
      </nav>

      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        {/* Desktop: sticky vertical rail */}
        <aside className="hidden lg:block">
          <nav aria-label="Settings" className="sticky top-16 space-y-6">
            {groups.map((group) => (
              <div key={group.id} className="space-y-1">
                <div className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.links.map((link) => (
                    <RailLink
                      key={link.href}
                      link={link}
                      active={isSettingsLinkActive(link, pathname)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

function RailLink({ link, active }: { link: SettingsNavLink; active: boolean }) {
  const Icon = ICONS[link.icon] ?? SlidersHorizontal;
  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          active ? "text-primary" : "opacity-70 group-hover:opacity-100",
        )}
      />
      <span className="flex min-w-0 flex-col">
        <span className={cn("truncate", active && "font-medium")}>{link.label}</span>
        <span className="truncate text-[11px] text-muted-foreground/80">{link.description}</span>
      </span>
    </Link>
  );
}

function PillLink({ link, active }: { link: SettingsNavLink; active: boolean }) {
  const Icon = ICONS[link.icon] ?? SlidersHorizontal;
  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-card/40 text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {link.label}
    </Link>
  );
}
