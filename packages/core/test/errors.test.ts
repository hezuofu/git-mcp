import { describe, it } from "node:test";
import assert from "node:assert";

describe("NotFoundError", () => {
  it("has correct code, status, and suggestion", async () => {
    const { NotFoundError } = await import("../build/errors/domain-error.js");
    const err = new NotFoundError("repo 'x/y' not found");
    assert.strictEqual(err.code, "NOT_FOUND");
    assert.strictEqual(err.statusCode, 404);
    assert.ok(err.suggestion.includes("Verify"));
  });
});

describe("RateLimitExceededError", () => {
  it("is marked recoverable by ErrorMapper", async () => {
    const { RateLimitExceededError } = await import("../build/errors/domain-error.js");
    const { ErrorMapper } = await import("../build/errors/error-mapper.js");
    const mapper = new ErrorMapper();
    const result = mapper.toToolResult(new RateLimitExceededError("limit hit", "100"));
    assert.strictEqual(result.error.code, "RATE_LIMIT_EXCEEDED");
    assert.strictEqual(result.error.recoverable, true);
  });
});

describe("AuthenticationError", () => {
  it("is marked recoverable by ErrorMapper", async () => {
    const { AuthenticationError } = await import("../build/errors/domain-error.js");
    const { ErrorMapper } = await import("../build/errors/error-mapper.js");
    const mapper = new ErrorMapper();
    const result = mapper.toToolResult(new AuthenticationError("bad token"));
    assert.strictEqual(result.error.recoverable, true);
  });
});

describe("UnsupportedOperationError", () => {
  it("names the platform and operation", async () => {
    const { UnsupportedOperationError } = await import("../build/errors/domain-error.js");
    const err = new UnsupportedOperationError("create_pipeline", "github");
    assert.ok(err.message.includes("create_pipeline"));
    assert.ok(err.message.includes("github"));
    assert.strictEqual(err.statusCode, 501);
  });
});

describe("ErrorMapper", () => {
  it("non-recoverable errors have recoverable=false", async () => {
    const { NotFoundError } = await import("../build/errors/domain-error.js");
    const { ErrorMapper } = await import("../build/errors/error-mapper.js");
    const mapper = new ErrorMapper();
    const result = mapper.toToolResult(new NotFoundError("not found"));
    assert.strictEqual(result.error.recoverable, false);
  });

  it("includes suggestion in output", async () => {
    const { NotFoundError } = await import("../build/errors/domain-error.js");
    const { ErrorMapper } = await import("../build/errors/error-mapper.js");
    const mapper = new ErrorMapper();
    const result = mapper.toToolResult(new NotFoundError("test"));
    assert.ok(typeof result.error.suggestion === "string");
    assert.ok(result.error.suggestion.length > 0);
  });
});
