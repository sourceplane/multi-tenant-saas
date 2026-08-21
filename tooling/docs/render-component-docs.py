#!/usr/bin/env python3
"""Render the three registered docs for every component, from the manifests.

  Usage:  python3 tooling/docs/render-component-docs.py [--check]

Every component registers three pages in its `component.yaml`:

    docs:
      overview: docs/overview.md
      pages:
        - { path: docs/architecture.md, role: architecture }
        - { path: docs/runbook.md, role: runbook }

Those pages are GENERATED, not hand-written, because almost everything in
them is already declared somewhere else: the description, the composition
type, the dependency edges, the wiring secrets a deploy resolves. Writing
them by hand means writing the dependency graph down a second time, and a
second copy of a graph is a copy that goes stale — silently, because a
stale doc still renders.

`--check` re-renders into memory and diffs against what is committed,
exiting non-zero on any drift. That runs in CI, so a manifest change that
would invalidate a doc fails the lane that made it rather than surfacing
months later when someone reads the doc and is misled.

What is NOT derivable lives in LEDES below: one sentence per component
that says what the thing is FOR. A generator cannot infer purpose from a
dependency graph, and pretending otherwise produces the worst kind of
documentation — the kind that is technically accurate and says nothing.
"""

from __future__ import annotations

import difflib
import pathlib
import re
import sys

import yaml

REPO = pathlib.Path(__file__).resolve().parents[2]
ROOTS = ("apps", "packages", "tests", "infra")

# The workers.dev subdomain is declared once, in the api-edge identity seam
# (BF3). Read it rather than repeating it — a doc that hardcodes the
# baseline's subdomain is wrong in every fork the moment it is instantiated.
APP_CONFIG = REPO / "apps" / "api-edge" / "src" / "app-config.ts"


def workers_dev_subdomain() -> str:
    m = re.search(r'WORKERS_DEV_SUBDOMAIN\s*=\s*"([^"]+)"', APP_CONFIG.read_text())
    if not m:
        raise SystemExit(f"could not read WORKERS_DEV_SUBDOMAIN from {APP_CONFIG}")
    return m.group(1)


# ── What each component is for ────────────────────────────────────────────
# Purpose is not derivable. Everything else on the page is.
LEDES = {
    "api-edge": (
        "The single public entry point. Every request from outside enters here, is "
        "authenticated and rate-limited, and is routed to the owning bounded-context "
        "Worker over a service binding. Nothing else in the fleet is publicly routable."
    ),
    "identity-worker": (
        "The authentication runtime: sessions, token mint and refresh, magic-link and "
        "OAuth flows."
    ),
    "membership-worker": (
        "Organizations, members, roles, invitations and join requests — the tenancy spine "
        "the rest of the platform resolves against."
    ),
    "projects-worker": "Projects and their environments inside a workspace.",
    "policy-worker": (
        "Authorization decisions. Every permission question in the product resolves here, "
        "against one engine, so a permission cannot mean one thing in the API and another "
        "in the console."
    ),
    "events-worker": (
        "The event stream and the audit trail — streams, groups, dead letters, and a "
        "scheduled retention sweep that ages records out on purpose."
    ),
    "notifications-worker": "Notification rules, channels and delivery for the whole platform.",
    "webhooks-worker": (
        "Outbound webhook endpoints, subscriptions and delivery attempts, with signed "
        "payloads customers can verify."
    ),
    "billing-worker": (
        "Plans, checkout and entitlements. Private by construction — reachable only over a "
        "service binding, never from the edge."
    ),
    "metering-worker": "Usage recording and quota checks behind the entitlement gates.",
    "config-worker": "The read surface for configuration, secrets and feature flags.",
    "integrations-worker": (
        "Provider connections, the GitHub App installation, the inbound delivery inbox, and "
        "the repo-scoped token broker that lets the product act on GitHub without holding "
        "credentials."
    ),
    "admin-worker": (
        "Internal support and administration diagnostics. Every call is audited."
    ),
    "web-console-next": (
        "The console UI — Next.js compiled to a Cloudflare Worker with Static Assets, "
        "configured against the API edge."
    ),
    # Shared packages
    "contracts": (
        "Wire types and schemas. Every Worker, the SDK and the console read the same file, "
        "which is what makes contract drift a build error rather than a production surprise."
    ),
    "db": "Schema, repositories and the migration set, one module per bounded context.",
    "shared": "Cross-cutting runtime helpers shared by every Worker. No domain knowledge.",
    "policy-engine": (
        "The authorization engine, the predicate evaluator for secret conditions and flag "
        "targeting, and deterministic flag bucketing shared by Worker, SDK and console — "
        "three approximations of a hash agree right up until a user reports flicker."
    ),
    "sdk": "Runtime-agnostic TypeScript SDK for the control-plane API.",
    "cli": "First-class CLI over the same API, sharing the SDK's types.",
    "notifications-client": "Typed client for emitting notifications from any context.",
    "webhook-verifier": "Signature verification, published for customers to use.",
    "testing": "Shared fixtures and harnesses the per-context test packages build on.",
    # Infrastructure
    "supabase": (
        "Provisions the Postgres project for each live environment and publishes its "
        "credentials as wiring secrets."
    ),
    "cloudflare-hyperdrive": (
        "Pooled Postgres connectivity for the Workers runtime, originating from the "
        "connection `supabase` published."
    ),
    "cloudflare-kv": (
        "The KV namespace backing the edge idempotency replay store and rate-limit buckets."
    ),
    "cloudflare-domain": (
        "The zone, and the custom-domain attach for each environment's console. Optional — "
        "workers.dev URLs work without it."
    ),
    "db-migrate": (
        "Owns the database schema: migrations plan on pull requests and apply on merge, per "
        "environment, ordered after the Supabase projects exist."
    ),
}

