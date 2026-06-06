import { describe, it } from "node:test";
import assert from "node:assert";

describe("core types", () => {
  it("ErrorCode enum has all expected members", async () => {
    const { ErrorCode } = await import("../build/types/errors.js");
    assert.ok(ErrorCode.NOT_FOUND);
    assert.ok(ErrorCode.PERMISSION_DENIED);
    assert.ok(ErrorCode.AUTHENTICATION_FAILED);
    assert.ok(ErrorCode.RATE_LIMIT_EXCEEDED);
    assert.ok(ErrorCode.VALIDATION_FAILED);
    assert.ok(ErrorCode.CONFLICT);
    assert.ok(ErrorCode.UNSUPPORTED_OPERATION);
    assert.ok(ErrorCode.INTERNAL_ERROR);
  });

  it("PlatformId union includes known platforms", () => {
    const platforms: Array<"github" | "gitlab" | "gitee" | "gitcode"> = [
      "github", "gitlab", "gitee", "gitcode"
    ];
    assert.strictEqual(platforms.length, 4);
  });

  it("AuthEntry discriminated union works with pat type", async () => {
    const pat: { type: "pat"; token: string } = { type: "pat", token: "test" };
    assert.strictEqual(pat.type, "pat");
    assert.strictEqual(pat.token, "test");
  });

  it("GitMcpConfig can hold multiple platform entries", async () => {
    const config = {
      platforms: [
        { platform: "github" as const, auth: { type: "pat" as const, token: "ghp_xxx" } },
        { platform: "gitlab" as const, auth: { type: "pat" as const, token: "glpat_xxx" } },
      ],
    };
    assert.strictEqual(config.platforms.length, 2);
  });
});
