# git-mcp

Multi-platform Git MCP server — one server for **GitHub**, **GitLab**, **Gitee**, and **GitCode**.

| Platform | Status | Tools |
|----------|--------|-------|
| GitHub | ✅ | 74 tools (including Actions CI) |
| GitLab | ✅ | 60 tools (including Pipeline CI) |
| Gitee | ✅ | 36 tools |
| GitCode | ✅ | 36 tools |

Supports: Claude Code · Cursor · Codex · Copilot · Cline · Roo Code · Hermen Agent

---

## Quick Install

### npm (recommended)

```bash
npm install -g @git-mcp/git-mcp
```

### One-liner (Linux/macOS)

```bash
curl -fsSL https://raw.githubusercontent.com/hezuofu/git-mcp/main/install.sh | bash -s -- \
  --github-token ghp_xxxxxxxxxxxx \
  --gitlab-token glpat-xxxxxxxxxxxx
```

### One-liner (Windows PowerShell)

```powershell
irm https://raw.githubusercontent.com/hezuofu/git-mcp/main/install.ps1 | iex
```

---

## Setup for AI Tools

### Claude Code

`~/.claude/settings.json`:

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

### Cursor

`.cursor/mcp.json` — same format as above.

### Codex / Copilot / Cline / Roo Code / Hermen Agent

See [docs/setup/](docs/setup/) for platform-specific guides.

---

## Configuration

Single environment variable `GIT_MCP_CONFIG`:

```json
{
  "platforms": [
    { "platform": "github",  "auth": { "type": "pat", "token": "ghp_xxx" } },
    { "platform": "gitlab",  "auth": { "type": "pat", "token": "glpat_xxx" }, "apiUrl": "https://gitlab.mycompany.com/api/v4" },
    { "platform": "gitee",   "auth": { "type": "pat", "token": "xxx" } },
    { "platform": "gitcode", "auth": { "type": "pat", "token": "xxx" } }
  ]
}
```

Or set `GIT_MCP_CONFIG_PATH` to point to a JSON file.

### Auth types

| Type | Description |
|------|-------------|
| `pat` | Personal Access Token (all platforms) |
| `oauth` | OAuth2 PKCE flow (GitLab, GitHub) |
| `job_token` | CI Job Token (GitLab) |

---

## Token Setup

- **GitHub**: [Settings → Developer settings → Personal access tokens → Fine-grained tokens](https://github.com/settings/tokens)
- **GitLab**: [Settings → Access Tokens → Create personal access token](https://gitlab.com/-/user_settings/personal_access_tokens) (scope: `api`)
- **Gitee**: [Settings → 私人令牌](https://gitee.com/profile/personal_access_tokens)
- **GitCode**: [Settings → 访问令牌](https://gitcode.com/-/profile/personal_access_tokens)

---

## Available Tools

| Category | Tools |
|----------|-------|
| Repository | search, get, create, fork |
| Pull Request / MR | list, get, create, update, merge, diffs, notes, drafts, reactions, versions |
| Issue | list, get, create, update, notes, links, reactions |
| Branch | list, get, create, delete |
| Label | list, get, create, update, delete |
| Tag | list, get, create, delete |
| Release | list, get, create, update, delete |
| Commit | list, get, diff, blame, statuses |
| File | get, create/update, push |
| Pipeline / CI | GitLab CI (full), GitHub Actions (full) |
| Search | code search |
| Todo | list, mark done, mark all done |

Tool names are prefixed: `github_list_prs`, `gitlab_list_mrs`, `gitee_list_issues`, etc.

---

## Development

```bash
pnpm install
pnpm build
pnpm test
```

### Publish to npm

```bash
pnpm publish:all
```

This publishes `@git-mcp/core`, all adapters, and the bundled `@git-mcp/git-mcp` package.

---

## License

MIT
