// Entry point of the sandboxed child process that runs one submitted script.
//
// This file must not import anything outside of Node built-ins: it runs under
// Node's permission model with no file system, child process, or worker
// access, and with an empty environment. Everything the script is allowed to
// do goes through the `interface` object, whose methods are forwarded to the
// parent process over IPC and executed there.

type ParentMessage =
  | { type: "run"; script: string; methods: string[] }
  | { type: "result"; id: number; ok: true; value: unknown }
  | { type: "result"; id: number; ok: false; error: string };

type ChildMessage =
  | { type: "ready" }
  | { type: "call"; id: number; method: string; args: unknown[] }
  | { type: "done" }
  | { type: "failed"; error: string };

const send = (message: ChildMessage) => {
  if (!process.send) {
    throw new Error("Sandbox child was started without an IPC channel");
  }
  process.send(message);
};

const pending = new Map<
  number,
  { resolve: (value: unknown) => void; reject: (error: Error) => void }
>();
let nextCallId = 1;

const callParent = (method: string, args: unknown[]): Promise<unknown> => {
  const id = nextCallId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    send({ type: "call", id, method, args });
  });
};

const errorToString = (error: unknown): string => {
  if (error instanceof Error) {
    return error.stack || `${error.name}: ${error.message}`;
  }
  return String(error);
};

const buildInterface = (methods: string[]) => {
  const iface: { [name: string]: (...args: unknown[]) => unknown } = {};
  for (const method of methods) {
    if (method === "print") {
      // print is synchronous for the script: the call is sent and the reply
      // is ignored, which keeps output ordering without making scripts await.
      iface.print = (...args: unknown[]) => {
        callParent("print", args).catch(() => {});
      };
    } else {
      iface[method] = (...args: unknown[]) => callParent(method, args);
    }
  }
  return Object.freeze(iface);
};

const harden = () => {
  // The permission model blocks the dangerous APIs; this only removes a few
  // conveniences that would otherwise hand a script a require function.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = process as any;
  try {
    delete p.mainModule;
  } catch {
    // ignore
  }
};

const run = async (script: string, methods: string[]) => {
  harden();
  const iface = buildInterface(methods);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const scriptFn = new AsyncFunction("interface", script);
  await scriptFn(iface);
};

process.on("message", (message: ParentMessage) => {
  if (message.type === "run") {
    run(message.script, message.methods)
      .then(() => send({ type: "done" }))
      .catch((error) => send({ type: "failed", error: errorToString(error) }));
  } else if (message.type === "result") {
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.ok) {
      entry.resolve(message.value);
    } else {
      entry.reject(new Error(message.error));
    }
  }
});

process.on("disconnect", () => {
  process.exit(0);
});

send({ type: "ready" });
