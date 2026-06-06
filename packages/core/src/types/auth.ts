import type { PlatformId, User } from "./platform.js";

export type AuthType = "pat" | "oauth" | "job_token" | "cookie";

export interface PatAuth       { type: "pat";        token: string; }
export interface OAuthAuth     { type: "oauth";      appId: string; appSecret?: string; scopes: string[]; callbackPort?: number; }
export interface JobTokenAuth  { type: "job_token";  token: string; }
export interface CookieAuth    { type: "cookie";     cookiePath: string; }

export type AuthEntry = PatAuth | OAuthAuth | JobTokenAuth | CookieAuth;

export interface AuthenticatedSession {
  readonly platform: PlatformId;
  readonly user: User | null;
  readonly createdAt: Date;
  readonly expiresAt: Date | null;
  readonly canRefresh: boolean;
  sign(headers: Record<string, string>): void;
  refresh(): Promise<AuthenticatedSession>;
}
