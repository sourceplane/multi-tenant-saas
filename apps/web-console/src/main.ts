import { TARGETS, IS_LOCKED } from "./api";
import "./style.css";
import {
  createState,
  switchTarget,
  setAuthenticated,
  setManualToken,
  clearAuth,
  selectOrg,
  selectProject,
  clearProject,
  updateDisplayName,
} from "./state";

let state = createState();
let accountView: "profile" | "security" | null = null;

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function h(tag: string, attrs?: Record<string, string>, ...children: (string | HTMLElement)[]): HTMLElement {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) {
    if (typeof c === "string") el.appendChild(document.createTextNode(c));
    else el.appendChild(c);
  }
  return el;
}

function clear(el: HTMLElement): void {
  el.innerHTML = "";
}

function showError(result: { ok: false; error: { code: string; message: string; requestId?: string } }, container: HTMLElement): void {
  const div = h("div", { class: "error" },
    h("strong", {}, `Error: ${result.error.code}`),
    h("span", {}, ` — ${result.error.message}`),
  );
  if (result.error.requestId) {
    div.appendChild(h("small", { class: "muted" }, ` (${result.error.requestId})`));
  }
  container.appendChild(div);
}

function btn(text: string, onclick: () => void, className?: string): HTMLElement {
  const b = h("button", className ? { class: className } : {}, text);
  b.addEventListener("click", onclick);
  return b;
}

function loadingIndicator(text = "Loading..."): HTMLElement {
  const el = h("div", { class: "loading-indicator" },
    h("span", { class: "loading-dot" }),
    h("span", { class: "loading-dot" }),
    h("span", { class: "loading-dot" }),
    h("span", {}, text),
  );
  return el;
}

function emptyState(icon: string, title: string, desc: string): HTMLElement {
  return h("div", { class: "empty-state" },
    h("div", { class: "empty-state-icon" }, icon),
    h("div", { class: "empty-state-title" }, title),
    h("div", { class: "empty-state-desc" }, desc),
  );
}

function pageHeader(title: string, subtitle: string): HTMLElement {
  const header = h("div", { class: "page-header" });
  header.appendChild(h("h2", {}, title));
  header.appendChild(h("p", { class: "page-subtitle" }, subtitle));
  return header;
}

function actionBar(title: string, actionEl?: HTMLElement): HTMLElement {
  const bar = h("div", { class: "action-bar" });
  bar.appendChild(h("h3", {}, title));
  if (actionEl) bar.appendChild(actionEl);
  return bar;
}

let sidebarCollapsed = false;

function render(): void {
  const app = $("app");
  clear(app);

  // App shell: sidebar + body(topbar + content)
  app.appendChild(renderSidebar());

  const body = h("div", { class: "app-body" });
  body.appendChild(renderTopbar());

  const content = h("div", { class: "app-content" });
  content.appendChild(renderMain());
  body.appendChild(content);

  app.appendChild(body);
}

// --- Sidebar ---

type SidebarItem = { id: string; icon: string; label: string; requiresAuth?: boolean; requiresOrg?: boolean };

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "members", icon: "👥", label: "Members", requiresAuth: true, requiresOrg: true },
  { id: "invitations", icon: "✉️", label: "Invitations", requiresAuth: true, requiresOrg: true },
  { id: "projects", icon: "📁", label: "Projects", requiresAuth: true, requiresOrg: true },
  { id: "api-keys", icon: "🔑", label: "API Keys", requiresAuth: true, requiresOrg: true },
  { id: "config", icon: "⚙️", label: "Config", requiresAuth: true, requiresOrg: true },
  { id: "audit", icon: "📋", label: "Audit Log", requiresAuth: true, requiresOrg: true },
];

function renderSidebar(): HTMLElement {
  const sidebar = h("aside", { class: `app-sidebar${sidebarCollapsed ? " collapsed" : ""}` });

  // Header / brand
  const header = h("div", { class: "sidebar-header" });
  const brand = h("div", { class: "sidebar-brand" });
  brand.appendChild(h("div", { class: "sidebar-brand-icon" }, "S"));
  brand.appendChild(h("span", { class: "sidebar-brand-text" }, "Sourceplane"));
  header.appendChild(brand);
  header.appendChild(btn(sidebarCollapsed ? "▸" : "◂", () => {
    sidebarCollapsed = !sidebarCollapsed;
    render();
  }, "sidebar-toggle"));
  sidebar.appendChild(header);

  // Navigation
  const nav = h("nav", { class: "sidebar-nav" });

  if (state.authenticated && state.orgId) {
    for (const item of SIDEBAR_ITEMS) {
      const isActive = !accountView && getActiveTab() === item.id;
      const navItem = h("button", {
        class: `sidebar-nav-item${isActive ? " active" : ""}`,
      });
      navItem.appendChild(h("span", { class: "sidebar-nav-icon" }, item.icon));
      navItem.appendChild(h("span", { class: "sidebar-nav-label" }, item.label));
      navItem.addEventListener("click", () => {
        accountView = null;
        renderTab(item.id);
      });
      nav.appendChild(navItem);
    }
  }

  sidebar.appendChild(nav);

  // Footer
  const footer = h("div", { class: "sidebar-footer" });
  footer.appendChild(h("div", { class: "sidebar-footer-text" },
    sidebarCollapsed ? "v0" : `${state.target.name}`));
  sidebar.appendChild(footer);

  return sidebar;
}

// --- Topbar ---

function renderTopbar(): HTMLElement {
  const topbar = h("header", { class: "app-topbar" });

  const left = h("div", { class: "topbar-left" });
  const ctx = h("div", { class: "topbar-context" });
  ctx.appendChild(h("span", { class: `badge badge-${state.target.name}` }, state.target.name));
  if (state.authenticated) {
    ctx.appendChild(h("span", { class: "badge badge-auth" }, state.session?.email ?? "authenticated"));
  }
  if (state.orgName) {
    ctx.appendChild(h("span", { class: "badge badge-org" }, state.orgName));
  }
  if (state.projectName) {
    ctx.appendChild(h("span", { class: "badge badge-project" }, state.projectName));
  }
  left.appendChild(ctx);

  const right = h("div", { class: "topbar-right" });

  if (!IS_LOCKED && TARGETS.length > 1) {
    const targetSelect = document.createElement("select");
    targetSelect.id = "target-select";
    for (const t of TARGETS) {
      const opt = document.createElement("option");
      opt.value = t.name;
      opt.textContent = `${t.name} — ${t.url}`;
      if (t.name === state.target.name) opt.selected = true;
      targetSelect.appendChild(opt);
    }
    targetSelect.addEventListener("change", () => {
      const t = TARGETS.find((t) => t.name === targetSelect.value)!;
      state = switchTarget(state, t);
      render();
    });
    right.appendChild(targetSelect);
  }

  if (state.authenticated) {
    right.appendChild(btn("Account", () => {
      accountView = accountView ? null : "profile";
      render();
    }, accountView ? "btn-sm btn-active" : "btn-sm"));
    right.appendChild(btn("Logout", handleLogout, "btn-sm btn-danger"));

    // User avatar
    const avatarText: string = state.session?.displayName || state.session?.email || "?";
    const initials = avatarText.charAt(0).toUpperCase();
    right.appendChild(h("div", { class: "topbar-avatar" }, initials));
  }

  topbar.appendChild(left);
  topbar.appendChild(right);
  return topbar;
}

function renderMain(): HTMLElement {
  const main = h("main", { class: "app-main" });

  if (!state.authenticated) {
    main.appendChild(renderAuthView());
  } else if (accountView) {
    main.appendChild(renderAccountView());
  } else if (!state.orgId) {
    main.appendChild(renderOrgSelectView());
  } else {
    main.appendChild(renderWorkspaceView());
  }

  return main;
}

// --- Auth View ---

