"use client";

import * as React from "react";
import type { Sourceplane } from "@saas/sdk";
import {
  TARGETS,
  DEPLOY_ENV,
  createClient,
  type ApiTarget,
} from "./api";

const TOKEN_KEY = "sourceplane.next.token";
const TARGET_KEY = "sourceplane.next.target";

interface SessionCtx {
  client: Sourceplane;
  target: ApiTarget;
  token: string | null;
  setToken: (t: string | null) => void;
  setTarget: (t: ApiTarget) => void;
  availableTargets: ApiTarget[];
  isLocked: boolean;
  deployEnv: string | undefined;
}

const Ctx = React.createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [target, setTargetState] = React.useState<ApiTarget>(() => TARGETS[0]!);
  const [token, setTokenState] = React.useState<string | null>(null);

  // Hydrate from localStorage on the client.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedTarget = window.localStorage.getItem(TARGET_KEY);
      if (savedTarget) {
        const found = TARGETS.find((t) => t.name === savedTarget);
        if (found) setTargetState(found);
      }
      const savedToken = window.localStorage.getItem(TOKEN_KEY);
      if (savedToken) setTokenState(savedToken);
    } catch {
      /* ignore */
    }
  }, []);

  const client = React.useMemo(() => createClient(target, token), [target, token]);

  const setToken = React.useCallback((t: string | null) => {
    setTokenState(t);
    if (typeof window !== "undefined") {
      try {
        if (t) window.localStorage.setItem(TOKEN_KEY, t);
        else window.localStorage.removeItem(TOKEN_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const setTarget = React.useCallback((t: ApiTarget) => {
    setTargetState(t);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(TARGET_KEY, t.name);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const value = React.useMemo<SessionCtx>(
    () => ({
      client,
      target,
      token,
      setToken,
      setTarget,
      availableTargets: TARGETS,
      isLocked: TARGETS.length === 1 && !!DEPLOY_ENV,
      deployEnv: DEPLOY_ENV,
    }),
    [client, target, token, setToken, setTarget],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useSession must be used inside <SessionProvider>");
  return c;
}
