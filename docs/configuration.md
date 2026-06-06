# 配置参考

所有配置通过一个环境变量 `GIT_MCP_CONFIG` 完成。

## GIT_MCP_CONFIG

JSON 格式，顶层包含 `platforms` 数组：

```json
{
  "platforms": [
    {
      "platform": "github",
      "auth": { "type": "pat", "token": "ghp_xxxxxxxxxxxx" }
    },
    {
      "platform": "gitlab",
      "auth": { "type": "pat", "token": "glpat-xxxxxxxxxxxx" },
      "apiUrl": "https://gitlab.mycompany.com/api/v4"
    }
  ]
}
```

### PlatformEntry 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `platform` | string | ✅ | 平台标识: `github` / `gitlab` / `gitee` / `gitcode` |
| `auth` | object | ✅ | 认证配置，根据 `type` 区分 |
| `apiUrl` | string | | 自定义 API 地址（自托管实例） |

### Auth 类型

#### PAT（Personal Access Token）

最常用方式，所有平台支持：

```json
{ "type": "pat", "token": "ghp_xxx" }
```

#### OAuth2 PKCE

GitLab / GitHub OAuth 方式：

```json
{
  "type": "oauth",
  "appId": "your-app-id",
  "appSecret": "your-app-secret",
  "scopes": ["api", "read_user"],
  "callbackPort": 35217
}
```

首次启动时会打开浏览器完成授权，token 自动保存。

#### Job Token（仅 GitLab CI）

```json
{ "type": "job_token", "token": "$CI_JOB_TOKEN" }
```

## 可通过配置文件

设置 `GIT_MCP_CONFIG_PATH` 指向 JSON 文件：

```bash
export GIT_MCP_CONFIG_PATH=/etc/git-mcp/config.json
```

## 其他环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `GIT_MCP_TRANSPORT` | `stdio` | 传输模式: `stdio` / `sse` / `streamable-http` |
| `GIT_MCP_HOST` | `127.0.0.1` | HTTP 服务器地址（非 stdio 模式） |
| `GIT_MCP_PORT` | `3002` | HTTP 服务器端口 |
| `HTTP_PROXY` / `HTTPS_PROXY` | — | 代理设置 |
| `NO_PROXY` | — | 绕过代理的地址 |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `1` | 设置为 `0` 跳过 TLS 验证 |

## 完整配置示例

```bash
export GIT_MCP_CONFIG='{
  "platforms": [
    {
      "platform": "github",
      "auth": { "type": "pat", "token": "ghp_xxxxxxxxxxxx" }
    },
    {
      "platform": "gitlab",
      "auth": { "type": "pat", "token": "glpat-xxxxxxxxxxxx" },
      "apiUrl": "https://gitlab.internal.example.com/api/v4"
    },
    {
      "platform": "gitee",
      "auth": { "type": "pat", "token": "gitee_pat_xxx" }
    },
    {
      "platform": "gitcode",
      "auth": { "type": "oauth", "appId": "...", "appSecret": "...", "scopes": ["projects", "pull_requests"] }
    }
  ]
}'

export HTTP_PROXY="http://proxy.corp.com:8080"
export NO_PROXY=".internal.example.com,localhost"
```
