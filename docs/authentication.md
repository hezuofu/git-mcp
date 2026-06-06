# 认证详解

## 认证方式对比

| 方式 | GitHub | GitLab | Gitee | GitCode | 说明 |
|------|:--:|:--:|:--:|:--:|------|
| PAT | ✅ | ✅ | ✅ | ✅ | 最简单，适合个人使用 |
| OAuth2 | ✅ | ✅ | — | — | 浏览器授权，更安全 |
| Job Token | — | ✅ | — | — | CI/CD 中使用 |

## PAT 认证

### 获取 Token

**GitHub:**
1. 访问 https://github.com/settings/tokens
2. Fine-grained tokens → Generate new token
3. Repository access: 选择需要的仓库
4. Permissions: Contents (Read/Write), Issues (Read/Write), Pull requests (Read/Write)

**GitLab:**
1. 访问 https://gitlab.com/-/user_settings/personal_access_tokens
2. Token name: 任意命名
3. Scopes: 勾选 `api`（全部）或 `read_api` + `write_repository`
4. Create personal access token

**Gitee:**
1. 访问 https://gitee.com/profile/personal_access_tokens
2. 生成新令牌
3. 权限: projects, pull_requests, issues

**GitCode:**
1. 访问 https://gitcode.com/-/profile/personal_access_tokens
2. 生成新令牌

### 配置

```json
{
  "platforms": [
    {
      "platform": "github",
      "auth": { "type": "pat", "token": "ghp_xxxxxxxxxxxx" }
    }
  ]
}
```

## OAuth2 PKCE 认证

适用于：GitHub OAuth App / GitLab Application

### 创建应用

**GitHub:**
1. Settings → Developer settings → OAuth Apps → New OAuth App
2. Authorization callback URL: `http://127.0.0.1:{port}/callback`
3. 记录 Client ID 和 Client Secret

**GitLab:**
1. Settings → Applications → Add new application
2. Redirect URI: `http://127.0.0.1:{port}/callback`
3. Scopes: `api`, `read_user`

### 配置

```json
{
  "platforms": [
    {
      "platform": "gitlab",
      "auth": {
        "type": "oauth",
        "appId": "your-app-id",
        "appSecret": "your-app-secret",
        "scopes": ["api"],
        "callbackPort": 35217
      }
    }
  ]
}
```

### 流程

```
1. 服务器启动
2. 自动打开浏览器 → GitLab/GitHub 授权页
3. 用户点击"授权"
4. 浏览器重定向到 http://127.0.0.1:35217/callback?code=xxx
5. 本地服务器接收 code → 用 PKCE verifier 换 token
6. Token 存入内存 → MCP server 就绪
```

## 自托管实例

```json
{
  "platforms": [
    {
      "platform": "gitlab",
      "auth": { "type": "pat", "token": "glpat-xxx" },
      "apiUrl": "https://gitlab.internal.example.com/api/v4"
    },
    {
      "platform": "github",
      "auth": { "type": "pat", "token": "ghp_xxx" },
      "apiUrl": "https://github.internal.example.com/api/v3"
    }
  ]
}
```

## 代理配置

```bash
export HTTP_PROXY="http://proxy.corp.com:8080"
export HTTPS_PROXY="http://proxy.corp.com:8080"
export NO_PROXY=".internal.example.com,localhost"
```

或跳过 TLS 验证（仅开发环境）：
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

## 安全建议

1. **PAT 优于密码** — 永远不在配置中写密码
2. **最小权限** — Token 只给必要的 scope
3. **OAuth 优于 PAT** — 令牌有过期时间，可刷新
4. **配置文件权限** — `chmod 600 ~/.git-mcp-config.json`
5. **不要在 git 中提交 token** — 使用环境变量或加密存储
