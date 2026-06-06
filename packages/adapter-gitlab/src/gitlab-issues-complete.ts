import type { IIssueLinkCollection, ITodoCollection, IReactionCollection, IDraftNoteCollection, IMrVersionCollection, ToolProvider, ToolDescriptor, PaginatedList, IssueLink, TodoItem, EmojiReaction, DraftNote, MrVersion, User } from "@git-mcp/core";
import { z } from "zod";
import type { GitLabHttpClient } from "./gitlab-http-client.js";

function makeList<T>(items: T[]): PaginatedList<T> { return { items, totalCount: items.length, pageInfo: { currentPage: 1, perPage: 100 }, nextPage: async () => null, hasMore: () => false, [Symbol.asyncIterator]() { return items[Symbol.iterator]() as any; } } as any; }
function mapUser(u: any): User { return { id: String(u.id), username: u.username, name: u.name, email: null, avatarUrl: u.avatar_url, platform: "gitlab" }; }

// ── Issue Links ──
export class GitLabIssueLinkCollection implements IIssueLinkCollection {
  constructor(private readonly http: GitLabHttpClient) {}
  async list(repo: string, iid: number): Promise<PaginatedList<IssueLink>> {
    const data = await this.http.request<any[]>("GET", `/projects/${encodeURIComponent(repo)}/issues/${iid}/links?per_page=100`);
    return makeList(data.map((l: any) => ({ id: String(l.id ?? l.link_id), sourceIssueIid: l.source_issue_iid ?? iid, targetIssueIid: l.target_issue_iid, targetProjectId: String(l.target_project_id), linkType: l.link_type ?? "relates_to", targetIssue: { iid: l.target_issue_iid, title: "", webUrl: "", state: "" } })));
  }
  async get(repo: string, iid: number, linkId: string): Promise<IssueLink> {
    const data = await this.http.request<any>("GET", `/projects/${encodeURIComponent(repo)}/issues/${iid}/links/${linkId}`);
    return { id: String(data.id), sourceIssueIid: iid, targetIssueIid: data.target_issue_iid, targetProjectId: String(data.target_project_id), linkType: data.link_type ?? "relates_to", targetIssue: { iid: data.target_issue_iid, title: "", webUrl: "", state: "" } };
  }
  async create(repo: string, iid: number, params: { targetProjectId: string; targetIssueIid: number; linkType?: string }): Promise<IssueLink> {
    const data = await this.http.request<any>("POST", `/projects/${encodeURIComponent(repo)}/issues/${iid}/links`, { body: JSON.stringify({ target_project_id: params.targetProjectId, target_issue_iid: params.targetIssueIid, link_type: params.linkType }) });
    return { id: String(data.id), sourceIssueIid: iid, targetIssueIid: data.target_issue_iid, targetProjectId: String(data.target_project_id), linkType: data.link_type ?? "relates_to", targetIssue: { iid: data.target_issue_iid, title: "", webUrl: "", state: "" } };
  }
  async delete(repo: string, iid: number, linkId: string): Promise<void> { await this.http.request("DELETE", `/projects/${encodeURIComponent(repo)}/issues/${iid}/links/${linkId}`); }
}

export class GitLabIssueLinkProvider implements ToolProvider {
  constructor(private readonly c: GitLabIssueLinkCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_issue_links", description: "List issue links", inputSchema: z.object({ repository: z.string(), issueIid: z.number() }), execute: async (i) => JSON.stringify(await this.c.list((i as any).repository, (i as any).issueIid)) },
    { action: "get_issue_link", description: "Get an issue link", inputSchema: z.object({ repository: z.string(), issueIid: z.number(), linkId: z.string() }), execute: async (i) => JSON.stringify(await this.c.get((i as any).repository, (i as any).issueIid, (i as any).linkId)) },
    { action: "create_issue_link", description: "Create an issue link", inputSchema: z.object({ repository: z.string(), issueIid: z.number(), targetProjectId: z.string(), targetIssueIid: z.number(), linkType: z.string().optional() }), execute: async (i) => JSON.stringify(await this.c.create((i as any).repository, (i as any).issueIid, i as any)) },
    { action: "delete_issue_link", description: "Delete an issue link", inputSchema: z.object({ repository: z.string(), issueIid: z.number(), linkId: z.string() }), execute: async (i) => { await this.c.delete((i as any).repository, (i as any).issueIid, (i as any).linkId); return "{}"; } },
  ]; }
}