# The shared deploy/rollback contract. Identical for everything that deploys,
# because it IS identical — the convergence run is the deployment.
DEPLOY_RUNBOOK = """## How it deploys

Merges to `main` converge automatically: CI plans changed components
(`orun plan --changed`) and runs this component's lane via
`orun run --remote-state` with credential-free OIDC auth. The convergence
run is the deployment; the DAG orders this component after everything it
depends on. Failed lanes resume with `gh run rerun --failed`.

## Rollback

Revert the offending commit on `main`; the next convergence applies the
previous desired state. There is no out-of-band mutation to undo — the
repo is the source of truth.
"""


def load_components() -> dict:
    comps = {}
    for root in ROOTS:
        for man in sorted((REPO / root).rglob("component.yaml")):
            doc = yaml.safe_load(man.read_text()) or {}
            meta, spec = doc.get("metadata") or {}, doc.get("spec") or {}
            name = meta.get("name")
            if not name:
                continue
            comps[name] = {
                "name": name,
                "description": (meta.get("description") or "").strip(),
                "type": spec.get("type", ""),
                "dir": man.parent,
                "rel": man.parent.relative_to(REPO).as_posix(),
                "depends": sorted(
                    d["component"] for d in (spec.get("dependsOn") or []) if d.get("component")
                ),
                # What it CONSUMES (secretEnv) and what it PUBLISHES
                # (parameters.secretOutputs) are different directions and must
                # not be conflated — a terraform component's credentials are
                # not its wiring outputs.
                "wiring": sorted((spec.get("secretEnv") or {}).keys()),
                "optional_secrets": sorted((spec.get("optionalSecretEnv") or {}).keys()),
                "publishes": sorted(
                    pair.split("=", 1)[0]
                    for pair in re.split(
                        r"[,\s]+", str((spec.get("parameters") or {}).get("secretOutputs", ""))
                    )
                    if pair
                ),
            }
    for c in comps.values():
        c["dependents"] = sorted(o["name"] for o in comps.values() if c["name"] in o["depends"])
    return comps


def bullets(names, comps, empty="- (none)"):
    if not names:
        return empty
    out = []
    for n in names:
        desc = comps.get(n, {}).get("description", "")
        out.append(f"- **{n}** — {desc}" if desc else f"- **{n}**")
    return "\n".join(out)


def is_test(c):
    return c["rel"].startswith("tests/")


def is_package(c):
    return c["rel"].startswith("packages/")


def target_of(c):
    """`policy-engine-tests` verifies `policy-engine`. Lumen's generator lost
    this and every test page reads "Verification suite for `None`"."""
    return c["name"][: -len("-tests")] if c["name"].endswith("-tests") else None


# ── overview ──────────────────────────────────────────────────────────────


