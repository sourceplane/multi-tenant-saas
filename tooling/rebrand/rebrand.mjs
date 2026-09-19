#!/usr/bin/env node
// Fork/rebrand renamer for the multi-tenant SaaS baseline (zero-dependency).
//
// Rewrites every *instance identity* literal in the repo — repo name, product
// domain, product/display name, SDK class name, CLI bin, Cloudflare worker
// resource names (so a fork is account-safe even when it shares an account
// with the baseline), wire-visible user agents, workers.dev subdomain — to the
// values supplied in a values file, leaving *org-owned* identity untouched (GitHub org, orun
// state backend, `sourceplane.io` manifest apiVersion, S3 state buckets,
// company email addresses). The rename map is the codified form of the
// transformation log from the first real instantiation (orun-cloud,
// `ai/context/fork-from-baseline.md` there); FORKING.md is the playbook.
//
// Usage (from the repo root, on a clean tree):
//   node tooling/rebrand/rebrand.mjs --values my-brand.json [--dry-run]
//   node tooling/rebrand/rebrand.mjs --verify [--values my-brand.json]
//
// Values file (see tooling/rebrand/values.example.json):
//   {
//     "reponame":      "acme-cloud",           // required — repo slug
//     "productname":   "Acme Cloud",           // required — display name
//     "productdomain": "acme.dev",             // required — product domain
//     "pascalName":    "AcmeCloud",            // default: productname, non-alnum stripped
//     "brandSlug":     "acme",                 // default: reponame
//     "cliBin":        "acme",                 // default: reponame
//     "apibaseurl":    "https://api.acme.dev", // default: https://api.<productdomain>
//     "subdomain":     "my-subdomain",         // default: "your-workers-subdomain"
//     "salesEmail":    "sales@acme.dev"        // optional: keeps baseline mailbox if absent
//   }
//
// Modes:
//   (default)   apply the rename map in place, then run the leftover sweep
//   --dry-run   report per-pair match counts and files; change nothing
//   --verify    only run the leftover sweep (non-zero exit on residue); with
//               --values, the product's own identity is not residue

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";

// ── Inputs ─────────────────────────────────────────────────────

function flag(name) {
  return process.argv.includes(`--${name}`);
}
function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const dryRun = flag("dry-run");
const verifyOnly = flag("verify");

let values = {};
// --verify takes --values too, optionally: without them it cannot tell the
// product's own identity from a leftover of the baseline's (below).
const valuesPath = arg("values");
if (!verifyOnly && !valuesPath) {
  console.error("usage: rebrand.mjs --values <file> [--dry-run] | --verify [--values <file>]");
  process.exit(2);
}
if (valuesPath) {
  values = JSON.parse(fs.readFileSync(valuesPath, "utf8"));
  // THE MANIFEST'S KEYS, and the old ones for the products that have them.
  // The console manifest names its inputs `reponame`, `productname`, … and the
  // blueprint renders values.json with those. Every product born from the
  // flows' phase slices COMMITTED a values.json with the camelCase keys this
  // file used to read (`reponame`, `productname`, …), and a phase run against
  // one later brands with that file. Both are read, and the manifest's key
  // wins where both are present.
  const LEGACY = {
    reponame: "repoName",
    productname: "productName",
    productdomain: "productDomain",
    apibaseurl: "apiBaseUrl",
    subdomain: "workersDevSubdomain",
  };
  for (const [key, old] of Object.entries(LEGACY)) {
    if (values[key] === undefined && values[old] !== undefined) values[key] = values[old];
  }
  for (const required of ["reponame", "productname", "productdomain"]) {
    if (typeof values[required] !== "string" || values[required].length === 0) {
      console.error(`rebrand: values file is missing required field "${required}"`);
      process.exit(2);
    }
  }
} else {
  // --verify with no values file: a fork carries the one the blueprint
  // rendered. Read it best-effort for ONE thing: the workspace. Without it the
  // sweep cannot tell a correctly re-tenanted `secret://<slug>/` from the
  // baseline's leftover, and a fork that legitimately deploys into the
  // baseline's own workspace would fail verification for being right.
  try {
    const v = JSON.parse(fs.readFileSync(".rebrand/values.json", "utf8"));
    if (typeof v.orunWorkspaceSlug === "string") values.orunWorkspaceSlug = v.orunWorkspaceSlug;
    if (typeof v.orunWorkspace === "string") values.orunWorkspace = v.orunWorkspace;
  } catch {
    /* absent or unreadable — the sweep just stays strict */
  }
}

