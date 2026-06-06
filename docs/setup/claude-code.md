# Claude Code Setup

Add to `.claude/settings.json` or `~/.claude.json`:

```json
{
  "mcpServers": {
    "git-mcp": {
      "command": "npx",
      "args": ["-y", "@git-mcp/git-mcp"],
      "env": {
        "GIT_MCP_CONFIG": "{\"platforms\":[{\"platform\":\"github\",\"auth\":{\"type\":\"pat\",\"token\":\"ghp_xxxxxxxxxxxx\"}},{\"platform\":\"gitlab\",\"auth\":{\"type\":\"pat\",\"token\":\"glpat-xxxxxxxxxxxx\"}}]}"
      }
    }
  }
}
```

Or use a config file:

```json
{
  "mcpServers": {
    "git-mcp": {
      "command": "npx",
      "args": ["-y", "@git-mcp/git-mcp"],
      "env": {
        "GIT_MCP_CONFIG_PATH": "/path/to/git-mcp-config.json"
      }
    }
  }
}
```

### Local development:

```json
{
  "mcpServers": {
    "git-mcp": {
      "command": "node",
      "args": ["E:\\ai-work\\git-mcp\\packages\\core\\build\\cli.js"],
      "env": {
        "GIT_MCP_CONFIG": "{\"platforms\":[{\"platform\":\"github\",\"auth\":{\"type\":\"pat\",\"token\":\"ghp_xxx\"}}]}"
      }
    }
  }
}
```
