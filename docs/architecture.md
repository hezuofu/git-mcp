# 架构设计

## 整体架构

```
┌──────────────────────────────────────────────────┐
│                 AI 客户端                         │
│  Claude Code | Cursor | Codex | Copilot | Cline  │
└──────────────────┬───────────────────────────────┘
                   │ MCP 协议 (stdio)
                   ▼
┌──────────────────────────────────────────────────┐         ┌──────────────────────┐
│              @git-mcp/core                       │         │  Adapter Packages     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │         │                      │
│  │Transport │  │  Auth    │  │ ToolRegistry  │  │  ◄───  │ @git-mcp/            │
│  │ stdio    │  │ Config   │  │               │  │         │   adapter-github     │
│  │ sse      │  │ Loader   │  │ ToolDescriptor│  │         │   adapter-gitlab     │
│  │ http     │  │ OAuth    │  │ ToolResult    │  │         │   adapter-gitee      │
│  └──────────┘  └──────────┘  └───────────────┘  │         │   adapter-gitcode    │
│                                                  │         └──────────────────────┘
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  HTTP    │  │  Domain  │  │   Errors      │  │
│  │  Client  │  │  Model   │  │   Mapper      │  │
│  │  Pool    │  │GitPlatform│  │ DomainError   │  │
│  │  Proxy   │  │ PR/Issue  │  │ PlatformAPIEr │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
└──────────────────────────────────────────────────┘
```

## 核心设计模式

### 1. 适配器模式 (Adapter Pattern)

```
              IGitPlatform (接口)
                    ↑
        ┌───────────┼───────────┬──────────┐
        │           │           │          │
   GitHubPlatform  GitLabPlatform  Gitee  GitCode
```

每个平台是一个独立的 npm 包，实现 `GitPlatform` 抽象类的所有方法。

### 2. 工厂模式 (Factory Method)

```typescript
abstract class GitPlatform {
  abstract createRepository(raw: unknown): Repository;
  abstract createPullRequest(raw: unknown): PullRequest;
  abstract createIssue(raw: unknown): Issue;
}
```

### 3. 策略模式 (Strategy)

```typescript
// Auth 类型驱动选策略
"auth": { "type": "pat" }    → PatAuthStrategy
"auth": { "type": "oauth" }  → OAuthPKCEStrategy
"auth": { "type": "job_token" } → JobTokenStrategy
```

### 4. Template Method

```typescript
abstract class GitPlatform {
  // 通用流程在基类
  async validateToken(token: string): Promise<User> {
    const session = this.createSession(token);
    return this._resolveUser(session);  // 子类实现
  }
  protected abstract _resolveUser(session: Session): Promise<User>;
}
```

### 5. 声明式工具注册

```typescript
// 工具定义属于领域对象，不属于服务器
class PullRequest {
  static readonly toolDescriptors: ToolDescriptor[] = [
    { action: "list_prs", schema: z.object({...}), execute: async () => {...} },
    { action: "get_pr",   schema: z.object({...}), execute: async () => {...} },
  ];
}
```

## 包结构

```
packages/
├── core/                      @git-mcp/core
│   ├── types/                 核心类型 (PlatformId, ErrorCode, AuthEntry)
│   ├── errors/                错误体系 (DomainError, ErrorMapper)
│   ├── domain/                领域模型 (GitPlatform, PullRequest, Issue...)
│   ├── tools/                 工具框架 (ToolDescriptor, ToolRegistry)
│   ├── auth/                  认证框架 (AuthStrategy, ConfigLoader, OAuth)
│   ├── pool/                  连接池 (ConnectionPool, Proxy)
│   ├── http/                  HTTP 客户端 (PlatformHttpClient)
│   └── transport/             MCP 传输 (stdio/SSE/HTTP)
│
├── adapter-github/            @git-mcp/adapter-github
│   ├── github-platform.ts     GitHubPlatform extends GitPlatform
│   ├── github-session.ts      Bearer Token 签名
│   ├── github-http-client.ts  Accept: vnd.github+json
│   ├── github-api-error.ts    404→NotFoundError 映射
│   └── models/                GitHubPullRequest, GitHubIssue...
│
├── adapter-gitlab/            @git-mcp/adapter-gitlab
├── adapter-gitee/             @git-mcp/adapter-gitee
├── adapter-gitcode/           @git-mcp/adapter-gitcode
└── git-mcp/                   @git-mcp/git-mcp (打包发布)
```

## 错误处理链

```
平台原始错误 (GitHub 404 / GitLab 500 / Gitee 403)
  │
  ▼ PlatformApiError.map()
  │  404 → NotFoundError(code, suggestion)
  │  401 → AuthenticationError
  │  429 → RateLimitExceededError(recoverable=true)
  │
  ▼ ErrorMapper.toToolResult()
  │  生成 AI 友好的结构化错误
  │  { error: { code, message, suggestion, recoverable } }
  │
  ▼ AI 客户端
    根据 recoverable/suggestion 决定是否重试
```

## 数据流

```
AI 输入: "查看 octocat/hello-world 的 PR #42"
  │
  ▼ MCP SDK 解析为 tool call
  │  name: "github_get_pr"
  │  args: { repository: "octocat/hello-world", iid: 42 }
  │
  ▼ ToolRegistry.execute("github_get_pr", args, ctx)
  │  → GitHubPlatform.pullRequests.get(args)
  │
  ▼ GitHubPrCollection.get()
  │  → GitHubHttpClient.request("GET", "/repos/octocat/hello-world/pulls/42")
  │     headers: { Authorization: "Bearer ghp_xxx", Accept: "application/vnd.github+json" }
  │     agent: ConnectionPool.getAgents("https://api.github.com").select(url)
  │
  ▼ GitHubPullRequest (领域对象)
  │  { id, iid, title, state, author, diffs(), merge(), notes() ... }
  │
  ▼ JSON → AI 客户端 → 自然语言
```