// ── Todos ──
export class GitLabTodoCollection implements ITodoCollection {
  constructor(private readonly http: GitLabHttpClient) {}
  async list(params?: { state?: string; type?: string; page?: number; perPage?: number }): Promise<PaginatedList<TodoItem>> {
    let qs = `?per_page=${params?.perPage ?? 50}&page=${params?.page ?? 1}`;
    if (params?.state) qs += `&state=${params.state}`;
    if (params?.type) qs += `&type=${params.type}`;
    const data = await this.http.request<any[]>("GET", `/todos${qs}`);
    return makeList(data.map((t: any) => ({ id: String(t.id), targetType: t.target_type, targetUrl: t.target_url ?? "", body: t.body, state: t.state, author: t.author ? mapUser(t.author) : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "gitlab" }, createdAt: t.created_at })));
  }
  async markDone(todoId: string): Promise<void> { await this.http.request("POST", `/todos/${todoId}/mark_as_done`); }
  async markAllDone(): Promise<void> { await this.http.request("POST", "/todos/mark_as_done"); }
}

export class GitLabTodoProvider implements ToolProvider {
  constructor(private readonly c: GitLabTodoCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_todos", description: "List to-do items", inputSchema: z.object({ state: z.string().optional(), type: z.string().optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (i) => JSON.stringify(await this.c.list(i as any)) },
    { action: "mark_todo_done", description: "Mark a to-do as done", inputSchema: z.object({ todoId: z.string() }), execute: async (i) => { await this.c.markDone((i as any).todoId); return "{}"; } },
    { action: "mark_all_todos_done", description: "Mark all to-dos as done", inputSchema: z.object({}), execute: async () => { await this.c.markAllDone(); return "{}"; } },
  ]; }
}

