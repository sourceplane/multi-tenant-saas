#!/usr/bin/env bash
# THE REBRAND WRITES EACH VALUE ONCE, AND WHAT IT WROTE STAYS WRITTEN
# (ported from cirrus #67/#68 and lumen #112, over this baseline's own names).
#
# Three defects, all found on the cirrus and lumen baselines, whose rebrand
# engines share this one's lineage, and all present here:
#
# 1. A `secret://<workspace>/<project>/<env>/<KEY>` ref is verified by the
#    platform's resolve against the run's own workspace — by slug, public id or
#    ws_ ref. The blueprint hands rebrand.mjs the workspace as a ws_… id, and
#    rebrand used to skip ws_ ids and fall back to the REPO name:
#
#      Ref workspace "altocumulus" does not name this run's workspace
#
# 2. The rules run in sequence, and each wrote its value where every LATER rule
#    could match it again. A value containing a baseline word was rewritten a
#    second time, and a bootstrap re-runs the rebrand over the whole tree in
#    every phase, so even a value written correctly once was mangled by the
#    next phase's pass.
#
# 3. It wrote ai/context/fork-from-baseline.md into every product — a
#    statement about where the product came from, in the product's own voice.
#
# This drives the real rebrand.mjs over a one-file tree and compares the file.
# Needs: node, git. No network.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
rebrand="$here/../tooling/rebrand/rebrand.mjs"

fail=0
# check NAME VALUES-JSON FILE CONTENT WANT [PASSES]
#   PASSES — how many times the rebrand runs over the tree (default 1). A
#   bootstrap runs it once per phase, over everything already placed.
check() {
  local name="$1" values="$2" file="$3" content="$4" want="$5" passes="${6:-1}"
  local tmp got out i
  tmp="$(mktemp -d)"
  git -C "$tmp" init -q
  mkdir -p "$tmp/$(dirname "$file")" "$tmp/.rebrand"
  printf '%s\n' "$content" > "$tmp/$file"
  printf '%s\n' "$values" > "$tmp/.rebrand/values.json"
  for ((i = 1; i <= passes; i++)); do
    git -C "$tmp" add -A
    if ! out="$(cd "$tmp" && node "$rebrand" --values .rebrand/values.json --allow-dirty 2>&1)"; then
      echo "   ✕  $name: rebrand pass $i failed:" >&2
      printf '%s\n' "$out" | sed 's/^/        /' >&2
      fail=1
      rm -rf "$tmp"
      return
    fi
  done
  got="$(cat "$tmp/$file")"
  if [ -e "$tmp/ai/context/fork-from-baseline.md" ]; then
    echo "   ✕  $name: the rebrand wrote ai/context/fork-from-baseline.md into the product" >&2
    fail=1
  fi
  rm -rf "$tmp"
  if [ "$got" = "$want" ]; then
    echo "   ok  $name"
  else
    echo "   ✕  $name:" >&2
    echo "        got:  $got" >&2
    echo "        want: $want" >&2
    fail=1
  fi
}

ref='TOKEN: secret://halo/multi-tenant-saas/stage/CLOUDFLARE_API_TOKEN'
base='"reponame":"altocumulus","productname":"Altocumulus","productdomain":"altocumulus.dev"'

echo "── rebrand: secret-ref workspace segment"
check "a ws_ id is the workspace segment" \
  "{$base,\"orunWorkspace\":\"ws_79BDXAZQ\"}" apps/w/component.yaml "$ref" \
  "TOKEN: secret://ws_79BDXAZQ/altocumulus/stage/CLOUDFLARE_API_TOKEN"
check "an explicit slug wins" \
  "{$base,\"orunWorkspace\":\"ws_79BDXAZQ\",\"orunWorkspaceSlug\":\"acme-space\"}" apps/w/component.yaml "$ref" \
  "TOKEN: secret://acme-space/altocumulus/stage/CLOUDFLARE_API_TOKEN"
check "a slug given as the workspace is kept" \
  "{$base,\"orunWorkspace\":\"acme-space\"}" apps/w/component.yaml "$ref" \
  "TOKEN: secret://acme-space/altocumulus/stage/CLOUDFLARE_API_TOKEN"

echo "── rebrand: a written value is not rewritten"
check "a slug containing the repo slug survives" \
  "{$base,\"orunWorkspaceSlug\":\"multi-tenant-saas-test\"}" apps/w/component.yaml "$ref" \
  "TOKEN: secret://multi-tenant-saas-test/altocumulus/stage/CLOUDFLARE_API_TOKEN"
check "…and survives every later phase's pass" \
  "{$base,\"orunWorkspaceSlug\":\"multi-tenant-saas-test\"}" apps/w/component.yaml "$ref" \
  "TOKEN: secret://multi-tenant-saas-test/altocumulus/stage/CLOUDFLARE_API_TOKEN" 3
