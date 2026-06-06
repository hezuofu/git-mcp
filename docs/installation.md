# 安装指南

## 系统要求

- Node.js >= 18.0.0
- npm >= 9.0.0（或 pnpm >= 8.0.0）

## 方式一：npm 全局安装（推荐）

```bash
npm install -g @git-mcp/git-mcp
```

安装后可直接运行：

```bash
git-mcp
```

## 方式二：npx 零安装

无需安装，每次启动时自动下载：

```bash
npx -y @git-mcp/git-mcp
```

此方式适合 AI 工具配置中使用。

## 方式三：一键安装脚本

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/hezuofu/git-mcp/main/install.ps1 | iex
```

带参数：

```powershell
$env:GITHUB_TOKEN="ghp_xxx"
$env:GITLAB_TOKEN="glpat_xxx"
irm https://raw.githubusercontent.com/hezuofu/git-mcp/main/install.ps1 | iex
```

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/hezuofu/git-mcp/main/install.sh | bash -s -- \
  --github-token ghp_xxxxxxxxxxxx \
  --gitlab-token glpat-xxxxxxxxxxxx
```

## 方式四：本地开发安装

```bash
git clone https://github.com/hezuofu/git-mcp.git
cd git-mcp
pnpm install
pnpm build
node packages/core/build/cli.js
```

## 验证安装

```bash
GIT_MCP_CONFIG='{"platforms":[]}' npx @git-mcp/git-mcp
```

预期输出：
```
Loaded adapter: @git-mcp/adapter-github
Loaded adapter: @git-mcp/adapter-gitlab
Loaded adapter: @git-mcp/adapter-gitee
Loaded adapter: @git-mcp/adapter-gitcode
Active platforms: (none, but adapters loaded)
```
