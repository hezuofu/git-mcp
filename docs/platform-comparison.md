# 平台功能对比

## API 对比

| 特性 | GitHub | GitLab | Gitee | GitCode |
|------|--------|--------|-------|---------|
| API 基础 URL | `api.github.com` | `gitlab.com/api/v4` | `gitee.com/api/v5` | `api.gitcode.com/api/v5` |
| 认证方式 | Bearer Token | Bearer / Private-Token | token | Bearer |
| API 风格 | REST + GraphQL | REST + GraphQL | REST | REST |
| 分页 | Link Header | x-next-page | 标准分页 | 标准分页 |
| 速率限制 | 5000/h | 2000/min(PAT) | 400/min | 400/min |

## 功能覆盖

| 功能 | GitHub | GitLab | Gitee | GitCode |
|------|:--:|:--:|:--:|:--:|
| 仓库 CRUD | ✅ | ✅ | ✅ | ✅ |
| PR/MR (list/get/create/merge) | ✅ | ✅ | ✅ | ✅ |
| PR/MR (drafts/versions/reactions) | ✅ | ✅ | ❌ | ❌ |
| Issue CRUD | ✅ | ✅ | ✅ | ✅ |
| Issue (links/reactions) | ✅ | ✅ | ❌ | ❌ |
| Branch CRUD | ✅ | ✅ | ✅ | ✅ |
| Label CRUD | ✅ | ✅ | ✅ | ✅ |
| Tag CRUD | ✅ | ✅ | ✅ | ✅(部分) |
| Release CRUD | ✅ | ✅ | ✅ | ✅ |
| Commit (list/get/diff/blame) | ✅ | ✅ | ✅(部分) | ✅(部分) |
| File (get/create/update) | ✅ | ✅ | ✅ | ✅ |
| Search | ✅ | ✅ | ✅ | ✅(仓库搜索) |
| Pipeline/CI | ✅ Actions | ✅ GitLab CI | ❌ | ❌ |
| Todo | ✅ Notifications | ✅ Todos | ❌ | ❌ |
| GraphQL | ❌(TODO) | ❌(TODO) | ❌ | ❌ |
| Wiki | ❌(TODO) | ❌(TODO) | ❌ | ❌ |

## 认证对比

| 方式 | GitHub | GitLab | Gitee | GitCode |
|------|:--:|:--:|:--:|:--:|
| PAT | ✅ | ✅ | ✅ | ✅ |
| OAuth2 PKCE | ✅ | ✅ | ❌ | ❌ |
| Job Token | ❌ | ✅ | ❌ | ❌ |
| Cookie | ❌ | ❌ | ❌ | ❌ |
| 自托管实例 | ✅ Enterprise | ✅ Self-managed | ❌ | ❌ |

## Token 权限要求

### GitHub Fine-grained Token

```
Repository permissions:
  Contents:       Read and write
  Issues:         Read and write
  Pull requests:  Read and write
  Metadata:       Read-only (自动)

Organization permissions:
  Members:        Read-only (如需查看成员)
```

### GitLab Personal Access Token

```
Scopes: api
  (包含 API 全部读写权限)
```

### Gitee 私人令牌

```
权限:
  projects         — 仓库操作
  pull_requests    — PR 操作
  issues           — Issue 操作
  user_info        — 用户信息
```

### GitCode 访问令牌

```
权限: 全部 (生成时自动)
```

## 限制与差异

| 差异 | 说明 |
|------|------|
| GitHub PR 无"草稿评论"API | 使用 Pending Review Comments 模拟 |
| GitHub 无 Issue 关联 API | 使用 Timeline API 交叉引用替代 |
| GitCode 无分支删除 API | 返回 UnsupportedOperationError |
| Gitee/GitCode 无 Emoji Reaction | 列表返回空，创建抛错 |
| Gitee/GitCode 无 Pipeline | 返回 UnsupportedOperationError |
