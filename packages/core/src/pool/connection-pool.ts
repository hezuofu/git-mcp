import { Agent as HttpAgent } from "node:http";
import { Agent as HttpsAgent } from "node:https";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import { readFileSync } from "node:fs";
import { shouldBypassProxy } from "./proxy-bypass.js";

export interface PoolOptions {
  httpProxy?: string;
  httpsProxy?: string;
  noProxy?: string;
  rejectUnauthorized?: boolean;
  caCertPath?: string;
  poolMaxSize?: number;
}

export interface AgentPair {
  http: HttpAgent;
  https: HttpsAgent;
  select(url: string): HttpAgent | HttpsAgent;
}

export class ConnectionPool {
  private readonly agents = new Map<string, AgentPair>();
  private readonly options: PoolOptions;

  constructor(options: PoolOptions) {
    this.options = options;
  }

  getAgents(baseUrl: string): AgentPair {
    const key = this.normalizeUrl(baseUrl);
    if (!this.agents.has(key)) {
      this.enforceSizeLimit();
      this.agents.set(key, this.createAgents(baseUrl));
    }
    return this.agents.get(key)!;
  }

  closeAll(): void {
    for (const pair of this.agents.values()) {
      (pair.http as unknown as { destroy?: () => void }).destroy?.();
      (pair.https as unknown as { destroy?: () => void }).destroy?.();
    }
    this.agents.clear();
  }

  private normalizeUrl(url: string): string {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  }

  private enforceSizeLimit(): void {
    const max = this.options.poolMaxSize;
    if (max !== undefined && this.agents.size >= max) {
      throw new Error(
        `Connection pool is full (max ${max} instances). Try again later.`
      );
    }
  }

  private createAgents(baseUrl: string): AgentPair {
    const { httpProxy, httpsProxy, noProxy, rejectUnauthorized, caCertPath } = this.options;
    const bypass = shouldBypassProxy(baseUrl, noProxy);

    const sslOpts: { rejectUnauthorized?: boolean; ca?: Buffer } = {};
    if (rejectUnauthorized === false) {
      sslOpts.rejectUnauthorized = false;
    } else if (caCertPath) {
      sslOpts.ca = readFileSync(caCertPath);
    }

    let httpAgent: HttpAgent;
    if (httpProxy && !bypass) {
      httpAgent = httpProxy.startsWith("socks")
        ? new SocksProxyAgent(httpProxy) as unknown as HttpAgent
        : new HttpProxyAgent(httpProxy) as unknown as HttpAgent;
    } else {
      httpAgent = new HttpAgent({ keepAlive: true });
    }

    let httpsAgent: HttpsAgent;
    if (httpsProxy && !bypass) {
      httpsAgent = httpsProxy.startsWith("socks")
        ? new SocksProxyAgent(httpsProxy, sslOpts as any) as unknown as HttpsAgent
        : new HttpsProxyAgent(httpsProxy, { ...sslOpts }) as unknown as HttpsAgent;
    } else {
      httpsAgent = new HttpsAgent({ ...sslOpts, keepAlive: true });
    }

    const agents = this.agents;
    const normalizeUrl = this.normalizeUrl.bind(this);

    return {
      http: httpAgent,
      https: httpsAgent,
      select(url: string): HttpAgent | HttpsAgent {
        const protocol = new URL(url).protocol;
        if (protocol === "https:") {
          const pair = agents.get(normalizeUrl(url));
          return pair?.https ?? httpsAgent;
        }
        const pair = agents.get(normalizeUrl(url));
        return pair?.http ?? httpAgent;
      },
    };
  }
}
