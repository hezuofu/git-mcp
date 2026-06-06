import type { IIssueLinkCollection, ITodoCollection, IReactionCollection, IDraftNoteCollection, IMrVersionCollection, ToolProvider, ToolDescriptor, PaginatedList, IssueLink, TodoItem, EmojiReaction, DraftNote, MrVersion, User } from "@git-mcp/core";
import { z } from "zod";
import type { GitHubHttpClient } from "./github-http-client.js";

function makeList<T>(items: T[]): PaginatedList<T> { return { items, totalCount: items.length, pageInfo: { currentPage: 1, perPage: 100 }, nextPage: async () => null, hasMore: () => false, [Symbol.asyncIterator]() { return items[Symbol.iterator]() as any; } } as any; }
function mapUser(u: any): User { return { id: String(u.id), username: u.login, name: u.login, email: null, avatarUrl: u.avatar_url, platform: "github" }; }

// ── Issue Links (GitHub: cross-references via timeline API) ──
export class GitHubIssueLinkCollection implements IIssueLinkCollection {
  constructor(private readonly http: GitHubHttpClient) {}

  async list(repo: string, issueIid: number): Promise<PaginatedList<IssueLink>> {
    // Use the timeline API to find cross-referenced events
    const events = await this.http.request<any[]>("GET", `/repos/${repo}/issues/${issueIid}/timeline?per_page=100`);
    const links: IssueLink[] = [];
    for (const e of (events ?? [])) {
      if (e.event === "cross-referenced" && e.source?.issue) {
        const src = e.source.issue;
        links.push({
          id: `ref-${src.number}`, sourceIssueIid: issueIid,
          targetIssueIid: src.number, targetProjectId: src.repository?.full_name ?? "",
          linkType: "cross-reference",
          targetIssue: { iid: src.number, title: src.title ?? "", webUrl: src.html_url ?? "", state: src.state ?? "" },
        });
      }
      // Also check connected PRs
      if (e.event === "connected" || e.event === "disconnected") {
        const src = e.source?.issue;
        if (src) {
          links.push({
            id: `conn-${src.number}`, sourceIssueIid: issueIid,
            targetIssueIid: src.number, targetProjectId: src.repository?.full_name ?? "",
            linkType: e.event,
            targetIssue: { iid: src.number, title: src.title ?? "", webUrl: src.html_url ?? "", state: src.state ?? "" },
          });
        }
      }
    }
    return makeList(links);
  }

  async get(repo: string, issueIid: number, linkId: string): Promise<IssueLink> {
    const all = await this.list(repo, issueIid);
    const found = all.items.find(l => l.id === linkId);
    if (!found) throw new Error(`Issue link ${linkId} not found`);
    return found;
  }

  async create(repo: string, issueIid: number, params: { targetProjectId: string; targetIssueIid: number; linkType?: string }): Promise<IssueLink> {
    // GitHub doesn't have explicit issue links; add a comment referencing the target issue
    const ref = params.targetProjectId === repo
      ? `#${params.targetIssueIid}`
      : `${params.targetProjectId}#${params.targetIssueIid}`;
    const verb = params.linkType === "blocks" ? "Blocks" : "Related to";
    await this.http.request("POST", `/repos/${repo}/issues/${issueIid}/comments`, {
      body: JSON.stringify({ body: `${verb} ${ref}` }),
    });
    return {
      id: `ref-${params.targetIssueIid}`, sourceIssueIid: issueIid,
      targetIssueIid: params.targetIssueIid, targetProjectId: params.targetProjectId,
      linkType: params.linkType ?? "relates_to",
      targetIssue: { iid: params.targetIssueIid, title: "", webUrl: `https://github.com/${params.targetProjectId}/issues/${params.targetIssueIid}`, state: "" },
    };
  }

