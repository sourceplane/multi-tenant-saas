import { TARGETS } from "./api";
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
} from "./state";

let state = createState();

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

function render(): void {
  const app = $("app");
  clear(app);
  app.appendChild(renderHeader());
  app.appendChild(renderMain());
}

function renderHeader(): HTMLElement {
  const header = h("header", { class: "app-header" });

  const title = h("div", { class: "header-left" }, h("strong", {}, "Sourceplane Console"));

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

  const ctx = h("div", { class: "header-context" });
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

  const right = h("div", { class: "header-right" });
  right.appendChild(targetSelect);
  if (state.authenticated) {
    right.appendChild(btn("Logout", handleLogout, "btn-sm btn-danger"));
  }

  header.appendChild(title);
  header.appendChild(ctx);
  header.appendChild(right);
  return header;
}

function renderMain(): HTMLElement {
  const main = h("main", { class: "app-main" });

  if (!state.authenticated) {
    main.appendChild(renderAuthView());
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
  render();
}

// --- Organization Select View ---

function renderOrgSelectView(): HTMLElement {
  const section = h("section", { class: "panel" });
  section.appendChild(h("h2", {}, "Organizations"));

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
  container.appendChild(h("p", { class: "muted" }, "Loading..."));

  const result = await state.client.listOrganizations();
  clear(container);

  if (!result.ok) {
    showError(result, container);
    return;
  }

  const orgs = result.data;
  if (!orgs.length) {
    container.appendChild(h("p", { class: "muted" }, "No organizations. Create one below."));
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
  const tabs = ["Members", "Invitations", "Projects", "Audit"];
  const activeTab = getActiveTab();

  nav.appendChild(btn("\u2190 Orgs", () => {
    state = { ...state, orgId: null, orgName: null, projectId: null, projectName: null };
    localStorage.removeItem(`orgId:${state.target.name}`);
    localStorage.removeItem(`orgName:${state.target.name}`);
    localStorage.removeItem(`projectId:${state.target.name}`);
    localStorage.removeItem(`projectName:${state.target.name}`);
    render();
  }, "btn-sm"));

  for (const tab of tabs) {
    const cls = tab.toLowerCase() === activeTab ? "btn-sm btn-active" : "btn-sm";
    nav.appendChild(btn(tab, () => setTab(tab.toLowerCase()), cls));
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

  switch (tab) {
    case "members": renderMembersTab(content); break;
    case "invitations": renderInvitationsTab(content); break;
    case "projects": renderProjectsTab(content); break;
    case "audit": renderAuditTab(content); break;
  }
}

// --- Members Tab ---

async function renderMembersTab(container: HTMLElement): Promise<void> {
  container.appendChild(h("h3", {}, "Members"));
  const list = h("div", { id: "members-list" });
  container.appendChild(list);
  list.appendChild(h("p", { class: "muted" }, "Loading..."));

  const result = await state.client.listMembers(state.orgId!);
  clear(list);

  if (!result.ok) {
    showError(result, list);
    return;
  }

  for (const member of result.data) {
    const row = h("div", { class: "list-item" });
    const roles = member.roles?.map((r) => r.role).join(", ") ?? "unknown";
    row.appendChild(h("span", {}, `${(member as any).email ?? member.subjectId} — ${roles}`));
    row.appendChild(h("small", { class: "muted" }, ` (${member.id})`));

    const actions = h("span", { class: "actions" });
    actions.appendChild(btn("Change Role", () => promptRoleChange(member.id), "btn-xs"));
    actions.appendChild(btn("Remove", () => handleRemoveMember(member.id), "btn-xs btn-danger"));
    row.appendChild(actions);
    list.appendChild(row);
  }

  if (!result.data.length) {
    list.appendChild(h("p", { class: "muted" }, "No members found."));
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
  container.appendChild(h("h3", {}, "Invitations"));

  const createDiv = h("div", { class: "form-group" });
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
  createDiv.appendChild(emailInput);
  createDiv.appendChild(roleSelect);
  createDiv.appendChild(btn("Send Invite", handleCreateInvitation, "btn-primary"));
  createDiv.appendChild(h("div", { id: "invite-result" }));
  container.appendChild(createDiv);

  const acceptDiv = h("div", { class: "form-group mt" });
  acceptDiv.appendChild(h("h4", {}, "Accept Invitation"));
  const tokenInput = document.createElement("input");
  tokenInput.placeholder = "Invitation token";
  tokenInput.id = "accept-token";
  acceptDiv.appendChild(tokenInput);
  acceptDiv.appendChild(btn("Accept", handleAcceptInvitation, "btn-secondary"));
  acceptDiv.appendChild(h("div", { id: "accept-result" }));
  container.appendChild(acceptDiv);

  const list = h("div", { id: "invitations-list", class: "mt" });
  container.appendChild(list);
  list.appendChild(h("p", { class: "muted" }, "Loading..."));

  const result = await state.client.listInvitations(state.orgId!);
  clear(list);

  if (!result.ok) {
    showError(result, list);
    return;
  }

  for (const inv of result.data) {
    const row = h("div", { class: "list-item" },
      h("span", {}, `${inv.email} — ${inv.status} (${inv.role})`),
      h("small", { class: "muted" }, ` expires: ${inv.expiresAt}`),
    );
    if (inv.status === "pending") {
      row.appendChild(btn("Revoke", () => handleRevokeInvitation(inv.id), "btn-xs btn-danger"));
    }
    list.appendChild(row);
  }

  if (!result.data.length) {
    list.appendChild(h("p", { class: "muted" }, "No invitations."));
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
  const result = await state.client.acceptInvitation(token);
  if (!result.ok) {
    showError(result, container);
    return;
  }
  container.appendChild(h("p", { class: "success" }, "Invitation accepted."));
}

// --- Projects Tab ---

async function renderProjectsTab(container: HTMLElement): Promise<void> {
  container.appendChild(h("h3", {}, "Projects"));

  if (state.projectId) {
    await renderProjectDetail(container);
    return;
  }

  const createDiv = h("div", { class: "form-group" });
  const nameInput = document.createElement("input");
  nameInput.placeholder = "New project name";
  nameInput.id = "new-project-name";
  const slugInput = document.createElement("input");
  slugInput.placeholder = "Slug (optional)";
  slugInput.id = "new-project-slug";
  createDiv.appendChild(nameInput);
  createDiv.appendChild(slugInput);
  createDiv.appendChild(btn("Create Project", handleCreateProject, "btn-primary"));
  createDiv.appendChild(h("div", { id: "create-project-result" }));
  container.appendChild(createDiv);

  const list = h("div", { id: "projects-list", class: "mt" });
  container.appendChild(list);
  list.appendChild(h("p", { class: "muted" }, "Loading..."));

  const result = await state.client.listProjects(state.orgId!);
  clear(list);

  if (!result.ok) {
    showError(result, list);
    return;
  }

  for (const proj of result.data) {
    const row = h("div", { class: "list-item" },
      h("span", {}, `${proj.name} `),
      h("small", { class: "muted" }, `(${proj.id}) — ${proj.status}`),
    );
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
    list.appendChild(h("p", { class: "muted" }, "No projects. Create one above."));
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
  list.appendChild(h("p", { class: "muted" }, "Loading..."));

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
    list.appendChild(h("p", { class: "muted" }, "No environments. Create one above."));
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

// --- Audit Tab ---

async function renderAuditTab(container: HTMLElement): Promise<void> {
  container.appendChild(h("h3", {}, "Audit Log"));

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
  container.appendChild(h("p", { class: "muted" }, "Loading..."));

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

  for (const entry of result.data) {
    const row = h("div", { class: "list-item audit-entry" },
      h("span", { class: "audit-action" }, entry.eventType),
      h("span", {}, ` — ${entry.actorId}`),
      h("small", { class: "muted" }, ` ${entry.occurredAt}`),
    );
    if (entry.subject) {
      row.appendChild(h("small", { class: "muted" }, ` [${entry.subject.kind}:${entry.subject.id}]`));
    }
    container.appendChild(row);
  }

  if (!result.data.length && !cursor) {
    container.appendChild(h("p", { class: "muted" }, "No audit entries."));
  }

  auditCursor = result.meta.cursor;
  if (auditCursor) {
    const c = auditCursor;
    container.appendChild(btn("Load More", () => loadAudit(c), "btn-sm mt"));
  }
}

// --- Boot ---
render();
