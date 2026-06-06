export interface FileContent {
  path: string;
  content: string;
  encoding: string;
  size: number;
  sha: string;
}

export interface CreateFileParams {
  path: string;
  content: string;
  branch: string;
  commitMessage: string;
  encoding?: string;
}

export interface FileUpdateResult {
  filePath: string;
  branch: string;
  commitSha: string;
}

export interface FileOperation {
  path: string;
  content: string;
}

export interface CommitResult {
  sha: string;
  branch: string;
  message: string;
}

export interface IFileCollection {
  getContents(repository: string, path: string, ref?: string): Promise<FileContent>;
  createOrUpdate(repository: string, params: CreateFileParams): Promise<FileUpdateResult>;
  pushFiles(repository: string, branch: string, files: FileOperation[], message: string): Promise<CommitResult>;
}
