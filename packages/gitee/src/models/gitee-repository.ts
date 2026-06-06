import type { Repository, BranchInfo } from "@git-mcp/core";

export class GiteeRepository {
  static fromApi(raw: Record<string, unknown>): Repository {
    return {
      id: String(raw.id), name: raw.name as string, fullPath: raw.full_name as string,
      description: (raw.description as string) ?? "", defaultBranch: raw.default_branch as string,
      visibility: (raw as any).private ? "private" : "public",
      webUrl: raw.html_url as string, cloneUrl: raw.ssh_url as string ?? (raw.clone_url as string),
      platform: "gitee", rawData: raw,
    };
  }
}

export class GiteeBranch {
  static fromApi(raw: Record<string, unknown>): BranchInfo {
    return { name: raw.name as string, sha: (raw.commit as any)?.sha as string ?? "", protected: (raw as any).protected === true };
  }
}
