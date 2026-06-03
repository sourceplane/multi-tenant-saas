"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  FolderKanban,
  Boxes,
  KeyRound,
  Settings,
  SlidersHorizontal,
  ScrollText,
  Receipt,
  Users,
  Mail,
  Webhook,
  ShieldCheck,
  Bell,
  Gauge,
  User2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { buildNavSections, isLinkActive } from "./nav-items";
import { buildSettingsNav, flattenSettingsNav, isSettingsLinkActive } from "./settings-nav";
import { SidebarAccount } from "./sidebar-account";

const ICONS: Record<string, LucideIcon> = {
  Building2,
  FolderKanban,
  Boxes,
  KeyRound,
  Settings,
  SlidersHorizontal,
  ScrollText,
  Receipt,
  Users,
  Mail,
  Webhook,
  ShieldCheck,
  Bell,
  Gauge,
  User2,
};

/**
 * Shared nav body (sections + links), rendered by both the desktop sidebar and
 * the mobile Sheet drawer. `onNavigate` lets the drawer close itself on click.
 *
 * `mobile` switches to a touch layout: sections are flat (no collapse toggles),
 * rows are ≥44px with press feedback, and type is a touch larger.
 */
export function NavContent({
  onNavigate,
  mobile = false,
}: {
  onNavigate?: (() => void) | undefined;
  mobile?: boolean;
}) {
  const params = useParams<{ orgSlug?: string; projectSlug?: string }>();
  const pathname = usePathname();
  const orgSlug = params?.orgSlug ?? null;

  // Within `/settings`, the sidebar swaps from the product nav to a dedicated
  // settings nav (a flat list under a back-to-app header), mirroring how Vercel
  // turns the whole left rail into a settings menu.
  const inSettings = !!orgSlug && !!pathname && pathname.startsWith(`/orgs/${orgSlug}/settings`);
  if (inSettings) {
    return (
      <SettingsNavContent
        orgSlug={orgSlug}
        pathname={pathname}
        onNavigate={onNavigate}
        mobile={mobile}
      />
    );
  }

  const sections = buildNavSections({
    orgSlug,
    projectSlug: params?.projectSlug ?? null,
  });

  return (
    <nav className={cn("overflow-y-auto scrollbar-thin px-2 pb-4", mobile ? "space-y-5" : "space-y-6")}>
      {sections.map((section) => (
        <Section key={section.id} label={section.label} mobile={mobile}>
          {section.links.map((link) => {
            const Icon = ICONS[link.icon] ?? Settings;
            return (
              <SidebarLink
                key={link.href}
                href={link.href}
                icon={Icon}
                active={isLinkActive(link.href, pathname)}
                onClick={onNavigate}
                mobile={mobile}
              >
                {link.label}
              </SidebarLink>
            );
          })}
        </Section>
      ))}
    </nav>
  );
}

/**
 * Settings-scoped sidebar: a "‹ Settings" back row that returns to the product
 * area, followed by the flat settings link list with the active item highlighted.
 */
function SettingsNavContent({
  orgSlug,
  pathname,
  onNavigate,
  mobile = false,
}: {
  orgSlug: string;
  pathname: string;
  onNavigate?: (() => void) | undefined;
  mobile?: boolean;
}) {
  const links = flattenSettingsNav(buildSettingsNav(orgSlug));
  return (
    <nav className="overflow-y-auto scrollbar-thin px-2 pb-4">
      <Link
        href={`/orgs/${orgSlug}/projects`}
        {...(onNavigate ? { onClick: onNavigate } : {})}
        className={cn(
          "mb-2 flex items-center gap-1 rounded-md font-medium text-muted-foreground transition-colors hover:text-foreground",
          mobile ? "min-h-11 px-3 text-base active:bg-accent/60" : "px-2 py-1.5 text-sm",
        )}
      >
        <ChevronLeft className={mobile ? "h-5 w-5" : "h-4 w-4"} />
        Settings
      </Link>
      <div className="space-y-0.5">
        {links.map((link) => {
          const active = isSettingsLinkActive(link, pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              {...(onNavigate ? { onClick: onNavigate } : {})}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center rounded-md transition-colors",
                mobile ? "min-h-11 px-3 text-[15px] active:bg-accent" : "px-2 py-1.5 text-sm",
                active
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card/40">
      <div className="px-4 py-4 flex items-center gap-2">
        <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-primary/40 grid place-items-center text-primary-foreground text-xs font-bold">
          S
        </div>
        <div className="text-sm font-semibold tracking-tight">Sourceplane</div>
      </div>

      <NavContent />

      <div className="mt-auto border-t p-2">
        <SidebarAccount />
      </div>
    </aside>
  );
}

function Section({
  label,
  children,
  mobile = false,
}: {
  label: string;
  children: React.ReactNode;
  mobile?: boolean;
}) {
  const [open, setOpen] = React.useState(true);

  // On mobile the collapse affordance is friction, not value — render a static
  // section label and always show the links.
  if (mobile) {
    return (
      <div>
        <div className="px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 space-y-0.5">{children}</div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", !open && "-rotate-90")} />
      </button>
      {open && <div className="mt-1 space-y-0.5">{children}</div>}
    </div>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  active,
  onClick,
  mobile = false,
  children,
}: {
  href: string;
  icon: LucideIcon;
  active: boolean;
  onClick?: (() => void) | undefined;
  mobile?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      {...(onClick ? { onClick } : {})}
      className={cn(
        "flex items-center rounded-md transition-colors",
        mobile ? "min-h-11 gap-3 px-3 text-[15px] active:bg-accent" : "gap-2 px-2 py-1.5 text-sm",
        active
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <Icon className={cn("opacity-80", mobile ? "h-5 w-5" : "h-4 w-4")} />
      <span className="truncate">{children}</span>
    </Link>
  );
}
