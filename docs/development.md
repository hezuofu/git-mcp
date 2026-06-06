# 开发指南

## 环境准备

```bash
# 安装 Node.js >= 18
# 安装 pnpm
npm install -g pnpm
```

## 克隆并安装

```bash
git clone https://github.com/hezuofu/git-mcp.git
cd git-mcp
pnpm install
pnpm build
```

## 项目结构

```
git-mcp/
├── packages/
│   ├── core/                  # @git-mcp/core — 框架
│   ├── adapter-github/        # GitHub 适配器
│   ├── adapter-gitlab/        # GitLab 适配器
│   ├── adapter-gitee/         # Gitee 适配器
│   ├── adapter-gitcode/       # GitCode 适配器
│   └── git-mcp/               # 打包发布用
├── docs/                      # 文档
├── package.json               # 根 workspace
├── tsconfig.base.json         # 共享 TS 配置
└── pnpm-workspace.yaml        # pnpm monorepo 配置
```

## 常用命令

```bash
pnpm build                # 编译所有包
pnpm test                 # 运行所有测试
pnpm dev                  # 编译并启动
tsx --test packages/core/test/*.test.ts     # 运行核心测试
tsx --test packages/github/test/*.test.ts  # 运行 GitHub 适配器测试
```

## 本地调试

```bash
# 设置测试配置
export GIT_MCP_CONFIG='{"platforms":[{"platform":"github","auth":{"type":"pat","token":"ghp_xxx"}}]}'

# 编译并启动
pnpm build && node packages/core/build/cli.js
```

## 添加新平台

### 1. 创建适配器包

```bash
mkdir -p packages/newplatform/src/models
```

### 2. 实现必要接口

最少需要实现 6 个文件：

| 文件 | 内容 |
|------|------|
| `newplatform-session.ts` | 认证头签名 |
| `newplatform-http-client.ts` | API 请求封装 |
| `newplatform-api-error.ts` | 错误映射 |
| `newplatform-platform.ts` | GitPlatform 实现 |
| `models/newplatform-repository.ts` | 仓库模型映射 |
| `models/newplatform-pull-request.ts` | PR 模型 |
| `models/newplatform-issue.ts` | Issue 模型 |
| `index.ts` | 导出 Platform 类 |

### 3. 注册到 CLI

编辑 `packages/core/src/cli.ts`，在 `loadAdapters` 中添加：

```typescript
{ name: "@git-mcp/newplatform",
  devPath: "../../adapter-newplatform/build/index.js",
  exportName: "NewPlatformPlatform" },
```

### 4. 添加包配置

```json
// packages/newplatform/package.json
{
  "name": "@git-mcp/newplatform",
  "dependencies": {
    "@git-mcp/core": "workspace:*",
    "node-fetch": "^3.3.2",
    "zod": "^3.24.2"
  }
}
```

## 测试

```bash
# 单元测试（每个包）
tsx --test packages/core/test/*.test.ts

# adapter-github 有完整的单元测试
tsx --test packages/github/test/github-adapter.test.ts
```

测试覆盖：
- Core: 类型系统、错误映射、连接池、Builder、PaginatedList、PlatformRegistry
- GitHub: Session 签名、错误转换、领域模型映射、74 工具验证

## 发布

```bash
# 发布所有包到 npm
pnpm publish:all

# 或逐个发布
pnpm publish:core
pnpm publish:github
pnpm publish:gitlab
pnpm publish:gitee
pnpm publish:gitcode
pnpm publish:bundled
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 语言 | TypeScript 5.x |
| 运行时 | Node.js >= 18 |
| 模块化 | ESM (Node16) |
| MCP SDK | @modelcontextprotocol/sdk ^1.24 |
| 校验 | Zod 3.x |
| HTTP | node-fetch 3.x |
| 代理 | http-proxy-agent + socks-proxy-agent |
| OAuth | pkce-challenge + open |
| 构建 | tsc |
| 测试 | Node test runner + tsx |
| 包管理 | pnpm workspaces |
