# 常见问题

## 启动报错 "No platforms could be activated"

检查配置：
1. `GIT_MCP_CONFIG` JSON 格式是否正确
2. Token 是否有效
3. 平台名是否拼写正确 (`github` 不是 `GitHub`)

## Token 权限不足

```
Error: 403 Forbidden — PERMISSION_DENIED
```

确保 Token 有足够权限：
- GitHub: 勾选 `Contents`、`Issues`、`Pull requests`
- GitLab: 勾选 `api` scope
- Gitee: 勾选 `projects`、`pull_requests`

## 自签名证书

```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

## 代理问题

```bash
export HTTP_PROXY="http://proxy:8080"
export NO_PROXY=".internal.com,localhost"
```

## 如何只用 GitHub？

```json
{
  "platforms": [
    {"platform":"github","auth":{"type":"pat","token":"ghp_xxx"}}
  ]
}
```

未配 Token 的平台自动跳过。

## 支持哪些 AI 工具？

| 工具 | 配置格式 | 文档 |
|------|---------|------|
| Claude Code | `.claude/settings.json` | [claude-code.md](setup/claude-code.md) |
| Cursor | `.cursor/mcp.json` | [cursor.md](setup/cursor.md) |
| Codex | MCP settings | [codex.md](setup/codex.md) |
| GitHub Copilot | VS Code `settings.json` | [copilot.md](setup/copilot.md) |
| Cline | VS Code MCP panel | [cline-roocode.md](setup/cline-roocode.md) |
| Roo Code | VS Code MCP panel | [cline-roocode.md](setup/cline-roocode.md) |
| Hermen Agent | MCP config | [hermen-agent.md](setup/hermen-agent.md) |

## 能否同时连接多个平台？

可以。在 `platforms` 数组中添加多个条目：

```json
{
  "platforms": [
    {"platform":"github","auth":{"type":"pat","token":"ghp_xxx"}},
    {"platform":"gitlab","auth":{"type":"pat","token":"glpat_xxx"}},
    {"platform":"gitee","auth":{"type":"pat","token":"xxx"}}
  ]
}
```

每个平台工具加前缀区分：`github_list_prs`、`gitlab_list_mrs` 等。

## GitCode 和 Gitee 有什么区别？

| | GitCode | Gitee |
|--|---------|-------|
| 运营方 | CSDN | 开源中国 |
| API 版本 | v5 | v5 |
| 支持功能 | 36 工具 | 36 工具 |
| 特色 | 企业/组织 API | Star/Watch API |

## 如何添加新的 Git 平台？

参考 [开发指南](development.md) 中的"添加新平台"章节。

## 如何贡献代码？

1. Fork 项目
2. 创建分支
3. 提交 PR
4. 确保测试通过
