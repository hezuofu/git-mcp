import type { AuthStrategy, ActivePlatform } from "./auth-strategy.js";
import type { AuthEntry } from "../types/auth.js";
import type { GitPlatform } from "../domain/git-platform.js";
import http from "node:http";
import net from "node:net";
import { randomBytes } from "node:crypto";
import got from "got";
import open from "open";
import pkceChallenge from "pkce-challenge";

export class OAuthPKCEStrategy implements AuthStrategy {
  readonly handlesType = "oauth";
  private readonly callbackPort: number;

  constructor(options?: { callbackPort?: number }) {
    this.callbackPort = options?.callbackPort ?? 0;
  }

  async authenticate(auth: AuthEntry, platform: GitPlatform): Promise<ActivePlatform["session"]> {
    const oauthAuth = auth as { type: "oauth"; appId: string; appSecret?: string; scopes: string[]; callbackPort?: number };

    const port = oauthAuth.callbackPort ?? this.callbackPort !== 0 ? this.callbackPort : await findFreePort();
    const redirectUri = `http://127.0.0.1:${port}/callback`;
    const state = randomBytes(16).toString("hex");
    const { code_verifier, code_challenge } = await pkceChallenge();

    const gitlabUrl = platform.defaultApiUrl.replace(/\/api\/v4$/, "").replace(/\/api\/v5$/, "");

    const authUrl = `${gitlabUrl}/oauth/authorize?` +
      `client_id=${encodeURIComponent(oauthAuth.appId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `state=${state}&` +
      `scope=${encodeURIComponent(oauthAuth.scopes.join(" "))}&` +
      `code_challenge=${code_challenge}&` +
      `code_challenge_method=S256`;

    const tokenData = await new Promise<{
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type: string;
    }>((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        const url = new URL(req.url ?? "", `http://127.0.0.1:${port}`);

        if (url.pathname === "/callback") {
          const code = url.searchParams.get("code");
          const returnedState = url.searchParams.get("state");

          if (!code || returnedState !== state) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end("<h1>Authentication failed</h1><p>Invalid state or missing code.</p>");
            server.close();
            reject(new Error("OAuth callback missing code or state mismatch"));
            return;
          }

          try {
            const tokenUrl = `${gitlabUrl}/oauth/token`;
            const data = await got.post(tokenUrl, {
              headers: { "Content-Type": "application/json" },
              json: {
                client_id: oauthAuth.appId,
                code,
                grant_type: "authorization_code",
                redirect_uri: redirectUri,
                code_verifier,
              },
            }).json<any>();

            if (data.error) {
              res.writeHead(500, { "Content-Type": "text/html" });
              res.end(`<h1>Authentication failed</h1><p>${data.error_description ?? data.error ?? "Unknown error"}</p>`);
              server.close();
              reject(new Error(`OAuth token exchange failed: ${data.error_description ?? data.error}`));
              return;
            }

            res.writeHead(200, { "Content-Type": "text/html" });
            res.end("<h1>Authentication successful!</h1><p>You can close this window.</p>");
            server.close();
            resolve(data);
          } catch (err) {
            res.writeHead(500, { "Content-Type": "text/html" });
            res.end("<h1>Authentication failed</h1>");
            server.close();
            reject(err);
          }
        } else if (url.pathname === "/") {
          res.writeHead(302, { Location: authUrl });
          res.end();
        }
      });

      server.listen(port, "127.0.0.1", () => {
        console.error(`\n[OAuth] Opening browser for authentication on ${platform.displayName}...`);
        console.error(`[OAuth] Authorization URL: ${authUrl}`);
        open(`http://127.0.0.1:${port}/`);
      });
    });

    const session = platform.createSession(tokenData.access_token);
    try {
      (session as any).user = await platform.validateToken(tokenData.access_token);
    } catch {
      // token works even without user resolution
    }
    (session as any).canRefresh = !!tokenData.refresh_token;
    (session as any)._oauthData = tokenData;
    (session as any)._oauthStrategy = this;

    return session as unknown as ActivePlatform["session"];
  }

  async refreshToken(platform: GitPlatform, refreshToken: string): Promise<{
    access_token: string; refresh_token?: string; expires_in?: number;
  }> {
    const gitlabUrl = platform.defaultApiUrl.replace(/\/api\/v4$/, "");
    const data = await got.post(`${gitlabUrl}/oauth/token`, {
      headers: { "Content-Type": "application/json" },
      json: { grant_type: "refresh_token", refresh_token: refreshToken },
    }).json<any>();
    if (data.error) throw new Error(`Token refresh failed: ${data.error}`);
    return data;
  }
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as net.AddressInfo;
      server.close(() => resolve(addr.port));
    });
  });
}