// All fields are unused under --verify; the fallbacks keep derivation total.
const reponame = values.reponame ?? "";
const productname = values.productname ?? "";
const productdomain = values.productdomain ?? "";
const pascalName = values.pascalName ?? productname.replace(/[^A-Za-z0-9]/g, "");
const brandSlug = values.brandSlug ?? reponame;
const cliBin = values.cliBin ?? reponame;
const apibaseurl = values.apibaseurl ?? `https://api.${productdomain}`;
const subdomain = values.subdomain ?? "your-workers-subdomain";
const salesEmail = values.salesEmail; // optional
// A `secret://<workspace>/<project>/<env>/<KEY>` ref names the WORKSPACE
// first and the project (repo) second. Here the two differ (`halo` /
// `multi-tenant-saas`), so the repo-slug pass below must not be allowed to
// rewrite the workspace segment — a fork whose refs point at a workspace that
// does not exist fails every resolve with "Validation failed". The workspace
// segment is renamed separately: orunWorkspaceSlug when the caller supplied
// one, else orunWorkspace itself.
//
// A ws_… id IS a valid workspace segment. The resolve verifies the segment
// against membership and accepts a slug, a public id or a ws_ ref
// (orun-cloud state-worker secrets-resolve.ts, verifySegments). This used to
// skip a ws_… id on the belief that only a slug matched, and fell back to the
// REPO name. The blueprint's `orunWorkspace` input IS a ws_… id, so every
// product given no slug had refs naming a workspace that does not exist
// (found on the cirrus baseline, which shares this engine's lineage):
//
//   Ref workspace "altocumulus" does not name this run's workspace
//
// The repo name remains the last resort only when no workspace was given.
const orunWorkspaceSlug = (() => {
  const explicit = (values.orunWorkspaceSlug ?? "").trim();
  if (explicit) return explicit;
  const ws = (values.orunWorkspace ?? "").trim();
  if (ws) return ws;
  return reponame;
})();
// Derived code-shaped forms.
const camelName = pascalName.charAt(0).toLowerCase() + pascalName.slice(1);
const envPrefix = cliBin.toUpperCase().replace(/-/g, "_");

if (!verifyOnly && /[^a-z0-9-]/.test(`${reponame}${brandSlug}${cliBin}`)) {
  console.error("rebrand: reponame/brandSlug/cliBin must be lowercase slugs ([a-z0-9-])");
  process.exit(2);
}

// In-place rewrite of the whole tree: insist on a clean checkout so the
// result is reviewable as one diff (and trivially revertible).
if (!verifyOnly && !dryRun && !flag("allow-dirty")) {
  const status = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" });
  if (status.trim().length > 0) {
    console.error("rebrand: working tree is not clean — commit/stash first (or pass --allow-dirty)");
    process.exit(2);
  }
}

// ── File set ───────────────────────────────────────────────────

// Tracked text files only. Exclusions are either generated/locked artifacts,
// this tool itself, or files that intentionally keep baseline-provenance
// literals (FORKING.md documents the baseline by name).
const EXCLUDE_RE = new RegExp(
  [
    "^tooling/rebrand/",
    // The values file IS the product's identity. Rewriting it would rewrite
    // the input of every later phase's rebrand.
    "^\\.rebrand/",
    "^FORKING\\.md$",
    "^ai/context/fork-from-baseline\\.md$",
    "^pnpm-lock\\.yaml$",
    "^kiox\\.lock$",
    "\\.(png|jpg|jpeg|ico|gif|woff2?|ttf|eot)$",
  ].join("|"),
);