check "a domain containing a baseline word survives the CLI-bin rule" \
  '{"reponame":"acme","productname":"Acme","productdomain":"sourceplane-weather.dev"}' \
  packages/cli/src/domain.ts 'export const DOMAIN = "sourceplane.ai";' \
  'export const DOMAIN = "sourceplane-weather.dev";'
check "a class name containing the brand word survives the brand-word rule" \
  '{"reponame":"sourceplane-next","productname":"Sourceplane Next","productdomain":"next.dev"}' \
  apps/w/src/ua.ts 'const UA = "Sourceplane-Webhooks/1.0";' \
  'const UA = "SourceplaneNext-Webhooks/1.0";'
check "…in every later phase's pass too" \
  '{"reponame":"sourceplane-next","productname":"Sourceplane Next","productdomain":"next.dev"}' \
  apps/w/src/ua.ts 'const UA = "Sourceplane-Webhooks/1.0";' \
  'const UA = "SourceplaneNext-Webhooks/1.0";' 3
check "a display name containing the brand word is written once, in every pass" \
  '{"reponame":"acme","productname":"Sourceplane Cloud","productdomain":"acme.dev"}' \
  apps/w/README.md 'Welcome to Sourceplane.' \
  'Welcome to Sourceplane Cloud.' 3

# A token takes the word/non-word class of its value's edges, so a later rule's
# `\b` sees the boundary the value would have given it. Here the trailing
# `sourceplane` is glued to the domain and packages/cli's `\bsourceplane\b`
# must NOT match it — which is what the engine did before tokens existed. A
# token with non-word edges would have manufactured a boundary and renamed it.
check "a token keeps the word boundaries its value had" \
  "{$base}" packages/cli/notes.yaml 'id: sourceplane.aisourceplane' \
  'id: altocumulus.devsourceplane'

# --verify runs in every phase of a bootstrap. Without the product's values it
# cannot tell the product's own identity from a baseline leftover, and a product
# whose name contains `Sourceplane` failed it in every phase; with them it
# passes. A real leftover must still fail it either way.
verify() { # NAME VALUES FILE CONTENT WANT(pass|fail) [--values]
  local name="$1" values="$2" file="$3" content="$4" want="$5" withvalues="${6:-}" tmp got
  tmp="$(mktemp -d)"
  git -C "$tmp" init -q
  mkdir -p "$tmp/$(dirname "$file")" "$tmp/.rebrand"
  printf '%s\n' "$content" > "$tmp/$file"
  printf '%s\n' "$values" > "$tmp/.rebrand/values.json"
  git -C "$tmp" add -A
  if (cd "$tmp" && node "$rebrand" --verify ${withvalues:+--values .rebrand/values.json} >/dev/null 2>&1); then got=pass; else got=fail; fi
  rm -rf "$tmp"
  if [ "$got" = "$want" ]; then echo "   ok  $name"; else echo "   ✕  $name: --verify ${got}ed, want $want" >&2; fail=1; fi
}
echo "── rebrand --verify: the product's own identity is not residue"
cloud='{"reponame":"acme","productname":"Sourceplane Cloud","productdomain":"acme.dev"}'
verify "given the values, a name containing a baseline word passes" \
  "$cloud" apps/w/README.md 'Welcome to Sourceplane Cloud.' pass --values
verify "without them it cannot know, and fails" \
  "$cloud" apps/w/README.md 'Welcome to Sourceplane Cloud.' fail
verify "given the values, a real leftover still fails" \
  "$cloud" apps/w/README.md 'Welcome to Sourceplane.' fail --values

# THE OLD KEYS STILL WORK. Every product born from the flows' phase slices
# committed values.json with `repoName`, `productName`, …; the blueprint
# renders the manifest's `reponame`, `productname`, …. A later phase run
# against an old product brands with its committed file, so rebrand reads
# both, the manifest's key winning where both are given.
echo "── rebrand: the pre-blueprint camelCase keys"
check "the old keys brand like the new ones" \
  '{"repoName":"altocumulus","productName":"Altocumulus","productDomain":"altocumulus.dev","orunWorkspace":"ws_79BDXAZQ"}' \
  apps/w/component.yaml "$ref" \
  "TOKEN: secret://ws_79BDXAZQ/altocumulus/stage/CLOUDFLARE_API_TOKEN"
check "the manifest's key wins over the old one" \
  '{"reponame":"altocumulus","repoName":"stale","productname":"Altocumulus","productdomain":"altocumulus.dev","orunWorkspace":"ws_79BDXAZQ"}' \
  apps/w/component.yaml "$ref" \
  "TOKEN: secret://ws_79BDXAZQ/altocumulus/stage/CLOUDFLARE_API_TOKEN"

[ "$fail" -eq 0 ] || exit 1
echo "rebrand.test.sh: ok"