// ── Emoji Reactions ──
export class GitLabReactionCollection implements IReactionCollection {
  constructor(private readonly http: GitLabHttpClient) {}
  async listMrReactions(repo: string, mrIid: number): Promise<PaginatedList<EmojiReaction>> {
    const data = await this.http.request<any[]>("GET", `/projects/${encodeURIComponent(repo)}/merge_requests/${mrIid}/award_emoji?per_page=100`);
    return makeList(data.map((r: any) => ({ id: String(r.id), name: r.name, user: r.user ? mapUser(r.user) : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "gitlab" }, createdAt: r.created_at ?? "" })));
  }
  async createMrReaction(repo: string, mrIid: number, name: string): Promise<EmojiReaction> {
    const r = await this.http.request<any>("POST", `/projects/${encodeURIComponent(repo)}/merge_requests/${mrIid}/award_emoji`, { body: JSON.stringify({ name }) });
    return { id: String(r.id), name: r.name, user: r.user ? mapUser(r.user) : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "gitlab" }, createdAt: r.created_at ?? "" };
  }
  async deleteMrReaction(repo: string, mrIid: number, reactionId: string): Promise<void> { await this.http.request("DELETE", `/projects/${encodeURIComponent(repo)}/merge_requests/${mrIid}/award_emoji/${reactionId}`); }
  async listMrNoteReactions(repo: string, mrIid: number, noteId: string): Promise<PaginatedList<EmojiReaction>> {
    const data = await this.http.request<any[]>("GET", `/projects/${encodeURIComponent(repo)}/merge_requests/${mrIid}/notes/${noteId}/award_emoji?per_page=100`);
    return makeList(data.map((r: any) => ({ id: String(r.id), name: r.name, user: r.user ? mapUser(r.user) : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "gitlab" }, createdAt: r.created_at ?? "" })));
  }
  async createMrNoteReaction(repo: string, mrIid: number, noteId: string, name: string): Promise<EmojiReaction> {
    const r = await this.http.request<any>("POST", `/projects/${encodeURIComponent(repo)}/merge_requests/${mrIid}/notes/${noteId}/award_emoji`, { body: JSON.stringify({ name }) });
    return { id: String(r.id), name: r.name, user: r.user ? mapUser(r.user) : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "gitlab" }, createdAt: r.created_at ?? "" };
  }
  async deleteMrNoteReaction(repo: string, mrIid: number, noteId: string, reactionId: string): Promise<void> { await this.http.request("DELETE", `/projects/${encodeURIComponent(repo)}/merge_requests/${mrIid}/notes/${noteId}/award_emoji/${reactionId}`); }
  async listIssueReactions(repo: string, iid: number): Promise<PaginatedList<EmojiReaction>> {
    const data = await this.http.request<any[]>("GET", `/projects/${encodeURIComponent(repo)}/issues/${iid}/award_emoji?per_page=100`);
    return makeList(data.map((r: any) => ({ id: String(r.id), name: r.name, user: r.user ? mapUser(r.user) : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "gitlab" }, createdAt: r.created_at ?? "" })));
  }
  async createIssueReaction(repo: string, iid: number, name: string): Promise<EmojiReaction> {
    const r = await this.http.request<any>("POST", `/projects/${encodeURIComponent(repo)}/issues/${iid}/award_emoji`, { body: JSON.stringify({ name }) });
    return { id: String(r.id), name: r.name, user: r.user ? mapUser(r.user) : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "gitlab" }, createdAt: r.created_at ?? "" };
  }
  async deleteIssueReaction(repo: string, iid: number, reactionId: string): Promise<void> { await this.http.request("DELETE", `/projects/${encodeURIComponent(repo)}/issues/${iid}/award_emoji/${reactionId}`); }
  async listIssueNoteReactions(repo: string, iid: number, noteId: string): Promise<PaginatedList<EmojiReaction>> {
    const data = await this.http.request<any[]>("GET", `/projects/${encodeURIComponent(repo)}/issues/${iid}/notes/${noteId}/award_emoji?per_page=100`);
    return makeList(data.map((r: any) => ({ id: String(r.id), name: r.name, user: r.user ? mapUser(r.user) : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "gitlab" }, createdAt: r.created_at ?? "" })));
  }
  async createIssueNoteReaction(repo: string, iid: number, noteId: string, name: string): Promise<EmojiReaction> {
    const r = await this.http.request<any>("POST", `/projects/${encodeURIComponent(repo)}/issues/${iid}/notes/${noteId}/award_emoji`, { body: JSON.stringify({ name }) });
    return { id: String(r.id), name: r.name, user: r.user ? mapUser(r.user) : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "gitlab" }, createdAt: r.created_at ?? "" };
  }
  async deleteIssueNoteReaction(repo: string, iid: number, noteId: string, reactionId: string): Promise<void> { await this.http.request("DELETE", `/projects/${encodeURIComponent(repo)}/issues/${iid}/notes/${noteId}/award_emoji/${reactionId}`); }
}