function trackedFiles() {
  return execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split("\n")
    .filter((f) => f.length > 0 && !EXCLUDE_RE.test(f))
    .filter((f) => {
      // `git ls-files` also lists gitlinks (nested repos — a grounded sandbox
      // checkout carries `baseline/` as one) and paths deleted from disk.
      // Only regular files are sweepable; a gitlink crashed the sweep with
      // readFileSync-on-directory mid-bootstrap (observed live on lumen).
      try {
        return fs.statSync(f).isFile();
      } catch {
        return false;
      }
    });
}

// ── Protected literals (org-owned identity, never rewritten) ───
//
// Masked before the pair sweep and restored after, so broad pairs like
// "sourceplane.ai" cannot touch them. Mirrors the orun-cloud fork's
// "intentionally NOT changed" register.

const PROTECTED = [
  /https:\/\/orun-api\.sourceplane\.ai/g, // orun state backend (intent.yaml)
  /sourceplane\.io/g, // manifest apiVersion, owned by the orun tooling
  /[A-Za-z0-9._%+-]+@sourceplane\.ai/g, // company mailboxes
];

const MASK = (i, j) => `\u0000REBRAND_PROTECTED_${i}_${j}\u0000`;

// ── Substituted values are opaque ──────────────────────────────
//
// The rules run in sequence over one buffer, and each used to write its VALUE
// into it — where every later rule could match again. A value that contains a
// baseline word was rewritten a second time (found on cirrus and lumen, whose
// engines share this lineage):
//
//   Sourceplane-Webhooks  →  SourceplaneNext-Webhooks  →  SourceplaneNextNext-…
//   sourceplane.ai        →  sourceplane-weather.dev   →  (cli bin pass) …
//
// So a rule writes a TOKEN standing for its value, and every token is expanded
// once, after the last rule. A token is NUL, `H<n>`, NUL — NUL cannot occur in a
// file this touches (binary files are skipped; the protected-literal mask above
// relies on the same fact), and nothing between the NULs is anything a rule
// matches. Its outer characters take the word/non-word class of the value's own
// first and last characters, so a `\b` in a later rule sees the same boundary
// beside the token that it would have seen beside the value.
const heldValues = [];
const heldIndex = new Map();
function hold(value) {
  if (value === "") return "";
  let i = heldIndex.get(value);
  if (i === undefined) {
    i = heldValues.push(value) - 1;
    heldIndex.set(value, i);
  }
  const edge = (c) => (/\w/.test(c) ? "0" : "\u0001");
  return `${edge(value[0])}\u0000H${i}\u0000${edge(value[value.length - 1])}`;
}
const HELD_RE = /[0\u0001]\u0000H(\d+)\u0000[0\u0001]/g;
function release(text) {
  return text.replace(HELD_RE, (_, i) => heldValues[Number(i)]);
}

// ── Rename map (ordered, most specific first) ──────────────────

