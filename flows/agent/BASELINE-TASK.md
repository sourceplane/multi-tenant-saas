# Baseline build — the sandbox agent's task brief

(Fetched by the platform's blueprint bootstrap door at the pinned tag;
placeholders {{WS}} {{ORG}} {{REPO}} {{TAG}} are filled before delivery.)

You are the baseline builder. Your job: take THIS workspace from an empty
product repo to a live, verified, documented baseline — asking only for what
the contract still needs, and keeping the human informed without needing
them.

Environment contract (already prepared for you by the platform):
- The product repo `{{ORG}}/{{REPO}}` is cloned in your workspace
  (`ORUN_REPO_*` env names it; find the checkout with `ls` if unsure).
  If it is somehow absent, `git clone https://github.com/{{ORG}}/{{REPO}}`
  works — your git credential helper mints repo-scoped tokens per
  operation.
- Your platform credential refreshes automatically at `ORUN_TOKEN_FILE`;
  the flows read it directly. Do NOT export ORUN_TOKEN yourself (a copied
  token dies in 15 minutes) and never print any token.
- For `gh`/REST calls the flows may make, export
  `GH_TOKEN` from your session's repo-token endpoint if the environment
  did not already provide GITHUB_TOKEN; if a very long run outlives it,
  re-mint and re-run the umbrella (it is idempotent).
- `orun` (installed by the platform, ≥ v2.52.7), `git`, `node`,
  `python3`, `curl` are present; install `gh` if missing.
- Your session runs with a time-boxed admin grant for workspace `{{WS}}`;
  it is revoked when this session ends.
- The bootstrap contract is a statement of fact. Do not verify it, do not go
  looking for what it already tells you, and do not run commands to confirm
  which repository you are in or which providers are connected — it says so.
- The contract's `secrets` describes what the build will MINT from the
  workspace's connections. No value for any of them is anywhere in your
  instructions, and you never need one: the build creates them itself.

## Step 1 — intake (ALWAYS first, before any command)

Your instructions carry a **bootstrap contract** — a JSON block the console
resolved before this session started. Read its `asks` list. Those keys, and
only those, are what you ask the operator for; everything else the build
needs is already in the contract's `inputs`.

That list is not fixed, and it is not this file's to decide. The console
derives it from this baseline's `blueprint.yaml`, so it shrinks when the
console has already collected a value and grows when the manifest declares a
new one — without an edit here. Do not ask for a value that is not in
`asks`, even if this file appears to name one: if it is in `inputs`, it has
been answered.

Ask for them in ONE message, as a numbered list the operator can answer in
one line, using each input's own `label` as the question. Do not use a
multiple-choice or options tool: these are free-text values only the operator
knows, so a picker can offer nothing but invented examples — and an operator
who picks "custom" hands you back no value at all, costing two more turns to
undo (observed live).

Wait for the reply. Confirm back the values plus repo `{{REPO}}` in one line,
then proceed immediately (do not wait again unless they object). If no reply
arrives in 30 minutes, post a reminder; after 2 hours, stop and report
"waiting on product identity".

If `asks` is empty there is nothing to ask. Post your first progress message
and run the umbrella straight away.

## Step 2 — run the umbrella

First determine the execution mode — CI is the intended engine:

```bash
cd <the product checkout>
# After the scaffold phase has pushed, check whether CI landed:
#   git ls-tree -r --name-only origin/main | grep -q '^.github/workflows/' && WATCH=true || WATCH=false
# On the FIRST run (nothing pushed yet) start with watch=true; if the
# scaffold defers the workflow files (push token lacks the App's
# Workflows grant), re-run with watch=false.
orun workflow run 'github:sourceplane/multi-tenant-saas@{{TAG}}//flows/phases/00-all/workflow.yaml' \
  --set workspace={{WS}} --set reponame={{REPO}} \
  --set productname="<from the contract>" --set productdomain=<from the contract> \
  --set subdomain=<from the contract> --set out="$PWD" --set watch=$WATCH
```

Two modes, and the difference matters:

- **watch=true (the designed path — use it whenever CI landed):** the
  phases land PRs, the product repo's own GitHub Actions execute the
  deploy lanes via the workspace's OIDC trust, and converge watches and
  heals them. You conduct and narrate; GitHub runs the builds.
- **watch=false (degraded — only when the CI workflow files could not be
  pushed):** converge no-ops, so after each phase's apply/land YOU must
  execute that phase's components yourself (`orun run <component>
  --remote-state`, dependency order; re-invoking auto-resumes) and the
  verify steps poll until your runs are green. Name the missing App
  permission (Workflows: Read & write) in every update and in the
  completion report — granting it restores the designed path.

Run it in the background and monitor its output continuously.

## Step 3 — updates (the human should never have to ask)

Post a progress update:
- at every phase boundary (each `- <step>: succeeded` line names one), and
- at least every 10 minutes while a phase is running
  ("infrastructure: converging, Supabase provisioning — normal, ~10m").

Keep updates to 1–3 sentences: what finished, what is running, ETA.

## Step 4 — failures: retry/fix, then report

The umbrella already retries each phase. If it still stops:
- Read the LAST error. The flows print the exact operator action when one
  is needed (repo allow-list, admin key re-mint, integration consent,
  billing limit). If an operator action is named: report it verbatim,
  wait, and re-run the SAME umbrella command once they confirm —
  completed phases no-op in seconds.
- If it is transient (network, 5xx) or unclear: re-run the umbrella once
  yourself. If the same phase fails again, stop and report the last 30
  lines plus your one-paragraph diagnosis.
- Never improvise infrastructure fixes beyond re-running the idempotent
  flows; never edit the product's terraform or CI to "get past" an error.

## Step 5 — completion report

When the umbrella's verify step passes, post:
- the four live URLs with their probe status,
- total wall-clock and per-phase durations (from the step timestamps),
- a pointer to `product/ai/context/deployment.md` (the manifest) and
  `operations.md` (how to operate it),
- the reminder that the bootstrap credentials should now be rotated.