function renderAuthView(): HTMLElement {
  const section = h("section", { class: "panel" });
  section.appendChild(h("h2", {}, "Sign In"));

  const form = h("div", { class: "form-group" });
  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.placeholder = "Email address";
  emailInput.id = "login-email";

  form.appendChild(emailInput);
  form.appendChild(btn("Start Login", handleLoginStart, "btn-primary"));
  section.appendChild(form);

  section.appendChild(h("div", { id: "login-challenge", class: "mt" }));

  const tokenSection = h("div", { class: "panel-alt mt" });
  tokenSection.appendChild(h("h3", {}, "Import Bearer Token"));
  tokenSection.appendChild(h("p", { class: "muted" }, "For prod testing when email delivery is not available."));
  const tokenInput = document.createElement("input");
  tokenInput.type = "text";
  tokenInput.placeholder = "Bearer token";
  tokenInput.id = "manual-token";
  tokenSection.appendChild(tokenInput);
  tokenSection.appendChild(btn("Set Token", handleManualToken, "btn-secondary"));
  tokenSection.appendChild(h("div", { id: "token-result" }));
  section.appendChild(tokenSection);

  return section;
}

async function handleLoginStart(): Promise<void> {
  const email = (document.getElementById("login-email") as HTMLInputElement).value.trim();
  if (!email) return;

  const container = $("login-challenge");
  clear(container);
  container.appendChild(h("p", { class: "muted" }, "Sending login request..."));

  const result = await state.client.loginStart(email);
  clear(container);

  if (!result.ok) {
    showError(result, container);
    return;
  }

  const data = result.data;
  const challengeId = data.challengeId;
  container.appendChild(h("p", {}, `Challenge created. Expires: ${data.expiresAt}`));

  if (data.delivery?.code) {
    container.appendChild(h("p", { class: "debug-code" }, `Debug code: ${data.delivery.code}`));
  } else {
    container.appendChild(h("p", { class: "muted" }, `Delivery mode: ${data.delivery?.mode ?? "email"} — check your inbox or use manual token.`));
  }

  const codeInput = document.createElement("input");
  codeInput.type = "text";
  codeInput.placeholder = "Verification code";
  codeInput.id = "login-code";
  container.appendChild(codeInput);
  container.appendChild(btn("Complete Login", () => handleLoginComplete(challengeId), "btn-primary"));
}

async function handleLoginComplete(challengeId: string): Promise<void> {
  const code = (document.getElementById("login-code") as HTMLInputElement).value.trim();
  if (!code) return;

  const container = $("login-challenge");
  const result = await state.client.loginComplete(challengeId, code);

  if (!result.ok) {
    const err = h("div", {});
    showError(result, err);
    container.appendChild(err);
    return;
  }

  const data = result.data;
  state = setAuthenticated(state, data.token, { userId: data.user.id, email: data.user.email, displayName: data.user.displayName });
  render();
}

async function handleManualToken(): Promise<void> {
  const token = (document.getElementById("manual-token") as HTMLInputElement).value.trim();
  if (!token) return;

  state = setManualToken(state, token);
  const result = await state.client.getSession();
  const container = $("token-result");
  clear(container);

  if (!result.ok) {
    state = clearAuth(state);
    showError(result, container);
    return;
  }

  const sdata = result.data;
  state = setAuthenticated(state, token, { userId: sdata.user.id, email: sdata.user.email, displayName: sdata.user.displayName });
  render();
}

async function handleLogout(): Promise<void> {
  await state.client.logout();
  state = clearAuth(state);
  accountView = null;
  render();
}

// --- Organization Select View ---

function renderOrgSelectView(): HTMLElement {
  const section = h("section", { class: "panel" });
  section.appendChild(pageHeader("Organizations", "Select or create an organization to get started."));

  const list = h("div", { id: "org-list", class: "mt" });
  section.appendChild(list);
  loadOrgs();

  const createDiv = h("div", { class: "form-group mt" });
  const nameInput = document.createElement("input");
  nameInput.placeholder = "New organization name";
  nameInput.id = "new-org-name";
  const slugInput = document.createElement("input");
  slugInput.placeholder = "Slug (optional)";
  slugInput.id = "new-org-slug";
  createDiv.appendChild(nameInput);
  createDiv.appendChild(slugInput);
  createDiv.appendChild(btn("Create Organization", handleCreateOrg, "btn-primary"));
  createDiv.appendChild(h("div", { id: "create-org-result" }));
  section.appendChild(createDiv);

  return section;
}

async function loadOrgs(): Promise<void> {
  const container = $("org-list");
  clear(container);
  container.appendChild(loadingIndicator("Loading organizations..."));

  const result = await state.client.listOrganizations();
  clear(container);

  if (!result.ok) {
    showError(result, container);
    return;
  }

  const orgs = result.data;
  if (!orgs.length) {
    container.appendChild(emptyState("🏢", "No organizations", "Create your first organization below to get started."));
    return;
  }

  for (const org of orgs) {
    const row = h("div", { class: "list-item" },
      h("span", {}, `${org.name} `),
      h("small", { class: "muted" }, `(${org.id})`),
    );
    row.appendChild(btn("Select", () => {
      state = selectOrg(state, org.id, org.name);
      render();
    }, "btn-sm btn-primary"));
    container.appendChild(row);
  }
}

async function handleCreateOrg(): Promise<void> {
  const name = (document.getElementById("new-org-name") as HTMLInputElement).value.trim();
  if (!name) return;
  const slug = (document.getElementById("new-org-slug") as HTMLInputElement).value.trim();

  const container = $("create-org-result");
  clear(container);

  const result = await state.client.createOrganization(slug ? { name, slug } : { name });
  if (!result.ok) {
    showError(result, container);
    return;
  }

  state = selectOrg(state, result.data.id, result.data.name);
  render();
}

// --- Workspace View (Org Selected) ---

function renderWorkspaceView(): HTMLElement {
  const container = h("div", { class: "workspace" });

  const nav = h("nav", { class: "workspace-nav" });
  const tabs = ["Members", "Invitations", "Projects", "API Keys", "Audit", "Config"];
  const activeTab = getActiveTab();

  nav.appendChild(btn("\u2190 Orgs", () => {
    apiKeysCreatedSecret = null;
    state = { ...state, orgId: null, orgName: null, projectId: null, projectName: null };
    localStorage.removeItem(`orgId:${state.target.name}`);
    localStorage.removeItem(`orgName:${state.target.name}`);
    localStorage.removeItem(`projectId:${state.target.name}`);
    localStorage.removeItem(`projectName:${state.target.name}`);
    render();
  }, "btn-sm"));

  for (const tab of tabs) {
    const tabKey = tab.toLowerCase().replace(/ /g, "-");
    const cls = tabKey === activeTab ? "btn-sm btn-active" : "btn-sm";
    nav.appendChild(btn(tab, () => setTab(tabKey), cls));
  }

  container.appendChild(nav);

  const content = h("div", { id: "workspace-content", class: "workspace-content" });
  container.appendChild(content);

  setTimeout(() => renderTab(activeTab), 0);
  return container;
}

function getActiveTab(): string {
  return sessionStorage.getItem("activeTab") ?? "members";
}

function setTab(tab: string): void {
  sessionStorage.setItem("activeTab", tab);
  render();
}

function renderTab(tab: string): void {
  const content = document.getElementById("workspace-content");
  if (!content) return;
  clear(content);

  // Clear one-time secret when navigating away from API Keys tab
  if (tab !== "api-keys") {
    apiKeysCreatedSecret = null;
  }

  switch (tab) {
    case "members": renderMembersTab(content); break;
    case "invitations": renderInvitationsTab(content); break;
    case "projects": renderProjectsTab(content); break;
    case "api-keys": renderApiKeysTab(content); break;
    case "audit": renderAuditTab(content); break;
    case "config": renderConfigTab(content); break;
  }
}

// --- Members Tab ---

async function renderMembersTab(container: HTMLElement): Promise<void> {
  container.appendChild(actionBar("Team Members"));
  const list = h("div", { id: "members-list" });
  container.appendChild(list);
  list.appendChild(loadingIndicator("Loading members..."));

  const result = await state.client.listMembers(state.orgId!);
  clear(list);

  if (!result.ok) {
    showError(result, list);
    return;
  }

  for (const member of result.data) {
    const row = h("div", { class: "member-row" });
    const email = (member as any).email ?? member.subjectId;
    const roles = member.roles?.map((r) => r.role).join(", ") ?? "unknown";
    const initials = email.charAt(0).toUpperCase();

    const info = h("div", { class: "member-info" });
    info.appendChild(h("div", { class: "member-avatar" }, initials));
    const details = h("div", { class: "member-details" });
    details.appendChild(h("span", { class: "member-name" }, email));
    details.appendChild(h("span", { class: "member-meta" }, `ID: ${member.id}`));
    info.appendChild(details);
    info.appendChild(h("span", { class: "member-role" }, roles));
    row.appendChild(info);

    const actions = h("span", { class: "actions" });
    actions.appendChild(btn("Change Role", () => promptRoleChange(member.id), "btn-xs"));
    actions.appendChild(btn("Remove", () => handleRemoveMember(member.id), "btn-xs btn-danger"));
    row.appendChild(actions);
    list.appendChild(row);
  }

  if (!result.data.length) {
    list.appendChild(emptyState("👥", "No members yet", "Members of this organization will appear here."));
  }
}

