import type { ITagCollection, ToolProvider, ToolDescriptor, PaginatedList, TagInfo } from "@git-mcp/core";
import { z } from "zod";
import type { GitLabHttpClient } from "./gitlab-http-client.js";

function makeList<T>(items: T[]): PaginatedList<T> {
  return { items, totalCount: items.length, pageInfo: { currentPage: 1, perPage: 100 }, nextPage: async () => null, hasMore: () => false, [Symbol.asyncIterator]() { return items[Symbol.iterator]() as any; } } as any;
}

export class GitLabTagCollection implements ITagCollection {
  constructor(private readonly http: GitLabHttpClient) {}
  async list(repo: string): Promise<PaginatedList<TagInfo>> {
    const data = await this.http.request<Record<string, unknown>[]>("GET", `/projects/${encodeURIComponent(repo)}/repository/tags?per_page=100`);
    return makeList(data.map((t: any) => ({ name: t.name, message: (t.message as string) ?? "", commitSha: (t.commit as any)?.id ?? "", createdAt: (t.commit as any)?.created_at ?? "" })));
  }
  async get(repo: string, name: string): Promise<TagInfo> {
    const t = await this.http.request<any>("GET", `/projects/${encodeURIComponent(repo)}/repository/tags/${encodeURIComponent(name)}`);
    return { name: t.name, message: t.message ?? "", commitSha: (t.commit as any)?.id ?? "", createdAt: (t.commit as any)?.created_at ?? "" };
  }
  async create(params: { repository: string; name: string; ref: string; message?: string }): Promise<TagInfo> {
    const t = await this.http.request<any>("POST", `/projects/${encodeURIComponent(params.repository)}/repository/tags`, {
      body: JSON.stringify({ tag_name: params.name, ref: params.ref, message: params.message }),
    });
    return { name: t.name, message: t.message ?? "", commitSha: (t.commit as any)?.id ?? "", createdAt: (t.commit as any)?.created_at ?? "" };
  }
  async delete(repo: string, name: string): Promise<void> {
    await this.http.request("DELETE", `/projects/${encodeURIComponent(repo)}/repository/tags/${encodeURIComponent(name)}`);
  }
}

export class GitLabTagProvider implements ToolProvider {
  constructor(private readonly c: GitLabTagCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_tags", description: "List tags", inputSchema: z.object({ repository: z.string() }), execute: async (i) => JSON.stringify(await this.c.list((i as any).repository)) },
    { action: "get_tag", description: "Get a tag", inputSchema: z.object({ repository: z.string(), name: z.string() }), execute: async (i) => JSON.stringify(await this.c.get((i as any).repository, (i as any).name)) },
    { action: "create_tag", description: "Create a tag", inputSchema: z.object({ repository: z.string(), name: z.string(), ref: z.string(), message: z.string().optional() }), execute: async (i) => JSON.stringify(await this.c.create(i as any)) },
    { action: "delete_tag", description: "Delete a tag", inputSchema: z.object({ repository: z.string(), name: z.string() }), execute: async (i) => { await this.c.delete((i as any).repository, (i as any).name); return "{}"; } },
  ]; }
}
