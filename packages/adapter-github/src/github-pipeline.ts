import type { IPipelineCollection, PaginatedList } from "@git-mcp/core";

export class GitHubPipelineCollection implements IPipelineCollection {
  private e() { throw new Error("GitHub does not have a native pipeline API. Use GitHub Actions via the REST API directly."); }

  async list(): Promise<PaginatedList<any>> { this.e(); return [] as any; }
  async get(): Promise<any> { this.e(); return {}; }
  async getJobs(): Promise<any[]> { this.e(); return []; }
  async getJobOutput(): Promise<string> { this.e(); return ""; }
  async create(): Promise<any> { this.e(); return {}; }
  async retry(): Promise<any> { this.e(); return {}; }
  async cancel(): Promise<any> { this.e(); return {}; }
  async playJob(): Promise<any> { this.e(); return {}; }
  async retryJob(): Promise<any> { this.e(); return {}; }
  async cancelJob(): Promise<any> { this.e(); return {}; }
  async listJobArtifacts(): Promise<any[]> { this.e(); return []; }
  async listMrPipelines(): Promise<any[]> { this.e(); return []; }
}