function promptRoleChange(memberId: string): void {
  const role = prompt("Enter new role (owner, admin, builder, viewer, billing_admin):");
  if (!role) return;
  handleUpdateRole(memberId, role);
}

async function handleUpdateRole(memberId: string, role: string): Promise<void> {
  const result = await state.client.updateMemberRole(state.orgId!, memberId, { role } as any);
  if (!result.ok) {
    alert(`Error: ${result.error.code} — ${result.error.message}`);
    return;
  }
  renderTab("members");
}

async function handleRemoveMember(memberId: string): Promise<void> {
  if (!confirm("Remove this member?")) return;
  const result = await state.client.removeMember(state.orgId!, memberId);
  if (!result.ok) {
    alert(`Error: ${result.error.code} — ${result.error.message}`);
    return;
  }
  renderTab("members");
}

// --- Invitations Tab ---

async function renderInvitationsTab(container: HTMLElement): Promise<void> {
  container.appendChild(actionBar("Invitations"));

  const createDiv = h("div", { class: "panel-alt" });
  createDiv.appendChild(h("h4", {}, "Send Invitation"));
  const formRow = h("div", { class: "form-group" });
  const emailInput = document.createElement("input");
  emailInput.placeholder = "Email to invite";
  emailInput.id = "invite-email";
  const roleSelect = document.createElement("select");
  roleSelect.id = "invite-role";
  for (const r of ["admin", "builder", "viewer", "billing_admin"]) {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    roleSelect.appendChild(opt);
  }
  formRow.appendChild(emailInput);
  formRow.appendChild(roleSelect);
  formRow.appendChild(btn("Send Invite", handleCreateInvitation, "btn-primary"));
  createDiv.appendChild(formRow);
  createDiv.appendChild(h("div", { id: "invite-result" }));
  container.appendChild(createDiv);

  const acceptDiv = h("div", { class: "panel-alt mt" });
  acceptDiv.appendChild(h("h4", {}, "Accept Invitation"));
  const acceptRow = h("div", { class: "form-group" });
  const tokenInput = document.createElement("input");
  tokenInput.placeholder = "Invitation token";
  tokenInput.id = "accept-token";
  acceptRow.appendChild(tokenInput);
  acceptRow.appendChild(btn("Accept", handleAcceptInvitation, "btn-secondary"));
  acceptDiv.appendChild(acceptRow);
  acceptDiv.appendChild(h("div", { id: "accept-result" }));
  container.appendChild(acceptDiv);

  const list = h("div", { id: "invitations-list", class: "mt" });
  container.appendChild(list);
  list.appendChild(loadingIndicator("Loading invitations..."));

  const result = await state.client.listInvitations(state.orgId!);
  clear(list);

  if (!result.ok) {
    showError(result, list);
    return;
  }

  for (const inv of result.data) {
    const row = h("div", { class: "invitation-row" });
    const info = h("div", { class: "invitation-info" });
    info.appendChild(h("span", { class: "invitation-email" }, inv.email));
    info.appendChild(h("span", { class: "invitation-meta" }, `Role: ${inv.role} · Expires: ${formatTimestamp(inv.expiresAt)}`));
    row.appendChild(info);

    const statusCls = `badge badge-${inv.status}`;
    row.appendChild(h("span", { class: statusCls }, inv.status.toUpperCase()));

    if (inv.status === "pending") {
      row.appendChild(btn("Revoke", () => handleRevokeInvitation(inv.id), "btn-xs btn-danger"));
    }
    list.appendChild(row);
  }

  if (!result.data.length) {
    list.appendChild(emptyState("✉️", "No invitations", "Send invitations above to add members."));
  }
}

async function handleCreateInvitation(): Promise<void> {
  const email = (document.getElementById("invite-email") as HTMLInputElement).value.trim();
  const role = (document.getElementById("invite-role") as HTMLSelectElement).value;
  if (!email) return;

  const container = $("invite-result");
  clear(container);

  const result = await state.client.createInvitation(state.orgId!, { email, role } as any);
  if (!result.ok) {
    showError(result, container);
    return;
  }

  container.appendChild(h("p", { class: "success" }, `Invitation sent to ${email}`));
  if (result.data.delivery?.token) {
    container.appendChild(h("p", { class: "debug-code" }, `Debug token: ${result.data.delivery.token}`));
  }
  setTimeout(() => renderTab("invitations"), 500);
}

async function handleRevokeInvitation(invitationId: string): Promise<void> {
  if (!confirm("Revoke this invitation?")) return;
  const result = await state.client.revokeInvitation(state.orgId!, invitationId);
  if (!result.ok) {
    alert(`Error: ${result.error.code} — ${result.error.message}`);
    return;
  }
  renderTab("invitations");
}

async function handleAcceptInvitation(): Promise<void> {
  const token = (document.getElementById("accept-token") as HTMLInputElement).value.trim();
  if (!token) return;
  const container = $("accept-result");
  clear(container);
  if (!state.orgId) {
    container.appendChild(h("p", { class: "error" }, "No organization selected."));
    return;
  }
  const result = await state.client.acceptInvitation(state.orgId, token);
  if (!result.ok) {
    showError(result, container);
    return;
  }
  container.appendChild(h("p", { class: "success" }, "Invitation accepted."));
}

// --- Projects Tab ---

async function renderProjectsTab(container: HTMLElement): Promise<void> {
  if (state.projectId) {
    await renderProjectDetail(container);
    return;
  }

  container.appendChild(actionBar("Projects", btn("Create Project", () => {
    const createDiv = document.getElementById("create-project-form");
    if (createDiv) createDiv.style.display = createDiv.style.display === "none" ? "block" : "none";
  }, "btn-primary btn-sm")));

  const createDiv = h("div", { id: "create-project-form", class: "panel-alt", style: "display:none" });
  const formRow = h("div", { class: "form-group" });
  const nameInput = document.createElement("input");
  nameInput.placeholder = "New project name";
  nameInput.id = "new-project-name";
  const slugInput = document.createElement("input");
  slugInput.placeholder = "Slug (optional)";
  slugInput.id = "new-project-slug";
  formRow.appendChild(nameInput);
  formRow.appendChild(slugInput);
  formRow.appendChild(btn("Create", handleCreateProject, "btn-primary"));
  createDiv.appendChild(formRow);
  createDiv.appendChild(h("div", { id: "create-project-result" }));
  container.appendChild(createDiv);

  const list = h("div", { id: "projects-list", class: "mt" });
  container.appendChild(list);
  list.appendChild(loadingIndicator("Loading projects..."));

  const result = await state.client.listProjects(state.orgId!);
  clear(list);

  if (!result.ok) {
    showError(result, list);
    return;
  }

  for (const proj of result.data) {
    const row = h("div", { class: "project-card" });
    const info = h("div", { class: "project-info" });
    info.appendChild(h("span", { class: "project-name" }, proj.name));
    info.appendChild(h("span", { class: "project-meta" }, `ID: ${proj.id}`));
    row.appendChild(info);

    row.appendChild(h("span", { class: `badge badge-${proj.status}` }, proj.status.toUpperCase()));

    const actions = h("span", { class: "actions" });
    actions.appendChild(btn("Select", () => {
      state = selectProject(state, proj.id, proj.name);
      render();
    }, "btn-xs btn-primary"));
    if (proj.status === "active") {
      actions.appendChild(btn("Archive", () => handleArchiveProject(proj.id), "btn-xs btn-danger"));
    }
    row.appendChild(actions);
    list.appendChild(row);
  }

  if (!result.data.length) {
    list.appendChild(emptyState("📁", "No projects", "Create your first project to get started."));
  }
}

