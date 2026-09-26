// Runs a submitted script in a separate Node process that has no access to
// the file system, to child processes, to worker threads, or to this
// process's environment. The script sees a single `interface` object; each
// of its methods is forwarded here over IPC and executed against the real
// interface, so the index data and API keys stay in this process.
//
// With `interfaceModule`, the child instead builds the script's interface
// itself by loading that module (see child.ts), and the object passed here
// becomes the host side that the in-child interface can call back into. This
// lets scripts use objects with getters and methods, which cannot be sent
// over IPC. The child is then also allowed to read the module's directory
// and `readPaths`.
import { ChildProcess, fork } from "child_process";
import { realpathSync } from "fs";
import { dirname, join } from "path";

// Any object whose function-valued properties (other than those starting
// with an underscore) should be callable from the script.
export type SandboxInterface = object;

export type RunInSandboxOptions = {
  timeoutMs?: number;
  maxOldSpaceSizeMb?: number;
  childPath?: string;
  // Absolute path of a module exporting createSandboxedInterface(host).
  interfaceModule?: string;
  // Absolute paths the child may read, in addition to its own code.
  readPaths?: string[];
};

type ChildMessage =
  | { type: "ready" }
  | { type: "call"; id: number; method: string; args: unknown[] }
  | { type: "done" }
  | { type: "failed"; error: string };

export const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
export const DEFAULT_MAX_OLD_SPACE_SIZE_MB = 1024;

export class SandboxTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Script exceeded the time limit of ${timeoutMs} ms`);
    this.name = "SandboxTimeoutError";
  }
}

export class SandboxScriptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SandboxScriptError";
  }
}

// Node 20 spells the flag --experimental-permission; Node 22.13 and later
// accept --permission. Both require the child's own entry point to be
// readable explicitly.
export const permissionExecArgv = (
  childPath: string,
  readPaths: string[] = [],
): string[] => {
  const flags = process.allowedNodeEnvironmentFlags;
  const permissionFlag = flags.has("--permission")
    ? "--permission"
    : "--experimental-permission";
  if (!flags.has(permissionFlag)) {
    throw new Error(
      `This version of Node (${process.version}) does not support the permission model needed to sandbox scripts`,
    );
  }
  return [
    permissionFlag,
    ...[childPath, ...readPaths].map((p) => `--allow-fs-read=${p}`),
  ];
};

// Permissions are checked against real paths, so grants must not go through
// symlinks (on macOS, for example, /var is a symlink to /private/var).
const realPath = (p: string): string => {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
};

const callableMethods = (iface: SandboxInterface): string[] => {
  const table = iface as { [name: string]: unknown };
  return Object.keys(table).filter(
    (k) => typeof table[k] === "function" && !k.startsWith("_"),
  );
};

export const runScriptInSandbox = (
  script: string,
  iface: SandboxInterface,
  options: RunInSandboxOptions = {},
): Promise<void> => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOldSpaceSizeMb =
    options.maxOldSpaceSizeMb ?? DEFAULT_MAX_OLD_SPACE_SIZE_MB;
  const childPath = options.childPath ?? join(__dirname, "child.js");
  const methods = callableMethods(iface);
  const interfaceModule = options.interfaceModule
    ? realPath(options.interfaceModule)
    : undefined;
  // Directories need a trailing wildcard to be readable recursively.
  const readPaths = [
    ...(interfaceModule ? [join(dirname(interfaceModule), "*")] : []),
    ...(options.readPaths ?? []).map((p) => join(realPath(p), "*")),
  ];

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let child: ChildProcess;
    const stderrChunks: string[] = [];

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
      if (error) reject(error);
      else resolve();
    };

    const timer = setTimeout(() => {
      finish(new SandboxTimeoutError(timeoutMs));
    }, timeoutMs);

    try {
      child = fork(childPath, [], {
        execArgv: [
          ...permissionExecArgv(childPath, readPaths),
          `--max-old-space-size=${maxOldSpaceSizeMb}`,
        ],
        // No environment at all: the script must not see API keys.
        env: {},
        stdio: ["ignore", "ignore", "pipe", "ipc"],
        serialization: "advanced",
      });
    } catch (error) {
      clearTimeout(timer);
      reject(error instanceof Error ? error : new Error(String(error)));
      return;
    }

    child.stderr?.on("data", (chunk: Buffer) => {
      // Keep only a bounded tail so a noisy child cannot exhaust memory here.
      stderrChunks.push(chunk.toString());
      while (stderrChunks.length > 50) stderrChunks.shift();
    });

    child.on("message", (message: ChildMessage) => {
      if (settled) return;
      if (message.type === "ready") {
        child.send({ type: "run", script, methods, interfaceModule });
      } else if (message.type === "call") {
        handleCall(message);
      } else if (message.type === "done") {
        finish();
      } else if (message.type === "failed") {
        finish(new SandboxScriptError(message.error));
      }
    });

    child.on("error", (error) => {
      finish(error);
    });

    child.on("exit", (code, signal) => {
      if (settled) return;
      const stderr = stderrChunks.join("").trim();
      finish(
        new SandboxScriptError(
          `Sandbox exited before the script finished (code ${code}, signal ${signal})` +
            (stderr ? `\n${stderr}` : ""),
        ),
      );
    });

    const handleCall = async (message: {
      id: number;
      method: string;
      args: unknown[];
    }) => {
      const reply = (
        body: { ok: true; value: unknown } | { ok: false; error: string },
      ) => {
        if (settled || !child.connected) return;
        try {
          child.send({ type: "result", id: message.id, ...body });
        } catch (error) {
          // A value that cannot be serialized (for example one holding
          // functions) must fail the call rather than leave the script
          // waiting until the time limit. If the child went away instead,
          // this send fails too and the exit handler reports it.
          try {
            child.send({
              type: "result",
              id: message.id,
              ok: false,
              error: `interface.${message.method} returned a value that cannot be passed to the script: ${error instanceof Error ? error.message : String(error)}`,
            });
          } catch {
            // The child went away; the exit handler reports it.
          }
        }
      };
      if (!methods.includes(message.method)) {
        reply({
          ok: false,
          error: `interface.${message.method} is not a function`,
        });
        return;
      }
      try {
        const fn = (iface as { [name: string]: unknown })[message.method] as (
          ...args: unknown[]
        ) => unknown;
        const value = await fn(...message.args);
        reply({ ok: true, value: value === undefined ? null : value });
      } catch (error) {
        reply({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
  });
};
