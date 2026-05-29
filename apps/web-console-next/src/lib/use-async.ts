"use client";

import * as React from "react";
import type { ApiResult } from "@/lib/api";
import { useSession } from "@/lib/session";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: { code: string; message: string } | null;
  reload: () => void;
}

export function useAsync<T>(
  fn: () => Promise<ApiResult<T>>,
  deps: React.DependencyList,
): AsyncState<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<{ code: string; message: string } | null>(null);
  const [seq, setSeq] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fn().then(
      (r) => {
        if (cancelled) return;
        if (r.ok) {
          setData(r.data);
        } else {
          setError({ code: r.error.code, message: r.error.message });
        }
        setLoading(false);
      },
      (e: unknown) => {
        if (cancelled) return;
        setError({ code: "exception", message: (e as Error).message });
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [...deps, seq]);

  return { data, loading, error, reload: () => setSeq((x) => x + 1) };
}

/** Redirects to /login if no token in session. Returns whether session is present. */
export function useRequireAuth(): boolean {
  const { token } = useSession();
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    setReady(true);
    if (typeof window !== "undefined" && !token) {
      window.location.href = "/login";
    }
  }, [token]);
  return ready && !!token;
}