async function renderProjectDetail(container: HTMLElement): Promise<void> {
  container.appendChild(btn("\u2190 Back to Projects", () => {
    state = clearProject(state);
    render();
  }, "btn-sm"));
  container.appendChild(h("h4", { class: "mt" }, `Project: ${state.projectName}`));

  container.appendChild(h("h4", { class: "mt" }, "Environments"));

  const createDiv = h("div", { class: "form-group" });
  const nameInput = document.createElement("input");
  nameInput.placeholder = "New environment name";
  nameInput.id = "new-env-name";
  const slugInput = document.createElement("input");
  slugInput.placeholder = "Slug (optional)";
  slugInput.id = "new-env-slug";
  createDiv.appendChild(nameInput);
  createDiv.appendChild(slugInput);
  createDiv.appendChild(btn("Create Environment", handleCreateEnv, "btn-primary"));
  createDiv.appendChild(h("div", { id: "create-env-result" }));
  container.appendChild(createDiv);

  const list = h("div", { id: "envs-list", class: "mt" });
  container.appendChild(list);
  list.appendChild(loadingIndicator("Loading environments..."));

  const result = await state.client.listEnvironments(state.orgId!, state.projectId!);
  clear(list);

  if (!result.ok) {
    showError(result, list);
    return;
  }

  for (const env of result.data) {
    const row = h("div", { class: "list-item" },
      h("span", {}, `${env.name} `),
      h("small", { class: "muted" }, `(${env.id}) — ${env.status}`),
    );
    if (env.status === "active") {
      row.appendChild(btn("Archive", () => handleArchiveEnv(env.id), "btn-xs btn-danger"));
    }
    list.appendChild(row);
  }

  if (!result.data.length) {
    list.appendChild(emptyState("🌍", "No environments", "Create an environment above to get started."));
  }
}

async function handleCreateProject(): Promise<void> {
  const name = (document.getElementById("new-project-name") as HTMLInputElement).value.trim();
  if (!name) return;
  const slug = (document.getElementById("new-project-slug") as HTMLInputElement).value.trim();

  const container = $("create-project-result");
  clear(container);

  const result = await state.client.createProject(state.orgId!, slug ? { name, slug } : { name });
  if (!result.ok) {
    showError(result, container);
    return;
  }

  state = selectProject(state, result.data.id, result.data.name);
  render();
}

async function handleArchiveProject(projectId: string): Promise<void> {
  if (!confirm("Archive this project?")) return;
  const result = await state.client.archiveProject(state.orgId!, projectId);
  if (!result.ok) {
    alert(`Error: ${result.error.code} — ${result.error.message}`);
    return;
  }
  renderTab("projects");
}

async function handleCreateEnv(): Promise<void> {
  const name = (document.getElementById("new-env-name") as HTMLInputElement).value.trim();
  if (!name) return;
  const slug = (document.getElementById("new-env-slug") as HTMLInputElement).value.trim();

  const container = $("create-env-result");
  clear(container);

  const result = await state.client.createEnvironment(state.orgId!, state.projectId!, slug ? { name, slug } : { name });
  if (!result.ok) {
    showError(result, container);
    return;
  }

  container.appendChild(h("p", { class: "success" }, `Environment "${result.data.name}" created.`));
  setTimeout(() => renderTab("projects"), 500);
}

async function handleArchiveEnv(envId: string): Promise<void> {
  if (!confirm("Archive this environment?")) return;
  const result = await state.client.archiveEnvironment(state.orgId!, state.projectId!, envId);
  if (!result.ok) {
    alert(`Error: ${result.error.code} — ${result.error.message}`);
    return;
  }
  renderTab("projects");
}

// --- API Keys Tab ---

let apiKeysCursor: string | null = null;
let apiKeysCreatedSecret: { label: string; secret: string; prefix: string } | null = null;

async function renderApiKeysTab(container: HTMLElement): Promise<void> {
  container.appendChild(actionBar("API Keys"));
  container.appendChild(h("p", { class: "page-subtitle" }, "Organization-scoped API key administration. Keys authenticate service principals via the public API."));

  // Show one-time secret if just created
  if (apiKeysCreatedSecret) {
    const secretBox = h("div", { class: "api-key-secret-box" });
    secretBox.appendChild(h("h4", {}, `API Key Created: ${apiKeysCreatedSecret.label}`));
    secretBox.appendChild(h("p", { class: "api-key-secret-warning" }, "Copy this secret now — it will not be shown again."));
    const secretRow = h("div", { class: "form-group" });
    const secretInput = document.createElement("input");
    secretInput.type = "text";
    secretInput.readOnly = true;
    secretInput.value = apiKeysCreatedSecret.secret;
    secretInput.className = "api-key-secret-value";
    secretRow.appendChild(secretInput);
    secretRow.appendChild(btn("Copy", () => {
      navigator.clipboard.writeText(apiKeysCreatedSecret!.secret).then(() => {
        alert("Secret copied to clipboard.");
      }).catch(() => {
        secretInput.select();
      });
    }, "btn-sm btn-primary"));
    secretRow.appendChild(btn("Dismiss", () => {
      apiKeysCreatedSecret = null;
      renderTab("api-keys");
    }, "btn-sm"));
    secretBox.appendChild(secretRow);
    container.appendChild(secretBox);
  }

  // Create form
  const createDiv = h("div", { class: "panel-alt mt" });
  createDiv.appendChild(h("h4", {}, "Create API Key"));

  const labelInput = document.createElement("input");
  labelInput.placeholder = "Label (e.g. CI deploy key)";
  labelInput.id = "apikey-label";

  const roleSelect = document.createElement("select");
  roleSelect.id = "apikey-role";
  for (const r of ["admin", "builder", "viewer", "billing_admin", "project_admin", "project_builder", "project_viewer"]) {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    roleSelect.appendChild(opt);
  }

  const projectInput = document.createElement("input");
  projectInput.placeholder = "Project ID (required for project_* roles)";
  projectInput.id = "apikey-project-id";

  const expiresInput = document.createElement("input");
  expiresInput.type = "datetime-local";
  expiresInput.id = "apikey-expires";

  const formRow1 = h("div", { class: "form-group" });
  formRow1.appendChild(labelInput);
  formRow1.appendChild(roleSelect);
  createDiv.appendChild(formRow1);

  const formRow2 = h("div", { class: "form-group mt" });
  formRow2.appendChild(projectInput);
  formRow2.appendChild(expiresInput);
  formRow2.appendChild(btn("Create", handleCreateApiKey, "btn-primary"));
  createDiv.appendChild(formRow2);

  createDiv.appendChild(h("div", { id: "apikey-create-result", class: "mt" }));
  container.appendChild(createDiv);

  // List
  const list = h("div", { id: "apikeys-list", class: "mt" });
  container.appendChild(list);
  loadApiKeys();
}

async function handleCreateApiKey(): Promise<void> {
  const label = (document.getElementById("apikey-label") as HTMLInputElement).value.trim();
  const role = (document.getElementById("apikey-role") as HTMLSelectElement).value;
  const projectId = (document.getElementById("apikey-project-id") as HTMLInputElement).value.trim();
  const expiresRaw = (document.getElementById("apikey-expires") as HTMLInputElement).value;

  if (!label) {
    alert("Label is required.");
    return;
  }

  const container = document.getElementById("apikey-create-result");
  if (container) { clear(container); }

  const data: Record<string, string> = { label, role };
  if (projectId) data.projectId = projectId;
  if (expiresRaw) data.expiresAt = new Date(expiresRaw).toISOString();

  const result = await state.client.createApiKey(state.orgId!, data as any);
  if (!result.ok) {
    if (container) showError(result, container);
    return;
  }

  // Store one-time secret for display, then refresh
  apiKeysCreatedSecret = {
    label: result.data.label,
    secret: result.data.secret,
    prefix: result.data.prefix,
  };
  renderTab("api-keys");
}

