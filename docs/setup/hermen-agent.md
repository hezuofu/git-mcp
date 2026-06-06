# Hermen Agent Setup

Add to Hermen mcp configuration:

```json
{
  "mcp": {
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