def overview(c, comps, sub):
    lede = LEDES.get(c["name"], "")
    head = [f"# {c['name']}", ""]
    if c["description"]:
        head += [c["description"], ""]

    t, body = c["type"], []
    if t == "cloudflare-worker-turbo":
        if c["name"] == "api-edge":
            body = [
                lede,
                "",
                "A Cloudflare Worker deployed per environment (`stage`, `prod`; `dev` is "
                f"verify-only), public at `https://api-edge-{{stage,prod}}.{sub}.workers.dev`.",
            ]
        else:
            body = [
                lede,
                "",
                "A Cloudflare Worker deployed per environment (`stage`, `prod`; `dev` is "
                "verify-only). Not publicly routable — reached only through `api-edge` "
                "service bindings.",
            ]
    elif t == "cloudflare-workers-assets-turbo":
        body = [lede, "", "Deployed per environment as a Worker plus a static-assets upload."]
    elif t == "terraform":
        body = [lede, "", "Applied per live environment (`stage`, `prod`); `dev` provisions nothing."]
    elif t == "db-migrate":
        body = [lede]
    elif is_test(c):
        tgt = target_of(c)
        body = [
            f"Verification suite for `{tgt}`." if tgt else "Verification suite.",
            "",
            "A verify-only component: its lane runs this suite on every plan that includes "
            "it. Nothing deploys from here — a red lane blocks the convergence, which is "
            "the point.",
        ]
    else:  # shared workspace package
        body = [
            lede,
            "",
            "A shared package of this workspace, consumed by the components below at build "
            "time. There is no publish step — the repo is the registry.",
        ]

    out = head + [ln for ln in body if ln is not None]
    if not is_test(c) and not is_package(c):
        out += ["", "## Depends on", "", bullets(c["depends"], comps)]
    elif c["depends"]:
        out += ["", "## Depends on", "", bullets(c["depends"], comps)]
    out += ["", "## Depended on by", "", bullets(c["dependents"], comps)]
    return "\n".join(out).rstrip() + "\n"


# ── architecture ──────────────────────────────────────────────────────────


