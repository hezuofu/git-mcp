import {
  PlatformApiError, NotFoundError, PermissionDeniedError,
  AuthenticationError, RateLimitExceededError,
  ValidationError, ConflictError, DomainError,
} from "@git-mcp/core";

export class GitHubApiError extends PlatformApiError {
  constructor(statusCode: number, body: any) {
    super(statusCode, body?.message ?? "Unknown GitHub API error", body);
  }

  map(): DomainError {
    const msg = this.message;
    switch (this.statusCode) {
      case 401: return new AuthenticationError(msg, this);
      case 403:
        if (msg.toLowerCase().includes("rate limit")) {
          return new RateLimitExceededError(msg, String(Math.floor(Date.now() / 1000) + 3600), this);
        }
        return new PermissionDeniedError(msg, this);
      case 404: return new NotFoundError(msg, this);
      case 409: return new ConflictError(msg, this);
      case 422: return new ValidationError(
        JSON.stringify((this.body as any)?.errors ?? msg), this
      );
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
  get suggestion(): string {
    return "An unexpected error occurred. Check the error details and try again.";
  }
}
