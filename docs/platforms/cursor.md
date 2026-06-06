# Cursor Setup

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "git-mcp": {
      "command": "npx",
      "args": ["-y", "@git-mcp/git-mcp"],
      "env": {
        "GIT_MCP_CONFIG": "{\"platforms\":[{\"platform\":\"github\",\"auth\":{\"type\":\"pat\",\"token\":\"ghp_xxx\"}},{\"platform\":\"gitlab\",\"auth\":{\"type\":\"pat\",\"token\":\"glpat_xxx\"}}]}"
      }
    }
  }
}
```

### Token 获取

- GitHub: Settings → Developer settings → Personal access tokens → Fine-grained tokens
- GitLab: Settings → Access Tokens → Create personal access token (scope: `api`)
- Gitee: Settings → 私人令牌
- GitCode: Settings → 访问令牌