export class GitLabReactionProvider implements ToolProvider {
  constructor(private readonly c: GitLabReactionCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_pr_reactions", description: "List emoji reactions on an MR", inputSchema: z.object({ repository: z.string(), mrIid: z.number() }), execute: async (i) => JSON.stringify(await this.c.listMrReactions((i as any).repository, (i as any).mrIid)) },
    { action: "create_pr_reaction", description: "Add emoji reaction to an MR", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), name: z.string() }), execute: async (i) => JSON.stringify(await this.c.createMrReaction((i as any).repository, (i as any).mrIid, (i as any).name)) },
    { action: "delete_pr_reaction", description: "Remove emoji reaction from an MR", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), reactionId: z.string() }), execute: async (i) => { await this.c.deleteMrReaction((i as any).repository, (i as any).mrIid, (i as any).reactionId); return "{}"; } },
    { action: "list_pr_note_reactions", description: "List emoji reactions on an MR note", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), noteId: z.string() }), execute: async (i) => JSON.stringify(await this.c.listMrNoteReactions((i as any).repository, (i as any).mrIid, (i as any).noteId)) },
    { action: "create_pr_note_reaction", description: "Add emoji reaction to an MR note", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), noteId: z.string(), name: z.string() }), execute: async (i) => JSON.stringify(await this.c.createMrNoteReaction((i as any).repository, (i as any).mrIid, (i as any).noteId, (i as any).name)) },
    { action: "list_issue_reactions", description: "List emoji reactions on an issue", inputSchema: z.object({ repository: z.string(), issueIid: z.number() }), execute: async (i) => JSON.stringify(await this.c.listIssueReactions((i as any).repository, (i as any).issueIid)) },
    { action: "create_issue_reaction", description: "Add emoji reaction to an issue", inputSchema: z.object({ repository: z.string(), issueIid: z.number(), name: z.string() }), execute: async (i) => JSON.stringify(await this.c.createIssueReaction((i as any).repository, (i as any).issueIid, (i as any).name)) },
    { action: "delete_issue_reaction", description: "Remove emoji reaction from an issue", inputSchema: z.object({ repository: z.string(), issueIid: z.number(), reactionId: z.string() }), execute: async (i) => { await this.c.deleteIssueReaction((i as any).repository, (i as any).issueIid, (i as any).reactionId); return "{}"; } },
    { action: "list_issue_note_reactions", description: "List emoji reactions on an issue note", inputSchema: z.object({ repository: z.string(), issueIid: z.number(), noteId: z.string() }), execute: async (i) => JSON.stringify(await this.c.listIssueNoteReactions((i as any).repository, (i as any).issueIid, (i as any).noteId)) },
    { action: "create_issue_note_reaction", description: "Add emoji reaction to an issue note", inputSchema: z.object({ repository: z.string(), issueIid: z.number(), noteId: z.string(), name: z.string() }), execute: async (i) => JSON.stringify(await this.c.createIssueNoteReaction((i as any).repository, (i as any).issueIid, (i as any).noteId, (i as any).name)) },
  ]; }
}

// ── Draft Notes ──
export class GitLabDraftNoteCollection implements IDraftNoteCollection {
  constructor(private readonly http: GitLabHttpClient) {}
  async list(repo: string, mrIid: number): Promise<PaginatedList<DraftNote>> {
    const data = await this.http.request<any[]>("GET", `/projects/${encodeURIComponent(repo)}/merge_requests/${mrIid}/draft_notes?per_page=100`);
    return makeList(data.map((d: any) => ({ id: String(d.id), body: d.note, author: d.author ? mapUser(d.author) : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "gitlab" }, createdAt: d.created_at })));
  }
  async get(repo: string, mrIid: number, draftId: string): Promise<DraftNote> {
    const d = await this.http.request<any>("GET", `/projects/${encodeURIComponent(repo)}/merge_requests/${mrIid}/draft_notes/${draftId}`);
    return { id: String(d.id), body: d.note, author: d.author ? mapUser(d.author) : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "gitlab" }, createdAt: d.created_at };
  }
  async create(params: { repository: string; mrIid: number; body: string; position?: any }): Promise<DraftNote> {
    const body: any = { note: params.body };
    if (params.position) body.position = params.position;
    const d = await this.http.request<any>("POST", `/projects/${encodeURIComponent(params.repository)}/merge_requests/${params.mrIid}/draft_notes`, { body: JSON.stringify(body) });
    return { id: String(d.id), body: d.note, author: d.author ? mapUser(d.author) : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "gitlab" }, createdAt: d.created_at };
  }
  async update(repo: string, mrIid: number, draftId: string, body: string): Promise<DraftNote> {
    const d = await this.http.request<any>("PUT", `/projects/${encodeURIComponent(repo)}/merge_requests/${mrIid}/draft_notes/${draftId}`, { body: JSON.stringify({ note: body }) });
    return { id: String(d.id), body: d.note, author: d.author ? mapUser(d.author) : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "gitlab" }, createdAt: d.created_at };
  }
  async delete(repo: string, mrIid: number, draftId: string): Promise<void> { await this.http.request("DELETE", `/projects/${encodeURIComponent(repo)}/merge_requests/${mrIid}/draft_notes/${draftId}`); }
  async publish(repo: string, mrIid: number, draftId: string): Promise<void> { await this.http.request("PUT", `/projects/${encodeURIComponent(repo)}/merge_requests/${mrIid}/draft_notes/${draftId}/publish`); }
  async publishAll(repo: string, mrIid: number): Promise<void> { await this.http.request("POST", `/projects/${encodeURIComponent(repo)}/merge_requests/${mrIid}/draft_notes/publish`); }
}

