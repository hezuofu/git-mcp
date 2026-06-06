import type { ILabelCollection, ToolProvider, ToolDescriptor, PaginatedList, Label } from "@git-mcp/core";
import { z } from "zod";
import type { GitLabHttpClient } from "./gitlab-http-client.js";

function makeList<T>(items: T[]): PaginatedList<T> {
  return { items, totalCount: items.length, pageInfo: { currentPage: 1, perPage: 100 }, nextPage: async () => null, hasMore: () => false, [Symbol.asyncIterator]() { return items[Symbol.iterator]() as any; } } as any;
}

export class GitLabLabelCollection implements ILabelCollection {
  constructor(private readonly http: GitLabHttpClient) {}
  async list(repo: string): Promise<PaginatedList<Label>> {
    const data = await this.http.request<Record<string, unknown>[]>("GET", `/projects/${encodeURIComponent(repo)}/labels?per_page=100`);
    return makeList(data.map((l: any) => ({ id: String(l.id), name: l.name, color: l.color, description: l.description ?? null })));
  }
  async get(repo: string, name: string): Promise<Label> {
    const data = await this.http.request<Record<string, unknown>[]>("GET", `/projects/${encodeURIComponent(repo)}/labels?search=${encodeURIComponent(name)}`);
    const l = data[0];
    if (!l) throw new Error(`Label ${name} not found`);
    return { id: String(l.id), name: l.name as string, color: l.color as string, description: (l.description as string) ?? null };
  }
  async create(repo: string, params: { name: string; color: string; description?: string }): Promise<Label> {
    const l = await this.http.request<any>("POST", `/projects/${encodeURIComponent(repo)}/labels`, { body: JSON.stringify(params) });
    return { id: String(l.id), name: l.name, color: l.color, description: l.description ?? null };
  }
  async update(repo: string, name: string, params: { newName?: string; color?: string; description?: string }): Promise<Label> {
    const l = await this.http.request<any>("PUT", `/projects/${encodeURIComponent(repo)}/labels/${encodeURIComponent(name)}`, { body: JSON.stringify({ new_name: params.newName, color: params.color, description: params.description }) });
    return { id: String(l.id), name: l.name, color: l.color, description: l.description ?? null };
  }
  async delete(repo: string, name: string): Promise<void> {
    await this.http.request("DELETE", `/projects/${encodeURIComponent(repo)}/labels/${encodeURIComponent(name)}`);
  }
}

export class GitLabLabelProvider implements ToolProvider {
  constructor(private readonly c: GitLabLabelCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_labels", description: "List labels", inputSchema: z.object({ repository: z.string() }), execute: async (i) => JSON.stringify(await this.c.list((i as any).repository)) },
    { action: "get_label", description: "Get a label", inputSchema: z.object({ repository: z.string(), name: z.string() }), execute: async (i) => JSON.stringify(await this.c.get((i as any).repository, (i as any).name)) },
    { action: "create_label", description: "Create a label", inputSchema: z.object({ repository: z.string(), name: z.string(), color: z.string(), description: z.string().optional() }), execute: async (i) => JSON.stringify(await this.c.create((i as any).repository, i as any)) },
    { action: "update_label", description: "Update a label", inputSchema: z.object({ repository: z.string(), name: z.string(), newName: z.string().optional(), color: z.string().optional(), description: z.string().optional() }), execute: async (i) => JSON.stringify(await this.c.update((i as any).repository, (i as any).name, i as any)) },
    { action: "delete_label", description: "Delete a label", inputSchema: z.object({ repository: z.string(), name: z.string() }), execute: async (i) => { await this.c.delete((i as any).repository, (i as any).name); return "{}"; } },
  ]; }
}