async function loadApiKeys(cursor?: string): Promise<void> {
  const container = document.getElementById("apikeys-list");
  if (!container) return;
  if (!cursor) {
    clear(container);
    apiKeysCursor = null;
  }

  // Remove existing Load More button
  const existingBtn = container.querySelector(".apikeys-load-more");
  if (existingBtn) existingBtn.remove();

  const loadingEl = h("p", { class: "muted" }, "Loading...");
  container.appendChild(loadingEl);

  const opts: { cursor?: string; limit?: string } = { limit: "20" };
  if (cursor) opts.cursor = cursor;
  const result = await state.client.listApiKeys(state.orgId!, opts);

  loadingEl.remove();

  if (!result.ok) {
    showError(result, container);
    return;
  }

  for (const key of result.data) {
    const isRevoked = !!key.revokedAt;
    const rowCls = isRevoked ? "list-item apikey-row apikey-revoked" : "list-item apikey-row";
    const row = h("div", { class: rowCls });

    const info = h("div", { class: "apikey-info" });
    info.appendChild(h("span", { class: "apikey-label" }, key.label));
    info.appendChild(h("span", { class: "muted apikey-prefix" }, `${key.prefix}...`));

    const meta: string[] = [];
    meta.push(`Role: ${key.servicePrincipal.role}`);
    if (key.servicePrincipal.projectId) meta.push(`Project: ${key.servicePrincipal.projectId}`);
    meta.push(`Created: ${formatTimestamp(key.createdAt)}`);
    if (key.expiresAt) meta.push(`Expires: ${formatTimestamp(key.expiresAt)}`);
    if (key.lastUsedAt) meta.push(`Last used: ${formatTimestamp(key.lastUsedAt)}`);
    if (key.revokedAt) meta.push(`Revoked: ${formatTimestamp(key.revokedAt)}`);
    info.appendChild(h("small", { class: "muted apikey-meta" }, meta.join(" · ")));

    row.appendChild(info);

    if (!isRevoked) {
      const actions = h("span", { class: "actions" });
      actions.appendChild(btn("Revoke", () => handleRevokeApiKey(key.id, key.label), "btn-xs btn-danger"));
      row.appendChild(actions);
    } else {
      row.appendChild(h("span", { class: "badge badge-revoked" }, "REVOKED"));
    }

    container.appendChild(row);
  }

  if (!result.data.length && !cursor) {
    container.appendChild(emptyState("🔑", "No API keys", "Create an API key above to authenticate service principals."));
  }

  apiKeysCursor = result.meta.cursor;
  if (apiKeysCursor) {
    const c = apiKeysCursor;
    const loadMoreBtn = btn("Load More", () => loadApiKeys(c), "btn-sm mt apikeys-load-more");
    container.appendChild(loadMoreBtn);
  }
}

async function handleRevokeApiKey(apiKeyId: string, label: string): Promise<void> {
  if (!confirm(`Revoke API key "${label}"? This cannot be undone.`)) return;
  const result = await state.client.revokeApiKey(state.orgId!, apiKeyId);
  if (!result.ok) {
    alert(`Error: ${result.error.code} — ${result.error.message}`);
    return;
  }
  renderTab("api-keys");
}

// --- Audit Tab ---

async function renderAuditTab(container: HTMLElement): Promise<void> {
  container.appendChild(actionBar("Audit Log"));

  const filterDiv = h("div", { class: "form-group" });
  const catInput = document.createElement("input");
  catInput.placeholder = "Category filter (optional)";
  catInput.id = "audit-category";
  filterDiv.appendChild(catInput);
  filterDiv.appendChild(btn("Load", () => loadAudit(), "btn-primary"));
  container.appendChild(filterDiv);

  const list = h("div", { id: "audit-list", class: "mt" });
  container.appendChild(list);
  loadAudit();
}

let auditCursor: string | null = null;

async function loadAudit(cursor?: string): Promise<void> {
  const container = document.getElementById("audit-list");
  if (!container) return;
  if (!cursor) clear(container);
  container.appendChild(loadingIndicator("Loading audit log..."));

  const categoryVal = (document.getElementById("audit-category") as HTMLInputElement)?.value.trim();
  const opts: { category?: string; cursor?: string } = {};
  if (categoryVal) opts.category = categoryVal;
  if (cursor) opts.cursor = cursor;
  const result = await state.client.listAuditEntries(state.orgId!, opts);

  const loading = container.querySelector("p.muted:last-child");
  if (loading) loading.remove();

  if (!result.ok) {
    showError(result, container);
    return;
  }

  // Build table if first page
  let tbody = container.querySelector("tbody") as HTMLTableSectionElement | null;
  if (!tbody) {
    const table = h("table", { class: "audit-table" });
    const thead = h("thead", {});
    const headRow = h("tr", {},
      h("th", {}, "Event"),
      h("th", {}, "Actor"),
      h("th", {}, "Subject"),
      h("th", {}, "Time"),
    );
    thead.appendChild(headRow);
    table.appendChild(thead);
    tbody = document.createElement("tbody");
    table.appendChild(tbody);
    container.appendChild(table);
  }

  for (const entry of result.data) {
    const subjectText = entry.subject ? `${entry.subject.kind}:${entry.subject.id}` : "—";
    const tr = h("tr", {},
      h("td", {}, h("span", { class: "audit-action" }, entry.eventType)),
      h("td", {}, entry.actorId),
      h("td", { class: "muted" }, subjectText),
      h("td", { class: "muted" }, formatTimestamp(entry.occurredAt)),
    );
    tbody.appendChild(tr);
  }

  if (!result.data.length && !cursor) {
    container.appendChild(emptyState("📋", "No audit entries", "Activity for this organization will appear here."));
  }

  auditCursor = result.meta.cursor;
  if (auditCursor) {
    const c = auditCursor;
    container.appendChild(btn("Load More", () => loadAudit(c), "btn-sm mt"));
  }
}

// --- Config Tab ---

type ConfigResource = "settings" | "feature-flags" | "secrets";
type ConfigScope = "organization" | "project" | "environment";

let configResource: ConfigResource = "settings";
let configScope: ConfigScope = "organization";
let configEnvId: string | null = null;
let configEnvName: string | null = null;
let configEnvs: { id: string; name: string }[] = [];

async function renderConfigTab(container: HTMLElement): Promise<void> {
  container.appendChild(actionBar("Config"));
  container.appendChild(h("p", { class: "page-subtitle" }, "Manage settings and feature flags. Secret metadata is read-only."));

  // Resource sub-tabs
  const resourceNav = h("div", { class: "config-resource-nav" });
  const resources: { key: ConfigResource; label: string }[] = [
    { key: "settings", label: "Settings" },
    { key: "feature-flags", label: "Feature Flags" },
    { key: "secrets", label: "Secrets Metadata" },
  ];
  for (const r of resources) {
    const cls = r.key === configResource ? "btn-xs btn-active" : "btn-xs";
    resourceNav.appendChild(btn(r.label, () => {
      configResource = r.key;
      renderTab("config");
    }, cls));
  }
  container.appendChild(resourceNav);

  // Scope selector
  const scopeNav = h("div", { class: "config-scope-nav" });
  scopeNav.appendChild(h("span", { class: "muted" }, "Scope: "));
  const scopes: { key: ConfigScope; label: string }[] = [
    { key: "organization", label: "Organization" },
    { key: "project", label: "Project" },
    { key: "environment", label: "Environment" },
  ];
  for (const s of scopes) {
    const cls = s.key === configScope ? "btn-xs btn-active" : "btn-xs";
    scopeNav.appendChild(btn(s.label, () => {
      configScope = s.key;
      configEnvId = null;
      configEnvName = null;
      renderTab("config");
    }, cls));
  }
  container.appendChild(scopeNav);

  // Scope context info
  const scopeInfo = h("div", { class: "config-scope-info" });
  scopeInfo.appendChild(h("small", { class: "muted" }, `Org: ${state.orgName ?? state.orgId}`));
  if ((configScope === "project" || configScope === "environment") && state.projectId) {
    scopeInfo.appendChild(h("small", { class: "muted" }, ` · Project: ${state.projectName ?? state.projectId}`));
  }
  if (configScope === "environment" && configEnvName) {
    scopeInfo.appendChild(h("small", { class: "muted" }, ` · Environment: ${configEnvName}`));
  }
  container.appendChild(scopeInfo);

  // Handle missing project/environment context
  if (configScope === "project" && !state.projectId) {
    container.appendChild(h("div", { class: "panel-alt mt" },
      h("p", { class: "muted" }, "Select a project from the Projects tab to view project-scoped config."),
    ));
    return;
  }

  if (configScope === "environment") {
    if (!state.projectId) {
      container.appendChild(h("div", { class: "panel-alt mt" },
        h("p", { class: "muted" }, "Select a project from the Projects tab first, then choose an environment."),
      ));
      return;
    }
    // Environment selector
    const envSelector = h("div", { class: "form-group mt" });
    envSelector.appendChild(h("label", {}, "Environment: "));
    const envSelect = document.createElement("select");
    envSelect.id = "config-env-select";

    const placeholderOpt = document.createElement("option");
    placeholderOpt.value = "";
    placeholderOpt.textContent = "— Select environment —";
    envSelect.appendChild(placeholderOpt);

    if (configEnvs.length === 0) {
      // Load environments on demand
      envSelector.appendChild(envSelect);
      envSelector.appendChild(h("span", { class: "muted" }, "Loading environments..."));
      container.appendChild(envSelector);

      const envResult = await state.client.listEnvironments(state.orgId!, state.projectId!);
      if (!envResult.ok) {
        showError(envResult, container);
        return;
      }
      configEnvs = envResult.data.map((e: any) => ({ id: e.id, name: e.name }));
      // Re-render now that envs are loaded
      renderTab("config");
      return;
    }

    for (const env of configEnvs) {
      const opt = document.createElement("option");
      opt.value = env.id;
      opt.textContent = env.name;
      if (env.id === configEnvId) opt.selected = true;
      envSelect.appendChild(opt);
    }
    envSelect.addEventListener("change", () => {
      const selected = configEnvs.find((e) => e.id === envSelect.value);
      configEnvId = selected?.id ?? null;
      configEnvName = selected?.name ?? null;
      renderTab("config");
    });
    envSelector.appendChild(envSelect);
    container.appendChild(envSelector);

    if (!configEnvId) {
      container.appendChild(h("div", { class: "panel-alt mt" },
        h("p", { class: "muted" }, "Select an environment above to view environment-scoped config."),
      ));
      return;
    }
  }

  // Create form (settings and feature flags only, not secrets)
  if (configResource !== "secrets") {
    const createForm = renderConfigCreateForm();
    container.appendChild(createForm);
  }

  // Config list
  const list = h("div", { id: "config-list", class: "mt" });
  container.appendChild(list);

  // Success message area
  const msgArea = h("div", { id: "config-msg" });
  container.appendChild(msgArea);

  loadConfigList();
}

