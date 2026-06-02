/**
 * Pure command registry for the Cmd-K palette (Task 0127 / U11).
 *
 * Kept dependency-free (no React, no `next/*`, no DOM, no icon imports) so the
 * command-set composition can be unit-tested in isolation. The React wiring
 * (icon rendering, navigation, action handlers, registration context) lives in
 * `command-palette.tsx`, which maps each descriptor's `kind` onto a concrete
 * effect.
 *
 * Extensibility: `command-palette.tsx` exposes a registration context so any
 * page/product area can contribute extra descriptors at mount time. The base
 * set is produced here by `buildBaseCommands(ctx)`; extra descriptors are
 * merged and ordered by `composeCommands(base, extra)`. New product areas add
 * commands without editing this file.
 */

/** Stable group ordering for the palette. */
export const COMMAND_GROUPS = ["Navigation", "Create", "Target", "Session"] as const;
export type CommandGroup = (typeof COMMAND_GROUPS)[number];

/**
 * A command descriptor is pure data. `kind` tells the renderer what to do:
 *   - `navigate` → router.push(`to`)
 *   - `action`   → invoke the handler registered under `actionId`
 *   - `target`   → switch the API target named `targetName`
 */
export type CommandDescriptor =
  | {
      id: string;
      label: string;
      group: CommandGroup;
      kind: "navigate";
      to: string;
      /** lucide icon name (resolved in the renderer); optional. */
      icon?: string;
      /** extra fuzzy-search terms beyond the label. */
      keywords?: string[];
      shortcut?: string;
    }
  | {
      id: string;
      label: string;
      group: CommandGroup;
      kind: "action";
      actionId: "logout";
      icon?: string;
      keywords?: string[];
      shortcut?: string;
    }
  | {
      id: string;
      label: string;
      group: CommandGroup;
      kind: "target";
      targetName: string;
      icon?: string;
      keywords?: string[];
      shortcut?: string;
    };

export interface CommandContext {
  orgSlug: string | null;
  projectSlug: string | null;
  /** when true, the target switcher is hidden (single locked deploy env). */
  isLocked: boolean;
  /** available API targets for the Target group (empty when locked). */
  targets: { name: string }[];
}

/**
 * Build the always-available base command set for the current URL scope.
 *
 * Scope-aware: org-scoped commands only appear when an org slug is present;
 * project-scoped commands only when both org and project slugs are present.
 * This mirrors the sidebar/scope-switcher invariant that scope comes from the
 * URL, never from local state.
 */