export class GitLabDraftNoteProvider implements ToolProvider {
  constructor(private readonly c: GitLabDraftNoteCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_draft_notes", description: "List draft notes on an MR", inputSchema: z.object({ repository: z.string(), mrIid: z.number() }), execute: async (i) => JSON.stringify(await this.c.list((i as any).repository, (i as any).mrIid)) },
    { action: "get_draft_note", description: "Get a draft note", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), draftId: z.string() }), execute: async (i) => JSON.stringify(await this.c.get((i as any).repository, (i as any).mrIid, (i as any).draftId)) },
    { action: "create_draft_note", description: "Create a draft note on an MR", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), body: z.string() }), execute: async (i) => JSON.stringify(await this.c.create(i as any)) },
    { action: "update_draft_note", description: "Update a draft note", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), draftId: z.string(), body: z.string() }), execute: async (i) => JSON.stringify(await this.c.update((i as any).repository, (i as any).mrIid, (i as any).draftId, (i as any).body)) },
    { action: "delete_draft_note", description: "Delete a draft note", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), draftId: z.string() }), execute: async (i) => { await this.c.delete((i as any).repository, (i as any).mrIid, (i as any).draftId); return "{}"; } },
    { action: "publish_draft_note", description: "Publish a draft note", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), draftId: z.string() }), execute: async (i) => { await this.c.publish((i as any).repository, (i as any).mrIid, (i as any).draftId); return "{}"; } },
    { action: "bulk_publish_draft_notes", description: "Publish all draft notes", inputSchema: z.object({ repository: z.string(), mrIid: z.number() }), execute: async (i) => { await this.c.publishAll((i as any).repository, (i as any).mrIid); return "{}"; } },
  ]; }
}

// ── MR Versions ──
export class GitLabMrVersionCollection implements IMrVersionCollection {
  constructor(private readonly http: GitLabHttpClient) {}
  async list(repo: string, mrIid: number): Promise<PaginatedList<MrVersion>> {
    const data = await this.http.request<any[]>("GET", `/projects/${encodeURIComponent(repo)}/merge_requests/${mrIid}/versions?per_page=100`);
    return makeList(data.map((v: any) => ({ id: String(v.id), headCommitSha: v.head_commit_sha, baseCommitSha: v.base_commit_sha, startCommitSha: v.start_commit_sha, createdAt: v.created_at })));
  }
  async get(repo: string, mrIid: number, versionId: string): Promise<MrVersion> {
    const v = await this.http.request<any>("GET", `/projects/${encodeURIComponent(repo)}/merge_requests/${mrIid}/versions/${versionId}`);
    return { id: String(v.id), headCommitSha: v.head_commit_sha, baseCommitSha: v.base_commit_sha, startCommitSha: v.start_commit_sha, createdAt: v.created_at };
  }
}

export class GitLabMrVersionProvider implements ToolProvider {
  constructor(private readonly c: GitLabMrVersionCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_mr_versions", description: "List MR versions", inputSchema: z.object({ repository: z.string(), mrIid: z.number() }), execute: async (i) => JSON.stringify(await this.c.list((i as any).repository, (i as any).mrIid)) },
    { action: "get_mr_version", description: "Get an MR version", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), versionId: z.string() }), execute: async (i) => JSON.stringify(await this.c.get((i as any).repository, (i as any).mrIid, (i as any).versionId)) },
  ]; }
}
