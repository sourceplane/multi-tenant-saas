import type { Env } from "../env.js";
import type { BillingProvider, BillingProviderId } from "./types.js";
import { createPolarProvider, type PolarServer } from "./polar.js";

/**
 * Billing-provider registry + config resolution (BP0).
 *
 * The active provider is chosen per-environment by the `BILLING_PROVIDER` var
 * (default "polar"). Adapters are registered into a map; resolving an id with
 * no registered adapter fails closed with `not_configured` (callers must never
 * throw/512 on a missing provider). The production map is intentionally empty
 * until BP1 wires the Polar adapter, so this milestone is dormant.
 */

export const DEFAULT_BILLING_PROVIDER: BillingProviderId = "polar";

const KNOWN_PROVIDERS: ReadonlySet<string> = new Set<BillingProviderId>([
  "polar",
  "stripe",
]);

/** Resolve the configured provider id from env; defaults to polar; null if unknown. */
export function resolveProviderId(
  env: Pick<Env, "BILLING_PROVIDER">,
): BillingProviderId | null {
  const raw = env.BILLING_PROVIDER?.trim();
  if (!raw) return DEFAULT_BILLING_PROVIDER;
  if (!KNOWN_PROVIDERS.has(raw)) return null;
  return raw as BillingProviderId;
}

export type ResolveProviderResult =
  | { ok: true; provider: BillingProvider }
  | { ok: false; reason: "unknown_provider" | "not_configured" };

export interface BillingProviderRegistry {
  /** The adapter registered for `id`, or null. */
  get(id: BillingProviderId): BillingProvider | null;
  /** Resolve the env-selected adapter, failing closed when unknown/unconfigured. */
  resolve(env: Pick<Env, "BILLING_PROVIDER">): ResolveProviderResult;
}

/**
 * Build a registry over a (possibly partial) map of provider adapters.
 * Exposed so tests can inject fakes and BP1 can register the real Polar adapter.
 */
export function createBillingProviderRegistry(
  adapters: Partial<Record<BillingProviderId, BillingProvider>>,
): BillingProviderRegistry {
  return {
    get(id) {
      return adapters[id] ?? null;
    },
    resolve(env) {
      const id = resolveProviderId(env);
      if (id === null) return { ok: false, reason: "unknown_provider" };
      const provider = adapters[id];
      if (!provider) return { ok: false, reason: "not_configured" };
      return { ok: true, provider };
    },
  };
}

type PolarEnv = Pick<
  Env,
  "POLAR_ACCESS_TOKEN" | "POLAR_WEBHOOK_SECRET" | "POLAR_SERVER"
>;

/** Build the Polar adapter from env, or null when its secrets are not configured. */
export function buildPolarProvider(env: PolarEnv): BillingProvider | null {
  const accessToken = env.POLAR_ACCESS_TOKEN?.trim();
  const webhookSecret = env.POLAR_WEBHOOK_SECRET?.trim();
  if (!accessToken || !webhookSecret) return null;
  const server: PolarServer =
    env.POLAR_SERVER?.trim() === "production" ? "production" : "sandbox";
  return createPolarProvider({ accessToken, server, webhookSecret });
}

/**
 * The production registry. Registers the Polar adapter (BP1) whenever its
 * secrets are present in `env`; otherwise stays empty and resolves to
 * `not_configured`, exactly as in BP0. Passing no env (or env without Polar
 * secrets) keeps the registry dormant — no public behavior change until the
 * human-gated `POLAR_ACCESS_TOKEN` / `POLAR_WEBHOOK_SECRET` are set per env.
 */
export function createDefaultBillingProviderRegistry(
  env?: PolarEnv,
): BillingProviderRegistry {
  const polar = env ? buildPolarProvider(env) : null;
  return createBillingProviderRegistry(polar ? { polar } : {});
}