  async delete(repo: string, issueIid: number, _linkId: string): Promise<void> {
    // GitHub cross-references can't be deleted via REST API (they auto-resolve)
    // Just add a comment noting the removal
    await this.http.request("POST", `/repos/${repo}/issues/${issueIid}/comments`, {
      body: JSON.stringify({ body: "Removed issue link reference." }),
    });
  }
}

// ── Todos ──
export class GitHubTodoCollection implements ITodoCollection {
  constructor(private readonly http: GitHubHttpClient) {}
  async list(params?: { state?: string; type?: string; page?: number; perPage?: number }): Promise<PaginatedList<TodoItem>> {
    const qs = `?per_page=${params?.perPage ?? 50}&page=${params?.page ?? 1}`;
    // GitHub notifications act as "todos"
    const data = await this.http.request<any[]>("GET", `/notifications${qs}`);
    return makeList(data.map((n: any) => ({
      id: String(n.id), targetType: n.subject?.type ?? "", targetUrl: n.subject?.url ?? "",
      body: n.subject?.title ?? "", state: n.unread ? "pending" : "done",
      author: { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "github" },
      createdAt: n.updated_at ?? "",
    })));
  }
  async markDone(todoId: string): Promise<void> { await this.http.request("PATCH", `/notifications/threads/${todoId}`, { body: "{}" }); }
  async markAllDone(): Promise<void> { await this.http.request("PUT", "/notifications", { body: "{}" }); }
}

export class GitHubTodoProvider implements ToolProvider {
  constructor(private readonly c: GitHubTodoCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_todos", description: "List notifications/todos", inputSchema: z.object({ state: z.string().optional(), type: z.string().optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (i) => JSON.stringify(await this.c.list(i as any)) },
    { action: "mark_todo_done", description: "Mark a notification as read", inputSchema: z.object({ todoId: z.string() }), execute: async (i) => { await this.c.markDone((i as any).todoId); return "{}"; } },
    { action: "mark_all_todos_done", description: "Mark all notifications as read", inputSchema: z.object({}), execute: async () => { await this.c.markAllDone(); return "{}"; } },
  ]; }
}

// ── Emoji Reactions ──
export class GitHubReactionCollection implements IReactionCollection {
  constructor(private readonly http: GitHubHttpClient) {}

  private async list(owner: string, repo: string, issueNumber: number, noteId?: string): Promise<PaginatedList<EmojiReaction>> {
    const path = noteId
      ? `/repos/${owner}/${repo}/issues/comments/${noteId}/reactions`
      : `/repos/${owner}/${repo}/issues/${issueNumber}/reactions`;
    const data = await this.http.request<any[]>("GET", `${path}?per_page=100`);
    return makeList(data.map((r: any) => ({ id: String(r.id), name: r.content, user: mapUser(r.user ?? {}), createdAt: r.created_at })));
  }

