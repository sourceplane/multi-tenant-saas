// CLI runner. The `bin/cli.ts` entrypoint is a thin wrapper that calls
// `runCli(process.argv.slice(2))`; this module owns the dispatch logic so
// it stays unit-testable.

import { Sourceplane } from "@saas/sdk";

import { Router, parseArgv } from "./router.js";
import {
  loginCommand,
  logoutCommand,
  whoamiCommand,
  orgListCommand,
  orgUseCommand,
  orgMembersCommand,
  projectListCommand,
} from "./commands/index.js";
import { parseOutputMode, type OutputMode } from "./output/index.js";
import { ContextStore } from "./context/store.js";
import { selectTokenStore } from "./token-store/index.js";
import type { TokenStore } from "./token-store/types.js";
import { CLI_VERSION } from "./version.js";
import {
  formatCliError,
  MissingAuthError,
  UsageError,
} from "./errors.js";

export interface RunOptions {
  /** Override stdout sink (tests). */
  readonly stdout?: (line: string) => void;
  /** Override stderr sink (tests). */
  readonly stderr?: (line: string) => void;
  /** Inject a token store (tests). */
  readonly tokenStore?: TokenStore;
  /** Inject a context store (tests). */
  readonly contextStore?: ContextStore;
  /** Override SDK factory (tests). */
  readonly sdkFactory?: (baseUrl: string, token: string) => Sourceplane;
  /** Override config dir for the file token store / context store. */
  readonly configDir?: string;
}

export async function runCli(
  argv: ReadonlyArray<string>,
  opts: RunOptions = {},
): Promise<{ exitCode: number }> {
  const stdout = opts.stdout ?? defaultStdout;
  const stderr = opts.stderr ?? defaultStderr;

  const { positional, flags } = parseArgv(argv);

  const outputMode: OutputMode = parseOutputMode(flags["output"]);

  // Top-level meta flags handled before routing.
  if (flags["version"] === true || positional[0] === "--version") {
    if (outputMode === "json") {
      stdout(JSON.stringify({ version: CLI_VERSION }));
    } else {
      stdout(CLI_VERSION);
    }
    return { exitCode: 0 };
  }
  if (flags["help"] === true || positional.length === 0) {
    printHelp(stdout);
    return { exitCode: positional.length === 0 ? 0 : 0 };
  }

  const router = buildRouter();
  const match = router.resolve(positional);
  if (match === null) {
    const formatted = formatCliError({
      err: new UsageError(`unknown command: ${positional.join(" ")}`),
      mode: outputMode,
    });
    stderr(formatted.message);
    if (outputMode === "human") printUsageHint(stderr);
    return { exitCode: formatted.exitCode };
  }

  const tokenStore =
    opts.tokenStore ??
    (await selectTokenStore(
      opts.configDir !== undefined ? { configDir: opts.configDir } : {},
    ));
  const contextStore =
    opts.contextStore ??
    new ContextStore(opts.configDir !== undefined ? { configDir: opts.configDir } : {});

  const sdk = async (): Promise<Sourceplane> => {
    const cred = await tokenStore.load();
    if (!cred) throw new MissingAuthError();
    if (opts.sdkFactory) return opts.sdkFactory(cred.apiUrl, cred.token);
    return new Sourceplane({
      baseUrl: cred.apiUrl,
      auth: { kind: "bearer", token: cred.token },
    });
  };

  try {
    const result = await match.handler({
      args: match.rest,
      flags,
      outputMode,
      stdout,
      stderr,
      tokenStore,
      contextStore,
      sdk,
    });
    return { exitCode: result.exitCode };
  } catch (err) {
    const formatted = formatCliError({ err, mode: outputMode });
    stderr(formatted.message);
    return { exitCode: formatted.exitCode };
  }
}

function buildRouter(): Router {
  const r = new Router();
  r.register(["login"], "Authenticate against a Sourceplane API", loginCommand);
  r.register(["logout"], "Clear stored credentials and context", logoutCommand);
  r.register(["whoami"], "Show the active identity and organization", whoamiCommand);
  r.register(["org", "list"], "List organizations the actor belongs to", orgListCommand);
  r.register(["org", "use"], "Set the active organization", orgUseCommand);
  r.register(["org", "members"], "List members of the active organization", orgMembersCommand);
  r.register(["project", "list"], "List projects in the active organization", projectListCommand);
  return r;
}

function printHelp(stdout: (line: string) => void): void {
  stdout(
    [
      `sourceplane v${CLI_VERSION}`,
      "",
      "USAGE:",
      "  sourceplane <command> [args] [--output=human|json]",
      "",
      "AUTH:",
      "  sourceplane login    [--api-url=URL] [--token=BEARER]",
      "  sourceplane logout",
      "  sourceplane whoami",
      "",
      "ORGANIZATIONS:",
      "  sourceplane org list",
      "  sourceplane org use <org-id>",
      "  sourceplane org members",
      "",
      "PROJECTS:",
      "  sourceplane project list",
      "",
      "GLOBAL FLAGS:",
      "  --output=human|json   Output format (default: human)",
      "  --help                Show this help",
      "  --version             Print version",
    ].join("\n"),
  );
}

function printUsageHint(stderr: (line: string) => void): void {
  stderr("run `sourceplane --help` to see available commands");
}

function defaultStdout(line: string): void {
  process.stdout.write(`${line}\n`);
}
function defaultStderr(line: string): void {
  process.stderr.write(`${line}\n`);
}
