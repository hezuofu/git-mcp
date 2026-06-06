import type { ITagCollection, ToolProvider, ToolDescriptor, PaginatedList, TagInfo } from "@git-mcp/core";
import { z } from "zod";
import type { GitHubHttpClient } from "./github-http-client.js";

function makeList<T>(items: T[]): PaginatedList<T> {
  return { items, totalCount: items.length, pageInfo: { currentPage: 1, perPage: 100 }, nextPage: async () => null, hasMore: () => false, [Symbol.asyncIterator]() { return items[Symbol.iterator]() as any; } } as any;
}

export class GitHubTagCollection implements ITagCollection {
  constructor(private readonly http: GitHubHttpClient) {}
  async list(repo: string): Promise<PaginatedList<TagInfo>> {
    const data = await this.http.request<Record<string, unknown>[]>("GET", `/repos/${repo}/tags?per_page=100`);
    return makeList(data.map((t: any) => ({ name: t.name, message: "", commitSha: (t.commit as any)?.sha ?? "", createdAt: "" })));
  }
  async get(repo: string, name: string): Promise<TagInfo> {
    const data = await this.http.request<Record<string, unknown>[]>("GET", `/repos/${repo}/tags?per_page=100`);
    const t = data.find((t: any) => t.name === name);
    if (!t) throw new Error(`Tag ${name} not found`);
    return { name: t.name as string, message: "", commitSha: (t.commit as any)?.sha as string ?? "", createdAt: "" };
  }
  async create(params: { repository: string; name: string; ref: string; message?: string }): Promise<TagInfo> {
    const body: any = { tag: params.name, message: params.message ?? params.name, object: params.ref, type: "commit" };
    const r = await this.http.request<any>("POST", `/repos/${params.repository}/git/tags`, { body: JSON.stringify(body) });
    await this.http.request("POST", `/repos/${params.repository}/git/refs`, { body: JSON.stringify({ ref: `refs/tags/${params.name}`, sha: r.sha }) });
    return { name: params.name, message: params.message ?? "", commitSha: r.sha, createdAt: "" };
  }
  async delete(repo: string, name: string): Promise<void> {
    await this.http.request("DELETE", `/repos/${repo}/git/refs/tags/${encodeURIComponent(name)}`);
  }
}

export class GitHubTagProvider implements ToolProvider {
  constructor(private readonly c: GitHubTagCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_tags", description: "List tags", inputSchema: z.object({ repository: z.string() }), execute: async (i) => JSON.stringify(await this.c.list((i as any).repository)) },
    { action: "get_tag", description: "Get a tag", inputSchema: z.object({ repository: z.string(), name: z.string() }), execute: async (i) => JSON.stringify(await this.c.get((i as any).repository, (i as any).name)) },
    { action: "create_tag", description: "Create a tag", inputSchema: z.object({ repository: z.string(), name: z.string(), ref: z.string(), message: z.string().optional() }), execute: async (i) => JSON.stringify(await this.c.create(i as any)) },
    { action: "delete_tag", description: "Delete a tag", inputSchema: z.object({ repository: z.string(), name: z.string() }), execute: async (i) => { await this.c.delete((i as any).repository, (i as any).name); return "{}"; } },
  ]; }
}