  async listMrReactions(repo: string, mrIid: number): Promise<PaginatedList<EmojiReaction>> { return this.list(repo.split("/")[0], repo.split("/")[1], mrIid); }
  async createMrReaction(repo: string, mrIid: number, name: string): Promise<EmojiReaction> {
    const [owner, repoName] = repo.split("/");
    const r = await this.http.request<any>("POST", `/repos/${owner}/${repoName}/issues/${mrIid}/reactions`, { body: JSON.stringify({ content: name }) });
    return { id: String(r.id), name: r.content, user: mapUser(r.user ?? {}), createdAt: r.created_at };
  }
  async deleteMrReaction(repo: string, _mrIid: number, reactionId: string): Promise<void> {
    const [owner, repoName] = repo.split("/");
    await this.http.request("DELETE", `/repos/${owner}/${repoName}/reactions/${reactionId}`);
  }
  async listMrNoteReactions(repo: string, mrIid: number, noteId: string): Promise<PaginatedList<EmojiReaction>> { return this.list(repo.split("/")[0], repo.split("/")[1], mrIid, noteId); }
  async createMrNoteReaction(repo: string, _mrIid: number, noteId: string, name: string): Promise<EmojiReaction> {
    const [owner, repoName] = repo.split("/");
    const r = await this.http.request<any>("POST", `/repos/${owner}/${repoName}/issues/comments/${noteId}/reactions`, { body: JSON.stringify({ content: name }) });
    return { id: String(r.id), name: r.content, user: mapUser(r.user ?? {}), createdAt: r.created_at };
  }
  async deleteMrNoteReaction(repo: string, _mrIid: number, _noteId: string, reactionId: string): Promise<void> {
    const [owner, repoName] = repo.split("/");
    await this.http.request("DELETE", `/repos/${owner}/${repoName}/reactions/${reactionId}`);
  }
  async listIssueReactions(repo: string, iid: number): Promise<PaginatedList<EmojiReaction>> { return this.list(repo.split("/")[0], repo.split("/")[1], iid); }
  async createIssueReaction(repo: string, iid: number, name: string): Promise<EmojiReaction> {
    const [owner, repoName] = repo.split("/");
    const r = await this.http.request<any>("POST", `/repos/${owner}/${repoName}/issues/${iid}/reactions`, { body: JSON.stringify({ content: name }) });
    return { id: String(r.id), name: r.content, user: mapUser(r.user ?? {}), createdAt: r.created_at };
  }
  async deleteIssueReaction(repo: string, _iid: number, reactionId: string): Promise<void> {
    const [owner, repoName] = repo.split("/");
    await this.http.request("DELETE", `/repos/${owner}/${repoName}/reactions/${reactionId}`);
  }
  async listIssueNoteReactions(repo: string, iid: number, noteId: string): Promise<PaginatedList<EmojiReaction>> { return this.list(repo.split("/")[0], repo.split("/")[1], iid, noteId); }
  async createIssueNoteReaction(repo: string, _iid: number, noteId: string, name: string): Promise<EmojiReaction> {
    const [owner, repoName] = repo.split("/");
    const r = await this.http.request<any>("POST", `/repos/${owner}/${repoName}/issues/comments/${noteId}/reactions`, { body: JSON.stringify({ content: name }) });
    return { id: String(r.id), name: r.content, user: mapUser(r.user ?? {}), createdAt: r.created_at };
  }
  async deleteIssueNoteReaction(repo: string, _iid: number, _noteId: string, reactionId: string): Promise<void> {
    const [owner, repoName] = repo.split("/");
    await this.http.request("DELETE", `/repos/${owner}/${repoName}/reactions/${reactionId}`);
  }
}

