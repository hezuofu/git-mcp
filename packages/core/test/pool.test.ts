import { describe, it } from "node:test";
import assert from "node:assert";

describe("shouldBypassProxy", () => {
  it("returns false when noProxy is undefined", async () => {
    const { shouldBypassProxy } = await import("../build/pool/proxy-bypass.js");
    assert.strictEqual(shouldBypassProxy("https://gitlab.com/api/v4", undefined), false);
  });

  it("bypasses exact hostname match", async () => {
    const { shouldBypassProxy } = await import("../build/pool/proxy-bypass.js");
    assert.strictEqual(shouldBypassProxy("https://gitlab.internal/api/v4", "gitlab.internal"), true);
  });

  it("bypasses domain suffix match", async () => {
    const { shouldBypassProxy } = await import("../build/pool/proxy-bypass.js");
    assert.strictEqual(shouldBypassProxy("https://api.gitlab.internal/v4", ".gitlab.internal"), true);
  });

  it("bypasses wildcard", async () => {
    const { shouldBypassProxy } = await import("../build/pool/proxy-bypass.js");
    assert.strictEqual(shouldBypassProxy("https://anything.example.com", "*"), true);
  });

  it("does not bypass unmatched hostname", async () => {
    const { shouldBypassProxy } = await import("../build/pool/proxy-bypass.js");
    assert.strictEqual(shouldBypassProxy("https://github.com/api", "gitlab.internal"), false);
  });

  it("respects port-specific patterns", async () => {
    const { shouldBypassProxy } = await import("../build/pool/proxy-bypass.js");
    assert.strictEqual(shouldBypassProxy("https://example.com:8080/api", "example.com:8080"), true);
    assert.strictEqual(shouldBypassProxy("https://example.com:3000/api", "example.com:8080"), false);
  });
});

describe("ConnectionPool", () => {
  it("creates agents for a base URL", async () => {
    const { ConnectionPool } = await import("../build/pool/connection-pool.js");
    const pool = new ConnectionPool({});
    const agents = pool.getAgents("https://github.com");
    assert.ok(agents.http);
    assert.ok(agents.https);
    pool.closeAll();
  });

  it("reuses agents for same base URL", async () => {
    const { ConnectionPool } = await import("../build/pool/connection-pool.js");
    const pool = new ConnectionPool({});
    const a1 = pool.getAgents("https://github.com");
    const a2 = pool.getAgents("https://github.com");
    assert.strictEqual(a1, a2);
    pool.closeAll();
  });

  it("enforces pool max size", async () => {
    const { ConnectionPool } = await import("../build/pool/connection-pool.js");
    const pool = new ConnectionPool({ poolMaxSize: 2 });
    pool.getAgents("https://a.example.com");
    pool.getAgents("https://b.example.com");
    assert.throws(() => pool.getAgents("https://c.example.com"), /pool is full/i);
    pool.closeAll();
  });
});
