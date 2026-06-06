# Codex (OpenAI) Setup

Add to `.codex/config.json` or Codex MCP settings:

```json
{
  "mcpServers": {
    "git-mcp": {
      "command": "npx",
      "args": ["-y", "@git-mcp/git-mcp"],
      "env": {
        "GIT_MCP_CONFIG": "{\"platforms\":[{\"platform\":\"github\",\"auth\":{\"type\":\"pat\",\"token\":\"ghp_xxx\"}}]}"
      }
    }
  }
}
```

### Codex CLI

```bash
codex mcp add git-mcp -- npx -y @git-mcp/git-mcp
codex mcp env git-mcp GIT_MCP_CONFIG '{"platforms":[{"platform":"github","auth":{"type":"pat","token":"ghp_xxx"}}]}'
```