let configCursor: string | null = null;

function configScopeOpts(): { projectId?: string; environmentId?: string } {
  const opts: { projectId?: string; environmentId?: string } = {};
  if (configScope === "project" || configScope === "environment") {
    opts.projectId = state.projectId!;
  }
  if (configScope === "environment" && configEnvId) {
    opts.environmentId = configEnvId;
  }
  return opts;
}

function showConfigMsg(text: string, cls: string): void {
  const msgArea = document.getElementById("config-msg");
  if (msgArea) {
    clear(msgArea);
    msgArea.appendChild(h("p", { class: cls }, text));
    setTimeout(() => { if (msgArea) clear(msgArea); }, 4000);
  }
}

function renderConfigCreateForm(): HTMLElement {
  const card = h("div", { class: "panel-alt config-create-card" });

  if (configResource === "settings") {
    card.appendChild(h("h4", {}, "Create Setting"));
    const keyInput = document.createElement("input");
    keyInput.placeholder = "Key";
    keyInput.id = "config-create-key";

    const valueArea = document.createElement("textarea");
    valueArea.placeholder = 'Value (JSON, e.g. "hello" or 42 or {"k":"v"})';
    valueArea.id = "config-create-value";
    valueArea.className = "config-textarea";
    valueArea.rows = 2;

    const descInput = document.createElement("input");
    descInput.placeholder = "Description (optional)";
    descInput.id = "config-create-desc";

    const row = h("div", { class: "config-create-fields" });
    row.appendChild(keyInput);
    row.appendChild(valueArea);
    row.appendChild(descInput);

    const errDiv = h("div", { id: "config-create-err" });

    row.appendChild(btn("Create", async () => {
      const key = (document.getElementById("config-create-key") as HTMLInputElement).value.trim();
      const rawVal = (document.getElementById("config-create-value") as HTMLTextAreaElement).value;
      const desc = (document.getElementById("config-create-desc") as HTMLInputElement).value.trim();
      const eDiv = document.getElementById("config-create-err");
      if (eDiv) clear(eDiv);

      if (!key) { if (eDiv) eDiv.appendChild(h("p", { class: "error" }, "Key is required.")); return; }

      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(rawVal);
      } catch {
        if (eDiv) eDiv.appendChild(h("p", { class: "error" }, "Value must be valid JSON (e.g. \"hello\", 42, true, {\"k\":\"v\"})."));
        return;
      }

      const data: { key: string; value: unknown; description?: string } = { key, value: parsedValue };
      if (desc) data.description = desc;

      const result = await state.client.createSetting(state.orgId!, data, configScopeOpts());
      if (!result.ok) {
        if (eDiv) showError(result, eDiv);
        return;
      }
      showConfigMsg("Setting created.", "success");
      loadConfigList();
    }, "btn-primary btn-sm"));

    card.appendChild(row);
    card.appendChild(errDiv);
  } else if (configResource === "feature-flags") {
    card.appendChild(h("h4", {}, "Create Feature Flag"));
    const keyInput = document.createElement("input");
    keyInput.placeholder = "Flag Key";
    keyInput.id = "config-create-flag-key";

    const enabledSelect = document.createElement("select");
    enabledSelect.id = "config-create-flag-enabled";
    const enabledOpt = document.createElement("option");
    enabledOpt.value = "true"; enabledOpt.textContent = "Enabled"; enabledSelect.appendChild(enabledOpt);
    const disabledOpt = document.createElement("option");
    disabledOpt.value = "false"; disabledOpt.textContent = "Disabled"; disabledOpt.selected = true; enabledSelect.appendChild(disabledOpt);

    const valueArea = document.createElement("textarea");
    valueArea.placeholder = "Value (optional JSON)";
    valueArea.id = "config-create-flag-value";
    valueArea.className = "config-textarea";
    valueArea.rows = 2;

    const descInput = document.createElement("input");
    descInput.placeholder = "Description (optional)";
    descInput.id = "config-create-flag-desc";

    const row = h("div", { class: "config-create-fields" });
    row.appendChild(keyInput);
    row.appendChild(enabledSelect);
    row.appendChild(valueArea);
    row.appendChild(descInput);

    const errDiv = h("div", { id: "config-create-err" });

    row.appendChild(btn("Create", async () => {
      const flagKey = (document.getElementById("config-create-flag-key") as HTMLInputElement).value.trim();
      const enabled = (document.getElementById("config-create-flag-enabled") as HTMLSelectElement).value === "true";
      const rawVal = (document.getElementById("config-create-flag-value") as HTMLTextAreaElement).value.trim();
      const desc = (document.getElementById("config-create-flag-desc") as HTMLInputElement).value.trim();
      const eDiv = document.getElementById("config-create-err");
      if (eDiv) clear(eDiv);

      if (!flagKey) { if (eDiv) eDiv.appendChild(h("p", { class: "error" }, "Flag key is required.")); return; }

      const data: { flagKey: string; enabled?: boolean; value?: unknown; description?: string } = { flagKey, enabled };
      if (rawVal) {
        try { data.value = JSON.parse(rawVal); } catch {
          if (eDiv) eDiv.appendChild(h("p", { class: "error" }, "Value must be valid JSON."));
          return;
        }
      }
      if (desc) data.description = desc;

      const result = await state.client.createFeatureFlag(state.orgId!, data, configScopeOpts());
      if (!result.ok) {
        if (eDiv) showError(result, eDiv);
        return;
      }
      showConfigMsg("Feature flag created.", "success");
      loadConfigList();
    }, "btn-primary btn-sm"));

    card.appendChild(row);
    card.appendChild(errDiv);
  }

  return card;
}

