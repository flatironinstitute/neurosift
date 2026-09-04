import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, before, after } from "node:test";
import {
  SandboxScriptError,
  SandboxTimeoutError,
  runScriptInSandbox,
} from "./runInSandbox";

// A stand-in for createScriptInterface: print accumulates output, the other
// methods echo their arguments back so round-tripping can be checked.
const makeInterface = () => {
  let output = "";
  return {
    print: (text: unknown) => {
      output += (typeof text === "string" ? text : JSON.stringify(text)) + "\n";
    },
    _getOutput: () => output,
    getDandisets: async () => [
      { dandiset_id: "000001", name: "one" },
      { dandiset_id: "000002", name: "two" },
    ],
    echo: async (...args: unknown[]) => args,
    fail: async (message: string) => {
      throw new Error(message);
    },
    slowAdd: async (a: number, b: number) => {
      await new Promise((r) => setTimeout(r, 50));
      return a + b;
    },
  };
};

describe("runScriptInSandbox", () => {
  let secretDir: string;
  let secretPath: string;

  before(() => {
    secretDir = mkdtempSync(join(tmpdir(), "sandbox-test-"));
    secretPath = join(secretDir, ".env");
    writeFileSync(secretPath, 'OPENAI_API_KEY="sk-secret-value"\n');
    process.env.OPENAI_API_KEY = "sk-secret-value";
    process.env.PUBNUB_PUBLISH_KEY = "pub-secret-value";
  });

  after(() => {
    rmSync(secretDir, { recursive: true, force: true });
  });

  it("runs a script and collects printed output", async () => {
    const iface = makeInterface();
    await runScriptInSandbox(
      `
      interface.print("hello");
      const ds = await interface.getDandisets();
      interface.print(ds.map(d => d.dandiset_id).join(","));
      interface.print({ n: ds.length });
      `,
      iface,
    );
    assert.equal(iface._getOutput(), 'hello\n000001,000002\n{"n":2}\n');
  });

  it("round-trips arguments and return values through the interface", async () => {
    const iface = makeInterface();
    await runScriptInSandbox(
      `
      const r = await interface.echo(1, "two", { three: [3, 3.5] }, null);
      interface.print(JSON.stringify(r));
      const s = await interface.slowAdd(2, 3);
      interface.print(String(s));
      `,
      iface,
    );
    assert.equal(iface._getOutput(), '[1,"two",{"three":[3,3.5]},null]\n5\n');
  });

  it("delivers interface errors to the script as exceptions", async () => {
    const iface = makeInterface();
    await runScriptInSandbox(
      `
      try {
        await interface.fail("nope");
        interface.print("not reached");
      } catch (e) {
        interface.print("caught: " + e.message);
      }
      `,
      iface,
    );
    assert.equal(iface._getOutput(), "caught: nope\n");
  });

  it("rejects with the script's error message when the script throws", async () => {
    const iface = makeInterface();
    await assert.rejects(
      runScriptInSandbox(`throw new Error("script failure");`, iface),
      (e: unknown) =>
        e instanceof SandboxScriptError && /script failure/.test(e.message),
    );
  });

  it("rejects on a syntax error", async () => {
    const iface = makeInterface();
    await assert.rejects(
      runScriptInSandbox(`this is not javascript`, iface),
      (e: unknown) =>
        e instanceof SandboxScriptError && /SyntaxError/.test(e.message),
    );
  });

  it("refuses calls to methods not on the interface", async () => {
    const iface = makeInterface();
    await runScriptInSandbox(
      `
      interface.print(typeof interface._getOutput);
      interface.print(typeof interface.nothing);
      `,
      iface,
    );
    assert.equal(iface._getOutput(), "undefined\nundefined\n");
  });

  it("does not expose this process's environment", async () => {
    const iface = makeInterface();
    await runScriptInSandbox(
      `interface.print(JSON.stringify(Object.keys(process.env)));
       interface.print(String(process.env.OPENAI_API_KEY));`,
      iface,
    );
    const out = iface._getOutput();
    assert.ok(!out.includes("sk-secret-value"), out);
    assert.ok(!out.includes("pub-secret-value"), out);
    assert.ok(!out.includes("OPENAI_API_KEY"), out);
  });

  it("cannot read files", async () => {
    const iface = makeInterface();
    await runScriptInSandbox(
      `
      const fs = await import("node:fs");
      try {
        interface.print(fs.readFileSync(${JSON.stringify(secretPath)}, "utf8"));
      } catch (e) {
        interface.print("denied: " + e.code);
      }
      try {
        interface.print(JSON.stringify(fs.readdirSync(${JSON.stringify(secretDir)})));
      } catch (e) {
        interface.print("denied: " + e.code);
      }
      `,
      iface,
    );
    const out = iface._getOutput();
    assert.ok(!out.includes("sk-secret-value"), out);
    assert.equal(out, "denied: ERR_ACCESS_DENIED\ndenied: ERR_ACCESS_DENIED\n");
  });

  it("cannot write files", async () => {
    const iface = makeInterface();
    const target = join(secretDir, "written.txt");
    await runScriptInSandbox(
      `
      const fs = await import("node:fs");
      try {
        fs.writeFileSync(${JSON.stringify(target)}, "x");
        interface.print("wrote");
      } catch (e) {
        interface.print("denied: " + e.code);
      }
      `,
      iface,
    );
    assert.equal(iface._getOutput(), "denied: ERR_ACCESS_DENIED\n");
    assert.equal(existsSync(target), false);
  });

  it("cannot spawn processes or worker threads", async () => {
    const iface = makeInterface();
    await runScriptInSandbox(
      `
      const cp = await import("node:child_process");
      try {
        interface.print(cp.execSync("id").toString());
      } catch (e) {
        interface.print("denied: " + e.code);
      }
      const wt = await import("node:worker_threads");
      try {
        new wt.Worker("process.exit(0)", { eval: true });
        interface.print("spawned worker");
      } catch (e) {
        interface.print("denied: " + e.code);
      }
      `,
      iface,
    );
    assert.equal(
      iface._getOutput(),
      "denied: ERR_ACCESS_DENIED\ndenied: ERR_ACCESS_DENIED\n",
    );
  });

  it("does not hand the script a require function through process.mainModule", async () => {
    const iface = makeInterface();
    await runScriptInSandbox(
      `interface.print(typeof process.mainModule);
       interface.print(typeof require);`,
      iface,
    );
    assert.equal(iface._getOutput(), "undefined\nundefined\n");
  });

  it("kills a script that exceeds the time limit", async () => {
    const iface = makeInterface();
    const started = Date.now();
    await assert.rejects(
      runScriptInSandbox(`await new Promise(() => {});`, iface, {
        timeoutMs: 500,
      }),
      (e: unknown) => e instanceof SandboxTimeoutError,
    );
    assert.ok(Date.now() - started < 5000);
  });

  it("reports a script that kills its own process", async () => {
    const iface = makeInterface();
    await assert.rejects(
      runScriptInSandbox(`process.exit(3)`, iface),
      (e: unknown) =>
        e instanceof SandboxScriptError && /exited before/.test(e.message),
    );
  });

  it("runs several scripts concurrently without mixing their output", async () => {
    const a = makeInterface();
    const b = makeInterface();
    await Promise.all([
      runScriptInSandbox(
        `for (let i = 0; i < 20; i++) { interface.print("a" + await interface.slowAdd(i, 0)); }`,
        a,
      ),
      runScriptInSandbox(
        `for (let i = 0; i < 20; i++) { interface.print("b" + await interface.slowAdd(i, 100)); }`,
        b,
      ),
    ]);
    const expectedA = Array.from({ length: 20 }, (_, i) => `a${i}`).join("\n") + "\n";
    const expectedB = Array.from({ length: 20 }, (_, i) => `b${i + 100}`).join("\n") + "\n";
    assert.equal(a._getOutput(), expectedA);
    assert.equal(b._getOutput(), expectedB);
  });
});
