# 发布指南

## 发布到 npm

### 前置条件

```bash
npm login
# 输入 npm 用户名、密码、邮箱
```

### 发布所有包

```bash
pnpm publish:all
```

### 逐个发布

```bash
pnpm publish:core         # @git-mcp/core
pnpm publish:github       # @git-mcp/github
pnpm publish:gitlab       # @git-mcp/gitlab
pnpm publish:gitee        # @git-mcp/gitee
pnpm publish:gitcode      # @git-mcp/gitcode
pnpm publish:bundled      # @git-mcp/git-mcp (meta-package)
```

### 发布前检查

```bash
pnpm build                # 确保编译通过
pnpm test                 # 确保测试通过
pnpm publish:all          # 发布
```

## 版本管理

```bash
# 更新版本号
npm version patch         # 0.1.0 → 0.1.1
npm version minor         # 0.1.0 → 0.2.0
npm version major         # 0.1.0 → 1.0.0

# 或手动编辑各包的 package.json
```

## 发布后验证

```bash
# 测试安装
npm install -g @git-mcp/git-mcp

# 测试运行
GIT_MCP_CONFIG='{"platforms":[]}' git-mcp
```

## npm 包结构

```
@git-mcp/core                 # 核心框架
@git-mcp/github       # GitHub 适配器
@git-mcp/gitlab       # GitLab 适配器
@git-mcp/gitee        # Gitee 适配器
@git-mcp/gitcode      # GitCode 适配器
@git-mcp/git-mcp              # 捆绑包 (含所有适配器)
```

## 用户安装

```bash
# 安装捆绑包（推荐）
npm install -g @git-mcp/git-mcp

# 或只安装需要的适配器
npm install -g @git-mcp/core @git-mcp/github
```
