import type { PlatformId, User } from "../types/platform.js";
import type { AuthenticatedSession } from "../types/auth.js";
import type { IRepositoryCollection } from "./repository.js";
import type { IPrMrCollection } from "./pull-request.js";
import type { IIssueCollection } from "./issue.js";
import type { IFileCollection } from "./file.js";
import type { IBranchCollection } from "./branch.js";
import type { ILabelCollection } from "./label.js";
import type { ITagCollection } from "./tag.js";
import type { IReleaseCollection } from "./release.js";
import type { ICommitCollection } from "./commit.js";
import type { ISearchCollection } from "./search.js";
import type { IPipelineCollection } from "./pipeline.js";
import type { IIssueLinkCollection } from "./issue-link.js";
import type { ITodoCollection } from "./todo.js";
import type { IDraftNoteCollection } from "./draft-note.js";
import type { IReactionCollection } from "./reaction.js";
import type { IMrVersionCollection } from "./mr-version.js";
import type { ConnectionPool } from "../pool/connection-pool.js";

export abstract class GitPlatform {
  abstract readonly id: PlatformId;
  abstract readonly displayName: string;
  abstract readonly defaultApiUrl: string;

  abstract get repositories(): IRepositoryCollection;
  abstract get pullRequests(): IPrMrCollection;
  abstract get issues(): IIssueCollection;
  abstract get files(): IFileCollection;
  abstract get branches(): IBranchCollection;
  abstract get labels(): ILabelCollection;
  abstract get tags(): ITagCollection;
  abstract get releases(): IReleaseCollection;
  abstract get commits(): ICommitCollection;
  abstract get search(): ISearchCollection;
  abstract get pipelines(): IPipelineCollection;
  abstract get issueLinks(): IIssueLinkCollection;
  abstract get todos(): ITodoCollection;
  abstract get draftNotes(): IDraftNoteCollection;
  abstract get reactions(): IReactionCollection;
  abstract get mrVersions(): IMrVersionCollection;

  abstract get terminology(): { pr: string };

  abstract createSession(token: string, apiUrl?: string): AuthenticatedSession;
  abstract createHttpClient(session: AuthenticatedSession, pool: ConnectionPool, apiUrl?: string): unknown;

  abstract buildApiError(statusCode: number, body: unknown, headers?: Record<string, string>): Error;

  async validateToken(token: string, apiUrl?: string): Promise<User> {
    const session = this.createSession(token, apiUrl);
    return this._resolveUser(session);
  }

  protected abstract _resolveUser(session: AuthenticatedSession): Promise<User>;

  getToolPrefix(): string {
    return this.id;
  }
}

export class PlatformRegistry {
  private readonly platforms = new Map<string, GitPlatform>();

  register(platform: GitPlatform): void {
    if (this.platforms.has(platform.id)) {
      throw new Error(`Platform "${platform.id}" is already registered`);
    }
    this.platforms.set(platform.id, platform);
  }

  get(id: string): GitPlatform | undefined {
    return this.platforms.get(id);
  }

  list(): GitPlatform[] {
    return [...this.platforms.values()];
  }
}
