import type { Env } from "./env.js";
import { route } from "./router.js";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return route(request, env);
  },

  // Cron drain (IG2): attribute received inbound deliveries to connections,
  // process provider lifecycle events, normalize and emit `scm.*` into the
  // event log. Dormant in IG0 — the trigger is wired so the IG2 PR is purely
  // additive, but no inbox rows can exist before the ingress lands.
  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    if (!env.SOURCEPLANE_DB) {
      return;
    }
  },
} satisfies ExportedHandler<Env>;
