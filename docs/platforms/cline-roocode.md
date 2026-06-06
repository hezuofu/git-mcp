# Cline / Roo Code Setup

Add to MCP settings:

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

### Cline (VS Code Extension)

1. Open Cline extension
2. Click MCP Servers → Add Server
3. Name: `git-mcp`
4. Command: `npx -y @git-mcp/git-mcp`
5. Add environment variable: `GIT_MCP_CONFIG` with your config JSON

### Roo Code

Same as Cline — use the MCP Servers panel in VS Code.