def architecture(c, comps, sub):
    t = c["type"]
    head = [f"# {c['name']} — architecture", ""]

    if t in ("cloudflare-worker-turbo", "cloudflare-workers-assets-turbo"):
        kind = (
            "TypeScript Worker built by the turbo pipeline"
            if t == "cloudflare-worker-turbo"
            else "Next.js app built through OpenNext into a Worker entrypoint plus an assets "
            "directory"
        )
        out = head + [
            f"A `{t}` component: {kind} from `{c['rel']}`, deployed per environment by its "
            "CI lane.",
            "",
            "## Bindings and wiring",
            "",
        ]
        svc = [d for d in c["depends"] if comps.get(d, {}).get("type", "").startswith("cloudflare-worker")]
        if svc:
            out += [
                f"- **Service bindings** → {', '.join(f'`{s}`' for s in svc)} — in-process "
                "RPC to sibling Workers; no public hops between contexts.",
            ]
        if c["wiring"]:
            out += [
                "- **Wired configuration**, resolved at deploy time from the wiring secrets "
                "the infrastructure components publish (names only, never values): "
                + ", ".join(f"`{w}`" for w in c["wiring"])
                + ".",
            ]
        if c["optional_secrets"]:
            out += [
                "- **Runtime secrets**, wire-now-seed-later: "
                + ", ".join(f"`{s}`" for s in c["optional_secrets"])
                + ". An unseeded key is skipped at resolve, so this component deploys before "
                "those credentials exist.",
            ]
        if not svc and not c["wiring"] and not c["optional_secrets"]:
            out += ["- No service bindings, wiring documents or runtime secrets."]
        out += [
            "",
            "Verify lanes render these bindings from the committed fixture instead, which is "
            "what makes a pull request offline by construction — it cannot obtain "
            "credentials or reach a state backend.",
        ]
        if c["name"] == "api-edge":
            out += [
                "",
                "## Request path",
                "",
                "Every public request enters here, is authenticated, and is routed to the "
                "owning bounded-context Worker over its service binding. Responses never "
                "bypass the edge.",
            ]
        if t == "cloudflare-workers-assets-turbo":
            out += [
                "",
                "Being assets-first, the console can be \"up\" while the API behind it is "
                "degraded — always verify the edge separately.",
            ]
        return "\n".join(out).rstrip() + "\n"

    if t == "terraform":
        pub = ", ".join(f"`{w}`" for w in c["publishes"]) or "none declared"
        creds = ", ".join(f"`{w}`" for w in c["wiring"]) or "none declared"
        return "\n".join(
            head
            + [
                f"A `terraform` component rooted at `{c['rel']}/terraform`.",
                "",
                "- **State** lives in the platform's HTTP state backend (run-token auth) — no "
                "local state and no cloud-vendor state bucket.",
                f"- **Credentials are brokered per run** ({creds}) from the workspace's "
                "integration connections; no long-lived provider secret exists anywhere in CI. "
                "They are declared at component level because plan-only lanes refresh against "
                "the live provider API too, not just apply.",
                f"- **Publishes wiring secrets** under lease on the environment rungs: {pub}. "
                "Consumers resolve them by name at deploy time, so no resource ID is ever "
                "committed.",
            ]
            + (
                [
                    "- **Self-healing adoption** (`adopt.tf`): when the platform state is empty "
                    "but the resource already exists at the provider, a plan-time import adopts "
                    "it instead of failing with \"already exists\". That is what makes a re-run "
                    "after a partial failure converge instead of colliding."
                ]
                if (c["dir"] / "terraform" / "adopt.tf").exists()
                else [
                    "- **No adoption shim.** This root has no `adopt.tf`, so a resource that "
                    "already exists at the provider but is absent from platform state must be "
                    "state-migrated or deleted by hand before the lane can converge."
                ]
            )
        ).rstrip() + "\n"

    if t == "db-migrate":
        return "\n".join(
            head
            + [
                f"A `db-migrate` component rooted at `{c['rel']}`.",
                "",
                "- Connects with the wiring secrets the `supabase` terraform publishes, "
                "resolved per run and never stored in CI.",
                "- **Plan on pull requests** (what would change), **apply on merge** — the same "
                "convergence contract as every other component. What a merge will do to the "
                "database is on the diff that proposes it.",
                "- Migrations are forward-only; a rollback is a new migration.",
            ]
        ).rstrip() + "\n"

    # turbo-package: shared packages and test suites
    if is_test(c):
        return "\n".join(
            head
            + [
                f"A `turbo-package` component in `{c['rel']}`, built and executed by the turbo "
                "pipeline. It consumes its target through the same workspace packages "
                "production code uses, so contract drift fails here first — before a deploy "
                "lane ever runs.",
            ]
        ).rstrip() + "\n"

    return "\n".join(
        head
        + [
            f"A `turbo-package` component in `{c['rel']}`: TypeScript, built by the turbo "
            "pipeline, consumed via workspace references. There is no publish step — the repo "
            "is the registry.",
            "",
            "The consumers listed in the overview declare this package as a `dependsOn` edge. "
            "That edge ORDERS the run — when both sides are in scope, this package's lane "
            "precedes theirs, so a build never races the thing it compiles against.",
            "",
            "It does **not** pull them into the changed set. `orun plan --changed` is "
            "path-based: a commit touching only this package plans this package alone, and an "
            "edge whose other side is unselected is dropped with a warning. Redeploying a "
            "consumer against a changed package takes an explicit `# ci:` marker on that "
            "consumer — which is why the bootstrap stamps them when it retries a phase.",
        ]
    ).rstrip() + "\n"


# ── runbook ───────────────────────────────────────────────────────────────


