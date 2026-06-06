import {
  PlatformApiError, NotFoundError, PermissionDeniedError,
  AuthenticationError, RateLimitExceededError, ConflictError, DomainError,
} from "@git-mcp/core";

export class GitLabApiError extends PlatformApiError {
  constructor(statusCode: number, body: any, private readonly headers?: Record<string, string>) {
    super(statusCode, body?.message ?? body?.error ?? "Unknown GitLab API error", body);
  }

  map(): DomainError {
    const msg = this.message;
    switch (this.statusCode) {
      case 401: return new AuthenticationError(msg, this);
      case 403: return new PermissionDeniedError(msg, this);
      case 404: return new NotFoundError(msg, this);
      case 409: return new ConflictError(msg, this);
      case 429: return new RateLimitExceededError(msg, this.headers?.["retry-after"] ?? "60", this);
      default: return new GenericDomainError(msg, this);
    }
  }
}

class GenericDomainError extends DomainError {
  readonly code = "INTERNAL_ERROR" as any;
  readonly statusCode: number;
  constructor(message: string, readonly cause?: PlatformApiError) {
    super(message, cause);
    this.statusCode = cause?.statusCode ?? 500;
  }
  get suggestion() { return "An unexpected error occurred."; }
}
