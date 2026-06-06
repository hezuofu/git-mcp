# Git MCP Skills

预设的 AI skill 文件，告诉 AI 如何使用 git-mcp 工具。

## 安装

### Claude Code

复制到项目的 `.claude/skills/` 目录：

```bash
mkdir -p .claude/skills/
cp skills/*.md .claude/skills/
```

### Cursor

Cursor 使用 `.cursorrules` 文件，加入：

```
Use git-mcp MCP tools for Git operations. Available tool prefixes:
github_*, gitlab_*, gitee_*, gitcode_*
```

### Codex / Copilot

将 skills 作为项目指令引用。

### 方式二：项目级引用

在 CLAUDE.md 或 AGENTS.md 中添加：

```markdown
## Git Operations

When working with Git repositories, use the git-mcp MCP tools:
- @skills/git-mcp.md for general Git operations
- @skills/code-review.md for code review workflows
- @skills/ci-cd.md for CI/CD management
```

## Skill 列表

| Skill | 用途 |
|-------|------|
| [git-mcp.md](git-mcp.md) | 通用 Git 操作 (PR/Issue/Repo/File) |
| [code-review.md](code-review.md) | 代码审查流程 |
| [ci-cd.md](ci-cd.md) | CI/CD 管理 |
| [release.md](release.md) | 发布管理 |
| [project-setup.md](project-setup.md) | 新项目初始化 |
