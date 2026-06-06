# GitHub Copilot Setup

Add to VS Code `settings.json`:

```json
{
  "github.copilot.mcp.servers": {
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

### Copilot CLI

```bash
copilot mcp add git-mcp -- npx -y @git-mcp/git-mcp
```