export class GitHubReactionProvider implements ToolProvider {
  constructor(private readonly c: GitHubReactionCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_pr_reactions", description: "List emoji reactions on a PR", inputSchema: z.object({ repository: z.string(), mrIid: z.number() }), execute: async (i) => JSON.stringify(await this.c.listMrReactions((i as any).repository, (i as any).mrIid)) },
    { action: "create_pr_reaction", description: "Add emoji reaction to a PR", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), name: z.string() }), execute: async (i) => JSON.stringify(await this.c.createMrReaction((i as any).repository, (i as any).mrIid, (i as any).name)) },
    { action: "delete_pr_reaction", description: "Remove emoji reaction from a PR", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), reactionId: z.string() }), execute: async (i) => { await this.c.deleteMrReaction((i as any).repository, (i as any).mrIid, (i as any).reactionId); return "{}"; } },
    { action: "list_pr_note_reactions", description: "List emoji reactions on a PR note", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), noteId: z.string() }), execute: async (i) => JSON.stringify(await this.c.listMrNoteReactions((i as any).repository, (i as any).mrIid, (i as any).noteId)) },
    { action: "create_pr_note_reaction", description: "Add emoji reaction to a PR note", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), noteId: z.string(), name: z.string() }), execute: async (i) => JSON.stringify(await this.c.createMrNoteReaction((i as any).repository, (i as any).mrIid, (i as any).noteId, (i as any).name)) },
    { action: "list_issue_reactions", description: "List emoji reactions on an issue", inputSchema: z.object({ repository: z.string(), issueIid: z.number() }), execute: async (i) => JSON.stringify(await this.c.listIssueReactions((i as any).repository, (i as any).issueIid)) },
    { action: "create_issue_reaction", description: "Add emoji reaction to an issue", inputSchema: z.object({ repository: z.string(), issueIid: z.number(), name: z.string() }), execute: async (i) => JSON.stringify(await this.c.createIssueReaction((i as any).repository, (i as any).issueIid, (i as any).name)) },
    { action: "delete_issue_reaction", description: "Remove emoji reaction from an issue", inputSchema: z.object({ repository: z.string(), issueIid: z.number(), reactionId: z.string() }), execute: async (i) => { await this.c.deleteIssueReaction((i as any).repository, (i as any).issueIid, (i as any).reactionId); return "{}"; } },
    { action: "list_issue_note_reactions", description: "List emoji reactions on an issue note", inputSchema: z.object({ repository: z.string(), issueIid: z.number(), noteId: z.string() }), execute: async (i) => JSON.stringify(await this.c.listIssueNoteReactions((i as any).repository, (i as any).issueIid, (i as any).noteId)) },
    { action: "create_issue_note_reaction", description: "Add emoji reaction to an issue note", inputSchema: z.object({ repository: z.string(), issueIid: z.number(), noteId: z.string(), name: z.string() }), execute: async (i) => JSON.stringify(await this.c.createIssueNoteReaction((i as any).repository, (i as any).issueIid, (i as any).noteId, (i as any).name)) },
  ]; }
}

// ── Draft Notes ──
export class GitHubDraftNoteCollection implements IDraftNoteCollection {
  constructor(private readonly http: GitHubHttpClient) {}
  // GitHub doesn't have a draft note concept; pending review comments serve similar purpose
  // We use pending review comments API
  async list(repo: string, mrIid: number): Promise<PaginatedList<DraftNote>> {
    const reviews = await this.http.request<any[]>("GET", `/repos/${repo}/pulls/${mrIid}/reviews`);
    const pending = reviews.filter(r => r.state === "PENDING");
    if (pending.length === 0) return makeList([]);
    const comments = await this.http.request<any[]>("GET", `/repos/${repo}/pulls/${mrIid}/reviews/${pending[0].id}/comments`);
    return makeList(comments.map((c: any) => ({ id: String(c.id), body: c.body, author: mapUser(c.user ?? {}), createdAt: c.created_at })));
  }
  async get(repo: string, mrIid: number, draftId: string): Promise<DraftNote> {
    const all = await this.list(repo, mrIid);
    const found = all.items.find(d => d.id === draftId);
    if (!found) throw new Error(`Draft note ${draftId} not found`);
    return found;
  }
  async create(params: { repository: string; mrIid: number; body: string }): Promise<DraftNote> {
    // Create a pending review
    const review = await this.http.request<any>("POST", `/repos/${params.repository}/pulls/${params.mrIid}/reviews`, { body: JSON.stringify({ body: params.body, event: "COMMENT" }) });
    return { id: String(review.id), body: review.body, author: mapUser(review.user ?? {}), createdAt: review.submitted_at ?? new Date().toISOString() };
  }
  async update(repo: string, mrIid: number, draftId: string, body: string): Promise<DraftNote> {
    await this.http.request("PATCH", `/repos/${repo}/pulls/${mrIid}/reviews/${draftId}`, { body: JSON.stringify({ body }) });
    return { id: draftId, body, author: { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "github" }, createdAt: "" };
  }
  async delete(repo: string, mrIid: number, draftId: string): Promise<void> {
    await this.http.request("DELETE", `/repos/${repo}/pulls/${mrIid}/reviews/${draftId}`);
  }
  async publish(repo: string, mrIid: number, draftId: string): Promise<void> {
    await this.http.request("PUT", `/repos/${repo}/pulls/${mrIid}/reviews/${draftId}/events`, { body: JSON.stringify({ body: "", event: "COMMENT" }) });
  }
  async publishAll(repo: string, mrIid: number): Promise<void> {
    const drafts = await this.list(repo, mrIid);
    for (const d of drafts.items) { await this.publish(repo, mrIid, d.id); }
  }
}