export function buildBaseCommands(ctx: CommandContext): CommandDescriptor[] {
  const out: CommandDescriptor[] = [];
  const orgBase = ctx.orgSlug ? `/orgs/${ctx.orgSlug}` : null;
  const projectBase =
    ctx.orgSlug && ctx.projectSlug ? `/orgs/${ctx.orgSlug}/projects/${ctx.projectSlug}` : null;

  // --- Navigation -----------------------------------------------------------
  out.push({
    id: "nav.orgs",
    label: "Switch organization",
    group: "Navigation",
    kind: "navigate",
    to: "/orgs",
    icon: "Building2",
    keywords: ["org", "organization", "switch", "tenant"],
    shortcut: "O",
  });
  out.push({
    id: "nav.account.security",
    label: "Security activity",
    group: "Navigation",
    kind: "navigate",
    to: "/account/security",
    icon: "ShieldCheck",
    keywords: ["security", "sessions", "activity", "login", "account"],
  });

  // Note: account profile, notification preferences, usage & quota, and org
  // settings commands are contributed by their respective U11 slices alongside
  // the routes they navigate to, so the palette never points at a 404.
  if (orgBase) {
    out.push(
      navItem("nav.projects", "Projects", `${orgBase}/projects`, "FolderKanban", ["project"]),
      navItem("nav.members", "Members", `${orgBase}/members`, "Users", ["member", "people", "team"]),
      navItem("nav.invitations", "Invitations", `${orgBase}/invitations`, "Mail", ["invite"]),
      navItem("nav.usage", "Usage & quota", `${orgBase}/usage`, "Gauge", [
        "usage",
        "quota",
        "metering",
        "limit",
        "consumption",
      ]),
      navItem("nav.api-keys", "API keys", `${orgBase}/api-keys`, "KeyRound", ["key", "token", "api"]),
      navItem("nav.webhooks", "Webhooks", `${orgBase}/webhooks`, "Webhook", ["webhook", "endpoint"]),
      navItem("nav.config", "Config", `${orgBase}/config`, "Settings", ["config", "settings", "flags"]),
      navItem("nav.audit", "Audit log", `${orgBase}/audit`, "ScrollText", ["audit", "history", "events"]),
      navItem("nav.billing", "Billing", `${orgBase}/billing`, "Receipt", ["billing", "plan", "invoice"]),
    );
  }
  if (projectBase) {
    out.push(
      navItem("nav.environments", "Environments", `${projectBase}/environments`, "Boxes", ["env", "environment"]),
    );
  }

  // --- Create ---------------------------------------------------------------
  out.push({
    id: "create.org",
    label: "Create organization",
    group: "Create",
    kind: "navigate",
    to: "/orgs?new=1",
    icon: "PlusCircle",
    keywords: ["new", "create", "org"],
  });
  if (orgBase) {
    out.push(
      navItem("create.project", "Create project", `${orgBase}/projects?new=1`, "PlusCircle", ["new", "project"], "Create"),
      navItem("create.invitation", "Create invitation", `${orgBase}/invitations?new=1`, "UserPlus", ["invite", "new"], "Create"),
      navItem("create.api-key", "Create API key", `${orgBase}/api-keys?new=1`, "KeyRound", ["key", "new"], "Create"),
    );
  }
  if (projectBase) {
    out.push(
      navItem("create.environment", "Create environment", `${projectBase}/environments?new=1`, "PlusCircle", ["env", "new"], "Create"),
    );
  }

  // --- Target ---------------------------------------------------------------
  if (!ctx.isLocked) {
    for (const t of ctx.targets) {
      out.push({
        id: `target.${t.name}`,
        label: `Switch target: ${t.name}`,
        group: "Target",
        kind: "target",
        targetName: t.name,
        icon: "Globe",
        keywords: ["target", "env", "stage", "prod", t.name],
      });
    }
  }

  // --- Session --------------------------------------------------------------
  out.push({
    id: "session.logout",
    label: "Logout",
    group: "Session",
    kind: "action",
    actionId: "logout",
    icon: "LogOut",
    keywords: ["sign out", "log out", "logout"],
  });

  return out;
}

function navItem(
  id: string,
  label: string,
  to: string,
  icon: string,
  keywords: string[],
  group: CommandGroup = "Navigation",
): CommandDescriptor {
  return { id, label, group, kind: "navigate", to, icon, keywords };
}

/**
 * Merge base + page-contributed descriptors. Later registrations override an
 * earlier descriptor with the same `id` (so a page can refine a base command),
 * and the result is grouped in stable `COMMAND_GROUPS` order while preserving
 * insertion order within a group.
 */
export function composeCommands(
  base: CommandDescriptor[],
  extra: CommandDescriptor[],
): CommandDescriptor[] {
  const byId = new Map<string, CommandDescriptor>();
  for (const c of base) byId.set(c.id, c);
  for (const c of extra) byId.set(c.id, c);
  const merged = [...byId.values()];

  return merged.sort((a, b) => {
    const ga = COMMAND_GROUPS.indexOf(a.group);
    const gb = COMMAND_GROUPS.indexOf(b.group);
    if (ga !== gb) return ga - gb;
    // stable within group: fall back to insertion order
    return merged.indexOf(a) - merged.indexOf(b);
  });
}

/** Group composed commands for rendering, dropping empty groups. */
export function groupCommands(
  commands: CommandDescriptor[],
): { group: CommandGroup; items: CommandDescriptor[] }[] {
  return COMMAND_GROUPS.map((group) => ({
    group,
    items: commands.filter((c) => c.group === group),
  })).filter((g) => g.items.length > 0);
}