function renderSettingEditForm(s: any, container: HTMLElement, rowEl: HTMLElement): void {
  // Replace the row with an inline edit form
  const form = h("div", { class: "list-item config-item config-edit-form" });

  form.appendChild(h("span", { class: "config-key" }, s.key));

  const valueArea = document.createElement("textarea");
  valueArea.className = "config-textarea";
  valueArea.rows = 3;
  valueArea.value = typeof s.value === "string" ? JSON.stringify(s.value) : JSON.stringify(s.value, null, 2);

  const descInput = document.createElement("input");
  descInput.value = s.description ?? "";
  descInput.placeholder = "Description (optional)";

  const errDiv = h("div", {});

  const actions = h("div", { class: "actions" });
  actions.appendChild(btn("Save", async () => {
    clear(errDiv);
    let parsedValue: unknown;
    try { parsedValue = JSON.parse(valueArea.value); } catch {
      errDiv.appendChild(h("p", { class: "error" }, "Value must be valid JSON."));
      return;
    }
    const data: { value: unknown; description?: string | null } = { value: parsedValue };
    const newDesc = descInput.value.trim();
    if (newDesc !== (s.description ?? "")) {
      data.description = newDesc || null;
    }
    const result = await state.client.updateSetting(state.orgId!, s.id, data, configScopeOpts());
    if (!result.ok) { showError(result, errDiv); return; }
    showConfigMsg("Setting updated.", "success");
    loadConfigList();
  }, "btn-primary btn-xs"));
  actions.appendChild(btn("Cancel", () => {
    form.replaceWith(rowEl);
  }, "btn-xs"));

  form.appendChild(valueArea);
  form.appendChild(descInput);
  form.appendChild(errDiv);
  form.appendChild(actions);

  rowEl.replaceWith(form);
}

function renderFlagEditForm(f: any, container: HTMLElement, rowEl: HTMLElement): void {
  const form = h("div", { class: "list-item config-item config-edit-form" });

  form.appendChild(h("span", { class: "config-key" }, f.flagKey));

  const enabledSelect = document.createElement("select");
  const enOpt = document.createElement("option");
  enOpt.value = "true"; enOpt.textContent = "Enabled"; if (f.enabled) enOpt.selected = true; enabledSelect.appendChild(enOpt);
  const disOpt = document.createElement("option");
  disOpt.value = "false"; disOpt.textContent = "Disabled"; if (!f.enabled) disOpt.selected = true; enabledSelect.appendChild(disOpt);

  const valueArea = document.createElement("textarea");
  valueArea.className = "config-textarea";
  valueArea.rows = 2;
  valueArea.placeholder = "Value (optional JSON)";
  valueArea.value = f.value != null ? (typeof f.value === "string" ? JSON.stringify(f.value) : JSON.stringify(f.value, null, 2)) : "";

  const descInput = document.createElement("input");
  descInput.value = f.description ?? "";
  descInput.placeholder = "Description (optional)";

  const errDiv = h("div", {});

  const actions = h("div", { class: "actions" });
  actions.appendChild(btn("Save", async () => {
    clear(errDiv);
    const data: { enabled?: boolean; value?: unknown; description?: string | null } = {};
    const newEnabled = enabledSelect.value === "true";
    if (newEnabled !== f.enabled) data.enabled = newEnabled;

    const rawVal = valueArea.value.trim();
    if (rawVal) {
      try { data.value = JSON.parse(rawVal); } catch {
        errDiv.appendChild(h("p", { class: "error" }, "Value must be valid JSON."));
        return;
      }
    } else if (f.value != null) {
      data.value = null;
    }

    const newDesc = descInput.value.trim();
    if (newDesc !== (f.description ?? "")) {
      data.description = newDesc || null;
    }

    if (Object.keys(data).length === 0) {
      errDiv.appendChild(h("p", { class: "muted" }, "No changes to save."));
      return;
    }

    const result = await state.client.updateFeatureFlag(state.orgId!, f.id, data, configScopeOpts());
    if (!result.ok) { showError(result, errDiv); return; }
    showConfigMsg("Feature flag updated.", "success");
    loadConfigList();
  }, "btn-primary btn-xs"));
  actions.appendChild(btn("Cancel", () => {
    form.replaceWith(rowEl);
  }, "btn-xs"));

  form.appendChild(enabledSelect);
  form.appendChild(valueArea);
  form.appendChild(descInput);
  form.appendChild(errDiv);
  form.appendChild(actions);

  rowEl.replaceWith(form);
}

async function loadConfigList(cursor?: string): Promise<void> {
  const container = document.getElementById("config-list");
  if (!container) return;
  if (!cursor) {
    clear(container);
    configCursor = null;
  }

  const existingBtn = container.querySelector(".config-load-more");
  if (existingBtn) existingBtn.remove();

  const loadingEl = h("p", { class: "muted" }, "Loading...");
  container.appendChild(loadingEl);

  const opts: { projectId?: string; environmentId?: string; cursor?: string; limit?: string } = { limit: "20" };
  if (configScope === "project" || configScope === "environment") {
    opts.projectId = state.projectId!;
  }
  if (configScope === "environment" && configEnvId) {
    opts.environmentId = configEnvId;
  }
  if (cursor) opts.cursor = cursor;

  if (configResource === "settings") {
    const result = await state.client.listConfigSettings(state.orgId!, opts);
    loadingEl.remove();
    if (!result.ok) { showError(result, container); return; }
    renderSettingsList(container, result.data, !!cursor);
    configCursor = result.meta.cursor;
  } else if (configResource === "feature-flags") {
    const result = await state.client.listFeatureFlags(state.orgId!, opts);
    loadingEl.remove();
    if (!result.ok) { showError(result, container); return; }
    renderFeatureFlagsList(container, result.data, !!cursor);
    configCursor = result.meta.cursor;
  } else {
    const result = await state.client.listSecretMetadata(state.orgId!, opts);
    loadingEl.remove();
    if (!result.ok) { showError(result, container); return; }
    renderSecretMetadataList(container, result.data, !!cursor);
    configCursor = result.meta.cursor;
  }

  if (configCursor) {
    const c = configCursor;
    container.appendChild(btn("Load More", () => loadConfigList(c), "btn-sm mt config-load-more"));
  }
}

function renderSettingsList(container: HTMLElement, settings: any[], isAppend: boolean): void {
  if (!settings.length && !isAppend) {
    container.appendChild(h("p", { class: "muted" }, "No settings found at this scope."));
    return;
  }
  for (const s of settings) {
    const row = h("div", { class: "list-item config-item" });
    const info = h("div", { class: "config-item-info" });
    info.appendChild(h("span", { class: "config-key" }, s.key));
    if (s.description) {
      info.appendChild(h("span", { class: "muted" }, ` — ${s.description}`));
    }
    info.appendChild(h("small", { class: "muted config-meta" },
      `Scope: ${s.scopeKind} · Updated: ${formatTimestamp(s.updatedAt)} · Created: ${formatTimestamp(s.createdAt)}`));

    // Render value safely as text
    const valueStr = typeof s.value === "string" ? s.value : JSON.stringify(s.value, null, 2);
    const valueEl = h("pre", { class: "config-value" });
    valueEl.appendChild(document.createTextNode(valueStr));
    info.appendChild(valueEl);

    row.appendChild(info);
    const actions = h("span", { class: "actions" });
    actions.appendChild(btn("Edit", () => renderSettingEditForm(s, container, row), "btn-xs"));
    row.appendChild(actions);
    container.appendChild(row);
  }
}

function renderFeatureFlagsList(container: HTMLElement, flags: any[], isAppend: boolean): void {
  if (!flags.length && !isAppend) {
    container.appendChild(h("p", { class: "muted" }, "No feature flags found at this scope."));
    return;
  }
  for (const f of flags) {
    const row = h("div", { class: "list-item config-item" });
    const info = h("div", { class: "config-item-info" });

    const headerLine = h("div", { class: "config-flag-header" });
    headerLine.appendChild(h("span", { class: "config-key" }, f.flagKey));
    headerLine.appendChild(h("span", { class: f.enabled ? "badge badge-auth" : "badge badge-revoked" },
      f.enabled ? "ENABLED" : "DISABLED"));
    info.appendChild(headerLine);

    if (f.description) {
      info.appendChild(h("span", { class: "muted" }, f.description));
    }
    info.appendChild(h("small", { class: "muted config-meta" },
      `Scope: ${f.scopeKind} · Updated: ${formatTimestamp(f.updatedAt)} · Created: ${formatTimestamp(f.createdAt)}`));

    if (f.value != null) {
      const valueStr = typeof f.value === "string" ? f.value : JSON.stringify(f.value, null, 2);
      const valueEl = h("pre", { class: "config-value" });
      valueEl.appendChild(document.createTextNode(valueStr));
      info.appendChild(valueEl);
    }

    row.appendChild(info);
    const actions = h("span", { class: "actions" });
    actions.appendChild(btn("Edit", () => renderFlagEditForm(f, container, row), "btn-xs"));
    row.appendChild(actions);
    container.appendChild(row);
  }
}