def runbook(c, comps, sub):
    t = c["type"]
    head = [f"# {c['name']} — runbook", ""]

    if is_test(c):
        return "\n".join(
            head
            + [
                "## How it runs",
                "",
                "Planned whenever its target (or this suite) changes; the lane runs the suite "
                "and reports pass/fail. There is nothing to deploy or roll back.",
                "",
                "## When it fails",
                "",
                "Read the failing assertion in the lane log. Fix the target component, or "
                "update the suite WITH the behavior change in the same PR — never merge around "
                "a red verify lane; it is the convergence gate.",
            ]
        ).rstrip() + "\n"

    if is_package(c):
        return "\n".join(
            head
            + [
                "## How it ships",
                "",
                "Nothing deploys from a package directly: consumers rebuild against it in the "
                "same convergence that lands the change. The package's verify lane, and those "
                "of its consumers, are the gate.",
                "",
                "## When its lane fails",
                "",
                "Build and type errors surface in the lane log. Fix them in the same PR as the "
                "consuming change — a partial merge leaves consumers red.",
            ]
        ).rstrip() + "\n"

    out = head + [DEPLOY_RUNBOOK.strip(), "", "## Verify", ""]

    if c["name"] == "api-edge":
        out += [
            "```bash",
            f"curl -s -o /dev/null -w '%{{http_code}}\\n' https://api-edge-stage.{sub}.workers.dev/health",
            f"curl -s -o /dev/null -w '%{{http_code}}\\n' https://api-edge-prod.{sub}.workers.dev/health",
            "```",
            "",
            "The live addresses for this deployment are recorded in "
            "[`ai/context/deployment.md`](../../../ai/context/deployment.md), generated from "
            "probed state rather than intent.",
        ]
    elif t == "cloudflare-workers-assets-turbo":
        out += [
            "Probe the console origin recorded in "
            "[`ai/context/deployment.md`](../../../ai/context/deployment.md), then probe the "
            "edge `/health` too — a green console does not imply a healthy API, because the "
            "console is static assets and survives an edge outage visually.",
        ]
    elif t == "terraform":
        out += [
            "```bash",
            "# published wiring outputs (names only, per environment)",
            "orun secrets list --org <ws> --env stage",
            "orun secrets list --org <ws> --env prod",
            "```",
        ]
    elif t == "db-migrate":
        out += [
            "The migrate lane's apply log lists the executed migrations per environment. "
            "Schema-dependent behavior is exercised by the Worker verify lanes that run in the "
            "same convergence.",
        ]
    else:
        out += [
            "The deploy lane's own verify and smoke steps are the gate. End-to-end behavior is "
            "exercised through `api-edge` — this Worker has no public URL.",
        ]

    out += ["", "## Common failures", ""]
    if t == "terraform":
        out += [
            "- **\"Resource already exists\" with empty platform state**: adoption (`adopt.tf`) "
            "imports at plan time. If a root lacks adoption the resource must be state-migrated "
            "or deleted.",
            "- **Provider auth failure**: the workspace's integration connection is missing or "
            "revoked. Reconnect it in the console — credentials are brokered from it per run, "
            "so nothing here is repairable by editing the repo.",
        ]
    elif t == "db-migrate":
        out += [
            "- **Missing `SUPABASE_*` wiring secrets**: the `supabase` lane has not applied in "
            "this convergence — check it first.",
            "- **A failed migration**: fix forward with a new migration. Never edit an applied "
            "one; applied history is immutable.",
        ]
    else:
        out += [
            "- **Missing `WIRING_*` secret at deploy**: the upstream infrastructure component "
            "has not applied — check that lane first. Within one convergence the DAG guarantees "
            "the order.",
            "- **Service-binding target missing (Cloudflare 10143)**: the target Worker does not "
            "exist yet on this account. Converge the fleet before this lane — the bootstrap's "
            "two-pass landing handles first boot.",
            "- **Smoke fails right after a first deploy**: a brand-new workers.dev route can 4xx "
            "for a few seconds and the lane already retries. Persistent failure is a real "
            "regression.",
        ]
    return "\n".join(out).rstrip() + "\n"


# ── drive ─────────────────────────────────────────────────────────────────

PAGES = (("docs/overview.md", overview), ("docs/architecture.md", architecture),
         ("docs/runbook.md", runbook))


def main() -> int:
    check = "--check" in sys.argv[1:]
    comps = load_components()
    sub = workers_dev_subdomain()

    drift, written = [], 0
    for c in sorted(comps.values(), key=lambda x: x["rel"]):
        for rel, render in PAGES:
            path, want = c["dir"] / rel, render(c, comps, sub)
            if check:
                have = path.read_text() if path.exists() else ""
                if have != want:
                    d = difflib.unified_diff(
                        have.splitlines(True), want.splitlines(True),
                        fromfile=f"{c['rel']}/{rel} (committed)",
                        tofile=f"{c['rel']}/{rel} (rendered)")
                    drift.append("".join(d))
            else:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(want)
                written += 1

    if check:
        if drift:
            sys.stderr.write(
                f"component docs are stale in {len(drift)} page(s) — "
                "run `python3 tooling/docs/render-component-docs.py`\n\n")
            for d in drift[:5]:
                sys.stderr.write(d + "\n")
            if len(drift) > 5:
                sys.stderr.write(f"… and {len(drift) - 5} more\n")
            return 1
        print(f"component docs: {len(comps)} component(s) up to date")
        return 0

    print(f"component docs: wrote {written} page(s) across {len(comps)} component(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
