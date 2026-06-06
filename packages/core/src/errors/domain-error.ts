import { ErrorCode } from "../types/errors.js";
import type { PlatformApiError } from "./platform-api-error.js";

export abstract class DomainError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly statusCode: number;
  abstract get suggestion(): string;
  abstract readonly cause?: PlatformApiError;

  constructor(message: string, cause?: PlatformApiError) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code = ErrorCode.NOT_FOUND;
  readonly statusCode = 404;
  constructor(message: string, readonly cause?: PlatformApiError) { super(message, cause); }
  get suggestion(): string {
    return "Verify the resource ID/path exists and you have access to it. Check for typos in the repository path or resource identifier.";
  }
}

export class PermissionDeniedError extends DomainError {
  readonly code = ErrorCode.PERMISSION_DENIED;
  readonly statusCode = 403;
  constructor(message: string, readonly cause?: PlatformApiError) { super(message, cause); }
  get suggestion(): string {
    return "You do not have permission for this operation. Check your token scopes or request access from the repository owner.";
  }
}

export class AuthenticationError extends DomainError {
  readonly code = ErrorCode.AUTHENTICATION_FAILED;
  readonly statusCode = 401;
  constructor(message: string, readonly cause?: PlatformApiError) { super(message, cause); }
  get suggestion(): string {
    return "Authentication failed. Verify your token is valid and has not expired. For OAuth, try re-authenticating.";
  }
}

export class RateLimitExceededError extends DomainError {
  readonly code = ErrorCode.RATE_LIMIT_EXCEEDED;
  readonly statusCode = 429;
  constructor(message: string, readonly resetAt: string, readonly cause?: PlatformApiError) {
    super(message, cause);
  }
  get suggestion(): string {
    return `Rate limit exceeded. Retry after ${this.resetAt} or reduce request frequency. Consider using conditional requests or cached results.`;
  }
}

export class ValidationError extends DomainError {
  readonly code = ErrorCode.VALIDATION_FAILED;
  readonly statusCode = 422;
  constructor(message: string, readonly cause?: PlatformApiError) { super(message, cause); }
  get suggestion(): string {
    return "The provided parameters are invalid. Check the field values against the tool's schema and try again.";
  }
}

export class ConflictError extends DomainError {
  readonly code = ErrorCode.CONFLICT;
  readonly statusCode = 409;
  constructor(message: string, readonly cause?: PlatformApiError) { super(message, cause); }
  get suggestion(): string {
    return "A resource with the same identifier already exists. Choose a different name or resolve the conflict manually.";
  }
}

export class UnsupportedOperationError extends DomainError {
  readonly code = ErrorCode.UNSUPPORTED_OPERATION;
  readonly statusCode = 501;
  constructor(readonly operation: string, readonly platform: string, readonly cause?: PlatformApiError) {
    super(`${platform} does not support '${operation}'. Check platform capabilities before invoking this tool.`, cause);
  }
  get suggestion(): string {
    return `This platform does not support '${this.operation}'. Run the health_check tool to see which capabilities are available.`;
  }
}