function renderSecretMetadataList(container: HTMLElement, secrets: any[], isAppend: boolean): void {
  if (!secrets.length && !isAppend) {
    container.appendChild(h("p", { class: "muted" }, "No secret metadata found at this scope."));
    return;
  }
  for (const s of secrets) {
    const row = h("div", { class: "list-item config-item" });
    const info = h("div", { class: "config-item-info" });

    const headerLine = h("div", { class: "config-flag-header" });
    headerLine.appendChild(h("span", { class: "config-key" }, s.secretKey));
    headerLine.appendChild(h("span", { class: "badge badge-org" }, s.status));
    if (s.displayName) {
      headerLine.appendChild(h("span", { class: "muted" }, s.displayName));
    }
    info.appendChild(headerLine);

    const meta: string[] = [];
    meta.push(`Scope: ${s.scopeKind}`);
    meta.push(`Version: ${s.version}`);
    if (s.rotationPolicy) meta.push(`Rotation: ${s.rotationPolicy}`);
    if (s.lastRotatedAt) meta.push(`Last rotated: ${formatTimestamp(s.lastRotatedAt)}`);
    if (s.expiresAt) meta.push(`Expires: ${formatTimestamp(s.expiresAt)}`);
    meta.push(`Created: ${formatTimestamp(s.createdAt)}`);
    meta.push(`Updated: ${formatTimestamp(s.updatedAt)}`);
    info.appendChild(h("small", { class: "muted config-meta" }, meta.join(" · ")));

    row.appendChild(info);
    container.appendChild(row);
  }
}

// --- Account View (Profile + Security Events) ---

function renderAccountView(): HTMLElement {
  const section = h("section", { class: "panel" });

  const header = h("div", { class: "form-group" });
  header.appendChild(btn("\u2190 Back", () => {
    accountView = null;
    render();
  }, "btn-sm"));
  header.appendChild(h("h2", {}, "Account Settings"));
  section.appendChild(header);

  const nav = h("nav", { class: "form-group" });
  nav.appendChild(btn("Profile", () => {
    accountView = "profile";
    render();
  }, accountView === "profile" ? "btn-sm btn-active" : "btn-sm"));
  nav.appendChild(btn("Security Events", () => {
    accountView = "security";
    render();
  }, accountView === "security" ? "btn-sm btn-active" : "btn-sm"));
  section.appendChild(nav);

  if (accountView === "profile") {
    section.appendChild(renderProfileSection());
  } else {
    section.appendChild(renderSecurityEventsSection());
  }

  return section;
}

// --- Profile Section ---

function renderProfileSection(): HTMLElement {
  const container = h("div", { class: "mt" });
  container.appendChild(h("h3", {}, "Profile"));
  container.appendChild(h("p", { class: "muted" }, "View and update your display name. Email cannot be changed here."));

  const profileContent = h("div", { id: "profile-content" });
  container.appendChild(profileContent);
  loadProfile();

  return container;
}

async function loadProfile(): Promise<void> {
  const container = document.getElementById("profile-content");
  if (!container) return;
  clear(container);
  container.appendChild(h("p", { class: "muted" }, "Loading..."));

  const result = await state.client.getProfile();
  clear(container);

  if (!result.ok) {
    showError(result, container);
    return;
  }

  const user = result.data.user;

  // Update in-memory session state with latest profile data
  if (state.session) {
    state = updateDisplayName(state, user.displayName);
  }

  const emailRow = h("div", { class: "form-group" });
  emailRow.appendChild(h("label", {}, "Email"));
  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.value = user.email;
  emailInput.readOnly = true;
  emailInput.className = "muted";
  emailRow.appendChild(emailInput);
  container.appendChild(emailRow);

  const nameRow = h("div", { class: "form-group mt" });
  nameRow.appendChild(h("label", {}, "Display Name"));
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.id = "profile-display-name";
  nameInput.placeholder = "Display name (optional)";
  nameInput.value = user.displayName ?? "";
  nameRow.appendChild(nameInput);
  container.appendChild(nameRow);

  const actions = h("div", { class: "form-group mt" });
  actions.appendChild(btn("Save", handleSaveProfile, "btn-primary"));
  actions.appendChild(btn("Clear Name", handleClearDisplayName, "btn-secondary"));
  container.appendChild(actions);

  container.appendChild(h("div", { id: "profile-result", class: "mt" }));
}

async function handleSaveProfile(): Promise<void> {
  const nameInput = document.getElementById("profile-display-name") as HTMLInputElement | null;
  if (!nameInput) return;

  const container = document.getElementById("profile-result");
  if (container) clear(container);

  const raw = nameInput.value.trim();
  const displayName = raw === "" ? null : raw;

  const result = await state.client.updateProfile({ displayName });

  if (!result.ok) {
    if (container) showError(result, container);
    return;
  }

  state = updateDisplayName(state, result.data.user.displayName);
  if (container) {
    container.appendChild(h("p", { class: "success" }, "Profile updated."));
  }
  // Re-render topbar to reflect new display name
  const topbarEl = document.querySelector(".app-topbar");
  if (topbarEl) {
    const newTopbar = renderTopbar();
    topbarEl.replaceWith(newTopbar);
  }
}

async function handleClearDisplayName(): Promise<void> {
  const container = document.getElementById("profile-result");
  if (container) clear(container);

  const result = await state.client.updateProfile({ displayName: null });

  if (!result.ok) {
    if (container) showError(result, container);
    return;
  }

  state = updateDisplayName(state, null);
  const nameInput = document.getElementById("profile-display-name") as HTMLInputElement | null;
  if (nameInput) nameInput.value = "";
  if (container) {
    container.appendChild(h("p", { class: "success" }, "Display name cleared."));
  }
  const topbarEl = document.querySelector(".app-topbar");
  if (topbarEl) {
    const newTopbar = renderTopbar();
    topbarEl.replaceWith(newTopbar);
  }
}

// --- Security Events Section ---

function renderSecurityEventsSection(): HTMLElement {
  const container = h("div", { class: "mt" });
  container.appendChild(h("h3", {}, "Security Events"));
  container.appendChild(h("p", { class: "muted" }, "Your recent sign-in and session activity. This view is scoped to your account, not an organization."));

  const list = h("div", { id: "security-events-list", class: "mt" });
  container.appendChild(list);
  loadSecurityEvents();

  return container;
}

let securityEventsCursor: string | null = null;

async function loadSecurityEvents(cursor?: string): Promise<void> {
  const container = document.getElementById("security-events-list");
  if (!container) return;
  if (!cursor) {
    clear(container);
    securityEventsCursor = null;
  }

  // Remove any existing "Load More" button before appending loading indicator
  const existingBtn = container.querySelector(".security-load-more");
  if (existingBtn) existingBtn.remove();

  const loadingEl = h("p", { class: "muted" }, "Loading...");
  container.appendChild(loadingEl);

  const opts: { cursor?: string; limit?: string } = { limit: "50" };
  if (cursor) opts.cursor = cursor;
  const result = await state.client.listSecurityEvents(opts);

  loadingEl.remove();

  if (!result.ok) {
    showError(result, container);
    return;
  }

  for (const evt of result.data) {
    const outcomeCls = evt.outcome === "success" ? "security-outcome-success" : "security-outcome-failure";
    const row = h("div", { class: "list-item security-event" },
      h("span", { class: "security-event-type" }, evt.eventType),
      h("span", { class: outcomeCls }, evt.outcome),
      h("small", { class: "muted" }, formatTimestamp(evt.occurredAt)),
    );

    // Request context details
    const details: string[] = [];
    if (evt.ip) details.push(`IP: ${evt.ip}`);
    if (evt.userAgent) details.push(`UA: ${truncate(evt.userAgent, 60)}`);
    if (evt.requestId) details.push(`Req: ${evt.requestId}`);
    if (evt.correlationId) details.push(`Corr: ${evt.correlationId}`);
    if (details.length) {
      row.appendChild(h("small", { class: "muted security-event-details" }, details.join(" · ")));
    }

    container.appendChild(row);
  }

  if (!result.data.length && !cursor) {
    container.appendChild(h("p", { class: "muted" }, "No security events recorded yet."));
  }

  securityEventsCursor = result.meta.cursor;
  if (securityEventsCursor) {
    const c = securityEventsCursor;
    const loadMoreBtn = btn("Load More", () => loadSecurityEvents(c), "btn-sm mt security-load-more");
    container.appendChild(loadMoreBtn);
  }
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "\u2026" : s;
}

// --- Boot ---
render();
