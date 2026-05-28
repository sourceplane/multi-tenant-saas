import { ApiClient, TARGETS } from "./api";
import type { ApiTarget } from "./api";

export interface AppState {
  target: ApiTarget;
  client: ApiClient;
  authenticated: boolean;
  session: { userId: string; email: string; displayName: string | null } | null;
  orgId: string | null;
  orgName: string | null;
  projectId: string | null;
  projectName: string | null;
}

const clients = new Map<string, ApiClient>();

function getClient(target: ApiTarget): ApiClient {
  let client = clients.get(target.name);
  if (!client) {
    client = new ApiClient(target);
    const saved = localStorage.getItem(`token:${target.name}`);
    if (saved) client.setToken(saved);
    clients.set(target.name, client);
  }
  return client;
}

export function createState(): AppState {
  const savedTarget = localStorage.getItem("target");
  const target = TARGETS.find((t) => t.name === savedTarget) ?? TARGETS[0]!;
  const client = getClient(target);

  return {
    target,
    client,
    authenticated: !!client.getToken(),
    session: null,
    orgId: localStorage.getItem(`orgId:${target.name}`),
    orgName: localStorage.getItem(`orgName:${target.name}`),
    projectId: localStorage.getItem(`projectId:${target.name}`),
    projectName: localStorage.getItem(`projectName:${target.name}`),
  };
}

export function switchTarget(state: AppState, target: ApiTarget): AppState {
  localStorage.setItem("target", target.name);
  const client = getClient(target);
  return {
    ...state,
    target,
    client,
    authenticated: !!client.getToken(),
    session: null,
    orgId: localStorage.getItem(`orgId:${target.name}`),
    orgName: localStorage.getItem(`orgName:${target.name}`),
    projectId: localStorage.getItem(`projectId:${target.name}`),
    projectName: localStorage.getItem(`projectName:${target.name}`),
  };
}

export function setAuthenticated(state: AppState, token: string, session: AppState["session"]): AppState {
  state.client.setToken(token);
  localStorage.setItem(`token:${state.target.name}`, token);
  return { ...state, authenticated: true, session };
}

export function setManualToken(state: AppState, token: string): AppState {
  state.client.setToken(token);
  localStorage.setItem(`token:${state.target.name}`, token);
  return { ...state, authenticated: true, session: null };
}

export function clearAuth(state: AppState): AppState {
  state.client.setToken(null);
  localStorage.removeItem(`token:${state.target.name}`);
  localStorage.removeItem(`orgId:${state.target.name}`);
  localStorage.removeItem(`orgName:${state.target.name}`);
  localStorage.removeItem(`projectId:${state.target.name}`);
  localStorage.removeItem(`projectName:${state.target.name}`);
  return { ...state, authenticated: false, session: null, orgId: null, orgName: null, projectId: null, projectName: null };
}

export function selectOrg(state: AppState, orgId: string, orgName: string): AppState {
  localStorage.setItem(`orgId:${state.target.name}`, orgId);
  localStorage.setItem(`orgName:${state.target.name}`, orgName);
  localStorage.removeItem(`projectId:${state.target.name}`);
  localStorage.removeItem(`projectName:${state.target.name}`);
  return { ...state, orgId, orgName, projectId: null, projectName: null };
}

export function selectProject(state: AppState, projectId: string, projectName: string): AppState {
  localStorage.setItem(`projectId:${state.target.name}`, projectId);
  localStorage.setItem(`projectName:${state.target.name}`, projectName);
  return { ...state, projectId, projectName };
}

export function updateDisplayName(state: AppState, displayName: string | null): AppState {
  if (state.session) {
    return { ...state, session: { ...state.session, displayName } };
  }
  return state;
}

export function clearProject(state: AppState): AppState {
  localStorage.removeItem(`projectId:${state.target.name}`);
  localStorage.removeItem(`projectName:${state.target.name}`);
  return { ...state, projectId: null, projectName: null };
}