function pairs() {
  const list = [];
  // Optional mailbox retarget runs before emails are masked.
  if (salesEmail) {
    list.push(["sales@sourceplane.ai", salesEmail, "sales mailbox (console seam)"]);
  }
  list.push(
    // Repo-derived values: intent metadata.name + per-env repo: params,
    // component.yaml repo: fields, Secrets Manager paths, OIDC role names,
    // Supabase project names, docs.
    ["multi-tenant-saas", reponame, "repo slug"],
    // Deploy names: console worker/Pages prefix (covers the -next variant and
    // the legacy pages.dev fixtures in the CORS tests).
    ["sourceplane-web-console", `${brandSlug}-web-console`, "console worker prefix"],
    // Wire-visible user agents (test assertions update in lockstep).
    ["sourceplane-identity-worker", `${brandSlug}-identity-worker`, "identity UA"],
    ["sourceplane-integrations-worker", `${brandSlug}-integrations-worker`, "integrations UA"],
    ["Sourceplane-Webhooks", `${pascalName}-Webhooks`, "webhooks UA"],
    // CLI default API base (brand seam).
    ["https://api.sourceplane.dev", apibaseurl, "CLI default API base"],
    ["api.sourceplane.dev", apibaseurl.replace(/^https?:\/\//, ""), "CLI API host (bare)"],
    // Product domain wherever it is the *product* (BASE_DOMAIN, console
    // custom domains, Polar success URLs, OAuth origins, CORS tests, docs).
    // The orun backend URL and company mailboxes are masked above.
    ["sourceplane.ai", productdomain, "product domain"],
    // Display-name seams keep the human-readable name even in .ts files.
    ['PRODUCT_NAME = "Sourceplane"', `PRODUCT_NAME = "${productname}"`, "product-name seams"],
    // Console localStorage namespace (console app-config seam).
    ['STORAGE_PREFIX = "sourceplane.next"', `STORAGE_PREFIX = "${brandSlug}.next"`, "storage prefix"],
    // Workers.dev subdomain (app-config seams, console component, identity template).
    ["rahulvarghesepullely", subdomain, "workers.dev subdomain"],
    // SDK usage examples (integrations README): the client variable and the
    // product-namespaced check-run name.
    ["const sourceplane = new", `const ${camelName} = new`, "SDK example variable (decl)"],
    ["await sourceplane.integrations", `await ${camelName}.integrations`, "SDK example variable (use)"],
    ['"sourceplane/verify"', `"${brandSlug}/verify"`, "check-run name example"],
    // CLI config-dir references in docs.
    [".config/sourceplane/", `.config/${cliBin}/`, "CLI config dir (docs)"],
    // CLI command examples in docs: `sourceplane ...` / `sourceplane`.
    ["`sourceplane ", `\`${cliBin} `, "CLI bin (doc examples, open)"],
    ["`sourceplane`", `\`${cliBin}\``, "CLI bin (doc examples, closed)"],
  );
  return list;
}

// ── `Sourceplane` (display name vs. code identifier) ───────────
//
// The `@saas/sdk` client class (`Sourceplane`, `SourceplaneError`) is a code
// identifier; prose references are the display name. This is the BF12
// "blueprint rename map" boundary recorded in packages/cli/src/brand.ts:
//   - code files (.ts/.js/...)            → pascalName
//   - markdown code fences + inline code  → pascalName
//   - everything else (prose, yaml, json) → productname

function replaceBrandWord(file, text, count) {
  const sub = (chunk, to) =>
    chunk.replace(/Sourceplane/g, () => {
      count();
      return hold(to);
    });

  if (/\.(ts|tsx|mts|cts|js|mjs|cjs)$/.test(file)) return sub(text, pascalName);
  if (!/\.(md|markdown)$/.test(file)) return sub(text, productname);

  // Markdown: fenced blocks keep the identifier form …
  return text
    .split(/(```[\s\S]*?(?:```|$))/)
    .map((part) => {
      if (part.startsWith("```")) return sub(part, pascalName);
      // … as do inline code spans; bare prose gets the display name.
      return part
        .split(/(`[^`\n]+`)/)
        .map((span) =>
          span.startsWith("`") && span.endsWith("`")
            ? sub(span, pascalName)
            : sub(span, productname),
        )
        .join("");
    })
    .join("");
}

// Cloudflare worker resource names that ship UN-prefixed in the baseline: the
// top-level "name" of each apps/<w>/wrangler.template.jsonc. They deploy as
// "<name>-<env>" and are referenced by service bindings, smoke health-checks,
// and binding tests. In a Cloudflare account SHARED with the baseline an
// un-prefixed name silently overwrites the baseline's live worker (the orun
// component identity — dependsOn, component.yaml metadata, paths — is left
// alone; only the deployed CF identity is branded).
function discoverWorkerCfNames() {
  const names = new Set();
  for (const file of files) {
    if (!/^apps\/[^/]+\/wrangler\.template\.jsonc$/.test(file)) continue;
    let text;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    // The top-level worker name is the first "name" key and is a lowercase
    // slug — never the nested binding/DO names (EMAIL, RateLimiterDO, …).
    const m = text.match(/"name":\s*"([a-z][a-z0-9-]*)"/);
    if (m && !m[1].startsWith(`${brandSlug}-`)) names.add(m[1]);
  }
  return [...names];
}

// Scoped, regex-based pairs applied after the literal map.
function scopedPairs() {
  const list = [
    // Secret refs: `secret://<workspace>/<project>/…`. Only the WORKSPACE
    // segment is rewritten here; the project segment is the repo slug and is
    // handled by the repo-slug pass like every other occurrence.
    //
    // Matching the workspace segment ALONE is deliberate. Anchoring on
    // `secret://halo/multi-tenant-saas/` looks tighter but silently does
    // nothing: the repo slug is already renamed by the time this runs, so the
    // pattern no longer matches and every fork keeps the baseline's workspace
    // — the exact failure this pass exists to prevent. `halo` is safe to match
    // here because the `secret://` prefix scopes it; bare `halo` is an
    // ordinary word and is never rewritten.
    {
      re: /\bsecret:\/\/halo\//g,
      replacement: () => `secret://${orunWorkspaceSlug}/`,
      label: "secret ref workspace segment",
    },
    // Branded env-var names: the real CONFIG_DIR override (brand.ts derives
    // it from CLI_BIN, so tests/docs must rename in lockstep) plus doc
    // placeholders like SOURCEPLANE_TOKEN / SOURCEPLANE_API_KEY /
    // SOURCEPLANE_WEBHOOK_SECRET, and historical SOURCEPLANE_DB mentions.
    {
      re: /SOURCEPLANE_(?=[A-Z])/g,
      replacement: () => `${envPrefix}_`,
      label: "branded env-var prefix",
    },
    // CLI bin: usage strings, keychain/config-dir derivations, package bin.
    // Lowercase `sourceplane` outside packages/cli is the GitHub org — never
    // rewritten. Inside packages/cli the org never appears bare (the masked
    // sourceplane.io/backend forms aside), so a word-boundary replace is safe.
    {
      re: /\bsourceplane\b/g,
      replacement: () => cliBin,
      label: "CLI bin (packages/cli)",
      fileFilter: (file) => file.startsWith("packages/cli/"),
    },
  ];

  // Brand-prefix every Cloudflare worker resource name so a fork is safe to
  // deploy even into an account it shares with the baseline.
  const workerNames = discoverWorkerCfNames();
  if (workerNames.length > 0) {
    // Longest-first so an alternation never matches a shorter prefix of a name.
    const wn = workerNames.slice().sort((a, b) => b.length - a.length).join("|");
    // (a) The worker's own deployed name — the top-level wrangler "name".
    // Scoped to wrangler templates and the discovered slugs, so binding/DO
    // "name" keys (EMAIL, RateLimiterDO) are never touched.
    list.push({
      re: new RegExp(`("name":\\s*")(${wn})(")`, "g"),
      replacement: (_file, _m, pre, name, post) => `${pre}${brandSlug}-${name}${post}`,
      label: "worker CF name (wrangler template)",
      fileFilter: (file) => /^apps\/[^/]+\/wrangler\.template\.jsonc$/.test(file),
    });
    // (b) Every "<worker>-<env>" reference — service bindings, smoke
    // health-checks (`…-${ORUN_ENVIRONMENT}`), binding tests and fixtures.
    // The lookbehind keeps it idempotent (skips already-branded names).
    list.push({
      re: new RegExp(`(?<!${brandSlug}-)\\b(${wn})-(stage|prod|dev|\\$\\{[A-Z_]+\\})`, "g"),
      replacement: (_file, _m, name, env) => `${brandSlug}-${name}-${env}`,
      label: "worker CF name (env-suffixed references)",
    });
  }
  return list;
}

// ── Leftover sweep ─────────────────────────────────────────────
//
// After a rebrand (or under --verify) every remaining baseline-identity
// literal is residue: either org-owned (allowed, enumerated below) or a
// missed rename (reported, non-zero exit).

// `secret://halo/` is listed because a fork that keeps the baseline's
// WORKSPACE segment resolves nothing: the refs point at a workspace it has no
// claim on, and every secret read fails with "Validation failed" long after
// the rebrand looked clean. Bare `halo` is deliberately not matched — it is an
// ordinary word and would fire on prose.
//
// The workers.dev subdomain is the one literal a fork may legitimately KEEP:
// worker names are already brand-prefixed, so sharing the baseline's account
// subdomain collides with nothing, and the phase-01 README documents keeping
// it as supported. Flagging it anyway made `rebrand --verify` exit 1 in the
// middle of the scaffold hook chain, which silently skipped every later hook
// (workspace re-tenant, restage, lockfile) — a bootstrap that fails late and
// obscurely because of a naming preference. So it counts as residue only when
// the caller actually asked for a different one. Under --verify there is no
// values file to compare against, and --verify runs on forks where a kept
// subdomain is not a missed rename, so it is skipped there too.
const BASELINE_SUBDOMAIN = "rahulvarghesepullely";
const subdomainChanged = !verifyOnly && subdomain !== BASELINE_SUBDOMAIN;
const RESIDUE_RE = new RegExp(
  (subdomainChanged ? `${BASELINE_SUBDOMAIN}|` : "") +
    "multi-tenant-saas|Sourceplane|sourceplane\\.ai|api\\.sourceplane\\.dev|" +
    "sourceplane-web-console|sourceplane\\.next|SOURCEPLANE_|secret:\\/\\/halo\\/",
  "g",
);

const ALLOWED_RESIDUE = [
  /https:\/\/orun-api\.sourceplane\.ai/, // orun state backend
  /[A-Za-z0-9._%+-]+@sourceplane\.ai/, // company mailboxes
  // A fork that deploys into the BASELINE's own workspace keeps `secret://halo/`
  // legitimately — the segment names the workspace it really runs in. Allow it
  // only when the fork's resolved slug IS that workspace, so the check still
  // catches the case it exists for: a fork pointed at a workspace it has no
  // claim on.
  ...(orunWorkspaceSlug === "halo" ? [/secret:\/\/halo\//] : []),
];

function sweep(files, allowedLiterals = []) {
  const residue = [];
  for (const file of files) {
    let text;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue; // unreadable/deleted/non-file — nothing to sweep
    }
    for (const line of text.split("\n")) {
      // Strip allowed (org-owned) forms first; whatever still matches is residue.
      let cleaned = ALLOWED_RESIDUE.reduce(
        (l, re) => l.replace(new RegExp(re.source, "g"), ""),
        line,
      );
      // Then the rename's own TARGET values: a product legitimately named with
      // a baseline word inside it (repo "multi-tenant-saas-e2e", product
      // "Sourceplane Cloud") is not residue.
      for (const lit of allowedLiterals) {
        if (lit) cleaned = cleaned.split(lit).join("");
      }
      if (new RegExp(RESIDUE_RE.source).test(cleaned)) {
        residue.push(`${file}: ${line.trim().slice(0, 120)}`);
      }
    }
  }
  return residue;
}

// ── Main ───────────────────────────────────────────────────────

const files = trackedFiles();

const literalPairs = pairs();
const regexPairs = scopedPairs();
const counts = new Map();
const touched = new Set();

// Every value a rule can write. A value that some rule would match again is
// HELD wherever it already stands in a file: every phase of a bootstrap re-runs
// this over the whole tree, so the product a previous run branded is the input
// to the next one, and a product called "Sourceplane Cloud" written by phase 01
// must not become "Sourceplane Cloud Cloud" in phase 02.
const produced = [
  ...literalPairs.map(([, to]) => to),
  pascalName,
  productname,
  `secret://${orunWorkspaceSlug}/`,
  `${envPrefix}_`,
  cliBin,
  reponame,
].filter((v, i, all) => v && all.indexOf(v) === i);
const rematchable = (v) =>
  literalPairs.some(([from]) => v.includes(from)) ||
  /Sourceplane/.test(v) ||
  regexPairs.some(({ re }) => new RegExp(re.source).test(v));
// Longest first, so a held value is never split by a shorter one inside it.
const guarded = produced.filter(rematchable).sort((a, b) => b.length - a.length);

if (verifyOnly) {
  // A product whose own name, domain or workspace contains a baseline word
  // carries that word legitimately, and without its values --verify cannot
  // know that. Given --values, what this rebrand would write is allowed
  // exactly as the post-rename sweep allows it.
  const residue = sweep(
    files,
    valuesPath ? produced.filter((to) => new RegExp(RESIDUE_RE.source).test(to)) : [],
  );
  if (residue.length > 0) {
    console.error(`rebrand --verify: ${residue.length} baseline-identity leftover(s):`);
    for (const r of residue) console.error(`  ${r}`);
    process.exit(1);
  }
  console.log("rebrand --verify: no baseline-identity leftovers.");
  process.exit(0);
}

for (const file of files) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    continue; // unreadable/deleted — not our concern
  }
  if (text.includes("\0")) continue; // binary safety net
  const original = text;

  // Mask org-owned literals.
  const masks = [];
  PROTECTED.forEach((re, i) => {
    text = text.replace(re, (m) => {
      const token = MASK(i, masks.length);
      masks.push([token, m]);
      return token;
    });
  });

  // What a previous run already wrote stays as written.
  for (const value of guarded) text = text.split(value).join(hold(value));

  for (const [from, to, label] of literalPairs) {
    const n = text.split(from).length - 1;
    if (n === 0) continue;
    text = text.split(from).join(hold(to));
    counts.set(label, (counts.get(label) ?? 0) + n);
  }
  const brandLabel = "Sourceplane (class name in code, display name in prose)";
  text = replaceBrandWord(file, text, () =>
    counts.set(brandLabel, (counts.get(brandLabel) ?? 0) + 1),
  );

  for (const { re, replacement, label, fileFilter } of regexPairs) {
    if (fileFilter && !fileFilter(file)) continue;
    text = text.replace(re, (...m) => {
      counts.set(label, (counts.get(label) ?? 0) + 1);
      return hold(replacement(file, ...m));
    });
  }

  // Every rule has run; only now do the values it wrote appear.
  text = release(text);

  // Restore org-owned literals.
  for (const [token, value] of masks) text = text.split(token).join(value);

  if (text !== original) {
    touched.add(file);
    if (!dryRun) fs.writeFileSync(file, text);
  }
}

console.log(`rebrand${dryRun ? " (dry-run)" : ""}: ${touched.size} file(s) affected`);
for (const [label, n] of counts) console.log(`  ${String(n).padStart(5)}  ${label}`);

if (dryRun) {
  process.exit(0);
}

// NO provenance stub. This used to write ai/context/fork-from-baseline.md —
// "Fork tracking — <repo> from the baseline SaaS starter … an instantiation of
// sourceplane/multi-tenant-saas" — into every product: a statement about where
// the product came from, in the product's own voice, in the directory an agent
// is pointed at first. Cirrus's leak gate was written for exactly that file
// (BE5); cirrus and lumen dropped the stub, and so does this.

const residue = sweep(
  trackedFiles(),
  produced.filter((to) => new RegExp(RESIDUE_RE.source).test(to)),
);
if (residue.length > 0) {
  console.error(`rebrand: ${residue.length} baseline-identity leftover(s) after rename:`);
  for (const r of residue) console.error(`  ${r}`);
  process.exit(1);
}
console.log("rebrand: leftover sweep clean.");