export class GitHubDraftNoteProvider implements ToolProvider {
  constructor(private readonly c: GitHubDraftNoteCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_draft_notes", description: "List draft notes (pending reviews) on a PR", inputSchema: z.object({ repository: z.string(), mrIid: z.number() }), execute: async (i) => JSON.stringify(await this.c.list((i as any).repository, (i as any).mrIid)) },
    { action: "get_draft_note", description: "Get a draft note", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), draftId: z.string() }), execute: async (i) => JSON.stringify(await this.c.get((i as any).repository, (i as any).mrIid, (i as any).draftId)) },
    { action: "create_draft_note", description: "Create a draft note on a PR", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), body: z.string() }), execute: async (i) => JSON.stringify(await this.c.create(i as any)) },
    { action: "update_draft_note", description: "Update a draft note", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), draftId: z.string(), body: z.string() }), execute: async (i) => JSON.stringify(await this.c.update((i as any).repository, (i as any).mrIid, (i as any).draftId, (i as any).body)) },
    { action: "delete_draft_note", description: "Delete a draft note", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), draftId: z.string() }), execute: async (i) => { await this.c.delete((i as any).repository, (i as any).mrIid, (i as any).draftId); return "{}"; } },
    { action: "publish_draft_note", description: "Publish a draft note", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), draftId: z.string() }), execute: async (i) => { await this.c.publish((i as any).repository, (i as any).mrIid, (i as any).draftId); return "{}"; } },
    { action: "bulk_publish_draft_notes", description: "Publish all draft notes on a PR", inputSchema: z.object({ repository: z.string(), mrIid: z.number() }), execute: async (i) => { await this.c.publishAll((i as any).repository, (i as any).mrIid); return "{}"; } },
  ]; }
}

// ── MR Versions ──
export class GitHubMrVersionCollection implements IMrVersionCollection {
  constructor(private readonly http: GitHubHttpClient) {}
  async list(repo: string, mrIid: number): Promise<PaginatedList<MrVersion>> {
    const commits = await this.http.request<any[]>("GET", `/repos/${repo}/pulls/${mrIid}/commits?per_page=100`);
    // Each commit can be thought of as a "version"
    return makeList(commits.map((c: any, i: number) => ({ id: String(i + 1), headCommitSha: c.sha, baseCommitSha: (c.parents as any[])?.[0]?.sha ?? "", startCommitSha: c.sha, createdAt: (c.commit as any)?.author?.date ?? "" })));
  }
  async get(repo: string, mrIid: number, versionId: string): Promise<MrVersion> {
    const all = await this.list(repo, mrIid);
    const found = all.items.find(v => v.id === versionId);
    if (!found) throw new Error(`Version ${versionId} not found`);
    return found;
  }
}

export class GitHubMrVersionProvider implements ToolProvider {
  constructor(private readonly c: GitHubMrVersionCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_mr_versions", description: "List PR commit versions", inputSchema: z.object({ repository: z.string(), mrIid: z.number() }), execute: async (i) => JSON.stringify(await this.c.list((i as any).repository, (i as any).mrIid)) },
    { action: "get_mr_version", description: "Get a PR version", inputSchema: z.object({ repository: z.string(), mrIid: z.number(), versionId: z.string() }), execute: async (i) => JSON.stringify(await this.c.get((i as any).repository, (i as any).mrIid, (i as any).versionId)) },
  ]; }
}
