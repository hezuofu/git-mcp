# AI 工具配置指南

选择你的 AI 工具：

| 工具 | 配置位置 | 格式 |
|------|---------|------|
| [Claude Code](claude-code.md) | `~/.claude/settings.json` | MCP servers JSON |
| [Cursor](cursor.md) | `.cursor/mcp.json` | MCP servers JSON |
| [Codex](codex.md) | Codex MCP settings | MCP servers JSON |
| [GitHub Copilot](copilot.md) | VS Code `settings.json` | `github.copilot.mcp` |
| [Cline / Roo Code](cline-roocode.md) | VS Code MCP Server panel | GUI / JSON |
| [Hermen Agent](hermen-agent.md) | MCP config | MCP servers JSON |

## 通用配置模板

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

## 本地开发配置

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
