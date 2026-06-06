import type { Repository, BranchInfo } from "@git-mcp/core";

export class GitLabRepository {
  static fromApi(raw: Record<string, unknown>): Repository {
    return {
      id: String(raw.id), name: raw.name as string,
      fullPath: raw.path_with_namespace as string,
      description: (raw.description as string) ?? "",
      defaultBranch: raw.default_branch as string,
      visibility: (raw.visibility as string) === "private" ? "private"
        : (raw.visibility as string) === "internal" ? "internal" : "public",
      webUrl: raw.web_url as string,
      cloneUrl: (raw.http_url_to_repo as string) ?? (raw.ssh_url_to_repo as string),
      platform: "gitlab", rawData: raw,
    };
  }
}

export class GitLabBranch {
  static fromApi(raw: Record<string, unknown>): BranchInfo {
    return {
      name: raw.name as string,
      sha: (raw.commit as any)?.id as string ?? "",
      protected: (raw as any).protected === true,
    };
  }
}
