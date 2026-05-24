import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function stripJsoncComments(text) {
  return text.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

const EXPECTED_HYPERDRIVE = {
  stage: {
    binding: "SOURCEPLANE_DB",
    id: "08f7c6055f544a3890a585d88fd92348",
  },
  prod: {
    binding: "SOURCEPLANE_DB",
    id: "ab2c21c2db6245a59c91588fcac7107a",
  },
};

const EXPECTED_SERVICES = {
  stage: {
    binding: "IDENTITY_WORKER",
    service: "identity-worker-stage",
  },
  prod: {
    binding: "IDENTITY_WORKER",
    service: "identity-worker-prod",
  },
};

const configPath = resolve(__dirname, "../wrangler.jsonc");
const raw = readFileSync(configPath, "utf-8");
const config = JSON.parse(stripJsoncComments(raw));

let failures = 0;

for (const [envName, expected] of Object.entries(EXPECTED_HYPERDRIVE)) {
  const envBlock = config.env?.[envName];
  if (!envBlock) {
    console.error(`FAIL: environment "${envName}" not found in wrangler.jsonc`);
    failures++;
    continue;
  }

  const hd = envBlock.hyperdrive?.find((h) => h.binding === expected.binding);
  if (!hd) {
    console.error(
      `FAIL: [${envName}] missing hyperdrive binding "${expected.binding}"`
    );
    failures++;
    continue;
  }

  if (hd.id !== expected.id) {
    console.error(
      `FAIL: [${envName}] binding "${expected.binding}" id mismatch: got "${hd.id}", want "${expected.id}"`
    );
    failures++;
    continue;
  }

  const envVar = envBlock.vars?.ENVIRONMENT;
  if (envVar !== envName) {
    console.error(
      `FAIL: [${envName}] ENVIRONMENT var mismatch: got "${envVar}", want "${envName}"`
    );
    failures++;
    continue;
  }

  console.log(`OK: [${envName}] SOURCEPLANE_DB → ${hd.id}`);
}

for (const [envName, expected] of Object.entries(EXPECTED_SERVICES)) {
  const envBlock = config.env?.[envName];
  if (!envBlock) {
    console.error(`FAIL: environment "${envName}" not found in wrangler.jsonc`);
    failures++;
    continue;
  }

  const svc = envBlock.services?.find((s) => s.binding === expected.binding);
  if (!svc) {
    console.error(
      `FAIL: [${envName}] missing service binding "${expected.binding}"`
    );
    failures++;
    continue;
  }

  if (svc.service !== expected.service) {
    console.error(
      `FAIL: [${envName}] service binding "${expected.binding}" target mismatch: got "${svc.service}", want "${expected.service}"`
    );
    failures++;
    continue;
  }

  if (svc.service.includes("prod") && envName !== "prod") {
    console.error(
      `FAIL: [${envName}] cross-environment binding detected: "${svc.service}" bound in "${envName}"`
    );
    failures++;
    continue;
  }

  if (svc.service.includes("stage") && envName !== "stage") {
    console.error(
      `FAIL: [${envName}] cross-environment binding detected: "${svc.service}" bound in "${envName}"`
    );
    failures++;
    continue;
  }

  console.log(`OK: [${envName}] IDENTITY_WORKER → ${svc.service}`);
}

if (failures > 0) {
  console.error(`\n${failures} binding verification failure(s)`);
  process.exit(1);
} else {
  console.log("\nAll binding verifications passed.");
}
