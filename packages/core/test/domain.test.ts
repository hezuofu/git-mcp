import { describe, it } from "node:test";
import assert from "node:assert";

describe("CreatePrBuilder", () => {
  it("builds valid CreatePrParams", async () => {
    const { CreatePrBuilder } = await import("../build/domain/builders.js");
    const params = new CreatePrBuilder()
      .title("feat: add login")
      .source("feature/login")
      .target("main")
      .description("Implements OAuth2 login flow")
      .asDraft()
      .build();

    assert.strictEqual(params.title, "feat: add login");
    assert.strictEqual(params.sourceBranch, "feature/login");
    assert.strictEqual(params.targetBranch, "main");
    assert.strictEqual(params.description, "Implements OAuth2 login flow");
    assert.strictEqual(params.draft, true);
  });

  it("throws on build without title", async () => {
    const { CreatePrBuilder } = await import("../build/domain/builders.js");
    assert.throws(() => { new CreatePrBuilder().build(); }, /title is required/i);
  });

  it("throws on build without source branch", async () => {
    const { CreatePrBuilder } = await import("../build/domain/builders.js");
    assert.throws(() => { new CreatePrBuilder().title("test").target("main").build(); }, /Source branch/i);
  });

  it("throws on build without target branch", async () => {
    const { CreatePrBuilder } = await import("../build/domain/builders.js");
    assert.throws(() => { new CreatePrBuilder().title("test").source("feat/x").build(); }, /Target branch/i);
  });
});

describe("CreateIssueBuilder", () => {
  it("builds valid CreateIssueParams", async () => {
    const { CreateIssueBuilder } = await import("../build/domain/builders.js");
    const params = new CreateIssueBuilder()
      .title("Bug: login broken")
      .description("Steps to reproduce...")
      .addLabel("bug")
      .addLabel("priority-high")
      .build();

    assert.strictEqual(params.title, "Bug: login broken");
    assert.deepStrictEqual(params.labels, ["bug", "priority-high"]);
  });

  it("throws on build without title", async () => {
    const { CreateIssueBuilder } = await import("../build/domain/builders.js");
    assert.throws(() => { new CreateIssueBuilder().build(); }, /title is required/i);
  });
});

describe("PaginatedList", () => {
  it("implements async iteration over pages", async () => {
    const { PaginatedList } = await import("../build/domain/paginated-list.js");

    let instanceCount = 0;
    class TestList extends PaginatedList<number> {
      totalCount = 3;
      items: number[];
      pageInfo = { currentPage: 1, perPage: 1 };

      constructor(readonly pageNum: number) {
        super();
        this.items = [pageNum];
      }

      async nextPage() {
        const next = this.pageNum + 1;
        return next >= 3 ? null : new TestList(next);
      }
      hasMore() { return this.pageNum < 2; }
    }

    const results: number[] = [];
    for await (const item of new TestList(0)) {
      results.push(item);
    }
    assert.strictEqual(results.length, 3);
    assert.deepStrictEqual(results, [0, 1, 2]);
  });

  it("empty list yields no items", async () => {
    const { PaginatedList } = await import("../build/domain/paginated-list.js");

    class EmptyList extends PaginatedList<string> {
      totalCount = 0;
      items: string[] = [];
      pageInfo = { currentPage: 1, perPage: 20 };
      async nextPage() { return null; }
      hasMore() { return false; }
    }

    const results: string[] = [];
    for await (const item of new EmptyList()) {
      results.push(item);
    }
    assert.strictEqual(results.length, 0);
  });
});

describe("PlatformRegistry", () => {
  it("registers and retrieves platforms", async () => {
    const { PlatformRegistry } = await import("../build/domain/git-platform.js");

    const registry = new PlatformRegistry();
    const mockPlatform = {
      id: "github" as const,
      displayName: "GitHub",
      defaultApiUrl: "https://api.github.com",
    } as any;

    registry.register(mockPlatform);
    assert.strictEqual(registry.get("github"), mockPlatform);
    assert.strictEqual(registry.list().length, 1);
  });

  it("throws on duplicate registration", async () => {
    const { PlatformRegistry } = await import("../build/domain/git-platform.js");

    const registry = new PlatformRegistry();
    const mock = { id: "github" as const } as any;
    registry.register(mock);
    assert.throws(() => registry.register(mock), /already registered/i);
  });

  it("returns undefined for unknown platform", async () => {
    const { PlatformRegistry } = await import("../build/domain/git-platform.js");
    const registry = new PlatformRegistry();
    assert.strictEqual(registry.get("unknown"), undefined);
  });
});
