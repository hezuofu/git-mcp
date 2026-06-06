# 工具列表

> 总计 **~210** 个 MCP 工具，覆盖 5 个 Git 平台

## 命名规则

```
{platform}_{action}

示例:
  github_list_prs      — GitHub 上列出 PR
  gitlab_create_issue   — GitLab 上创建 Issue
  gitee_get_repo        — Gitee 上查看仓库
  gitcode_merge_pr      — GitCode 上合并 PR
```

---

## 仓库 Repository

| Action | 说明 | GitHub | GitLab | Gitee | GitCode |
|--------|------|:--:|:--:|:--:|:--:|
| `search_repos` | 搜索仓库 | ✅ | ✅ | ✅ | ✅ |
| `get_repo` | 查看仓库详情 | ✅ | ✅ | ✅ | ✅ |
| `create_repo` | 创建仓库 | ✅ | ✅ | ✅ | ✅ |
| `fork_repo` | Fork 仓库 | ✅ | ✅ | ✅ | ✅ |

## Pull Request / Merge Request

| Action | 说明 | GitHub | GitLab | Gitee | GitCode |
|--------|------|:--:|:--:|:--:|:--:|
| `list_prs` | 列出 PR/MR | ✅ | ✅ | ✅ | ✅ |
| `get_pr` | 查看 PR/MR | ✅ | ✅ | ✅ | ✅ |
| `create_pr` | 创建 PR/MR | ✅ | ✅ | ✅ | ✅ |
| `update_pr` | 更新 PR/MR | ✅ | ✅ | — | — |
| `merge_pr` | 合并 PR/MR | ✅ | ✅ | ✅ | ✅ |
| `get_pr_diffs` | 查看文件变更 | ✅ | ✅ | ✅ | ✅ |
| `list_pr_notes` | 查看评论 | ✅ | ✅ | ✅ | ✅ |
| `create_pr_note` | 添加评论 | ✅ | ✅ | — | — |
| `list_pr_reactions` | Emoji 反应列表 | ✅ | ✅ | — | — |
| `create_pr_reaction` | 添加 Emoji | ✅ | ✅ | — | — |
| `delete_pr_reaction` | 删除 Emoji | ✅ | ✅ | — | — |
| `list_pr_note_reactions` | 评论 Emoji | ✅ | ✅ | — | — |
| `list_draft_notes` | 草稿评论 | ✅ | ✅ | — | — |
| `create_draft_note` | 新建草稿 | ✅ | ✅ | — | — |
| `publish_draft_note` | 发布草稿 | ✅ | ✅ | — | — |
| `bulk_publish_draft_notes` | 批量发布 | ✅ | ✅ | — | — |
| `list_mr_versions` | MR 版本列表 | ✅ | ✅ | — | — |
| `get_mr_version` | 查看 MR 版本 | ✅ | ✅ | — | — |

## Issue

| Action | 说明 | GitHub | GitLab | Gitee | GitCode |
|--------|------|:--:|:--:|:--:|:--:|
| `list_issues` | 列出 Issues | ✅ | ✅ | ✅ | ✅ |
| `get_issue` | 查看 Issue | ✅ | ✅ | ✅ | ✅ |
| `create_issue` | 创建 Issue | ✅ | ✅ | ✅ | ✅ |
| `update_issue` | 更新 Issue | ✅ | ✅ | — | — |
| `list_issue_notes` | Issue 评论 | ✅ | ✅ | ✅ | ✅ |
| `create_issue_note` | 添加评论 | ✅ | ✅ | ✅ | ✅ |
| `list_issue_links` | 关联 Issue | — | ✅ | — | — |
| `create_issue_link` | 创建关联 | — | ✅ | — | — |
| `delete_issue_link` | 删除关联 | — | ✅ | — | — |
| `list_issue_reactions` | Emoji 列表 | ✅ | ✅ | — | — |
| `create_issue_reaction` | 添加 Emoji | ✅ | ✅ | — | — |
| `list_issue_note_reactions` | 评论 Emoji | ✅ | ✅ | — | — |
| `create_issue_note_reaction` | 添加评论 Emoji | ✅ | ✅ | — | — |

## 分支 Branch

| Action | 说明 | GitHub | GitLab | Gitee | GitCode |
|--------|------|:--:|:--:|:--:|:--:|
| `list_branches` | 列出分支 | ✅ | ✅ | ✅ | ✅ |
| `get_branch` | 查看分支 | ✅ | ✅ | ✅ | ✅ |
| `create_branch` | 创建分支 | ✅ | ✅ | ✅ | ✅ |
| `delete_branch` | 删除分支 | ✅ | ✅ | — | — |

## Label / Tag / Release

| Action | 说明 | GitHub | GitLab | Gitee | GitCode |
|--------|------|:--:|:--:|:--:|:--:|
| `list_labels` | 列出标签 | ✅ | ✅ | ✅ | ✅ |
| `get_label` | 查看标签 | ✅ | ✅ | ✅ | ✅ |
| `create_label` | 创建标签 | ✅ | ✅ | ✅ | ✅ |
| `update_label` | 更新标签 | ✅ | ✅ | ✅ | ✅ |
| `delete_label` | 删除标签 | ✅ | ✅ | ✅ | ✅ |
| `list_tags` | 列出 Tag | ✅ | ✅ | ✅ | ✅ |
| `get_tag` | 查看 Tag | ✅ | ✅ | ✅ | ✅ |
| `create_tag` | 创建 Tag | ✅ | ✅ | ✅ | ✅ |
| `delete_tag` | 删除 Tag | ✅ | ✅ | — | — |
| `list_releases` | 列出 Release | ✅ | ✅ | ✅ | ✅ |
| `get_release` | 查看 Release | ✅ | ✅ | ✅ | ✅ |
| `create_release` | 创建 Release | ✅ | ✅ | ✅ | ✅ |
| `update_release` | 更新 Release | ✅ | ✅ | ✅ | ✅ |
| `delete_release` | 删除 Release | ✅ | ✅ | ✅ | ✅ |

## 文件 File

| Action | 说明 | GitHub | GitLab | Gitee | GitCode |
|--------|------|:--:|:--:|:--:|:--:|
| `get_file_contents` | 读取文件 | ✅ | ✅ | ✅ | ✅ |
| `create_or_update_file` | 写文件 | ✅ | ✅ | ✅ | ✅ |

## 提交 Commit

| Action | 说明 | GitHub | GitLab | Gitee | GitCode |
|--------|------|:--:|:--:|:--:|:--:|
| `list_commits` | 列出 commit | ✅ | ✅ | ✅ | ✅ |
| `get_commit` | 查看 commit | ✅ | ✅ | ✅ | ✅ |
| `get_commit_diff` | Commit diff | ✅ | ✅ | ✅ | ✅ |
| `get_file_blame` | Git blame | ✅ | ✅ | — | — |
| `list_commit_statuses` | Commit 状态 | ✅ | ✅ | — | — |
| `create_commit_status` | 创建状态 | ✅ | ✅ | — | — |

## Pipeline / CI

| Action | 说明 | GitHub | GitLab | Gitee | GitCode |
|--------|------|:--:|:--:|:--:|:--:|
| `list_pipelines` | 列出 Pipeline | ✅(Actions) | ✅ | — | — |
| `get_pipeline` | 查看 Pipeline | ✅ | ✅ | — | — |
| `list_pipeline_jobs` | Jobs 列表 | ✅ | ✅ | — | — |
| `get_pipeline_job_output` | Job 日志 | ✅ | ✅ | — | — |
| `create_pipeline` | 触发 Pipeline | ✅ | ✅ | — | — |
| `retry_pipeline` | 重试 Pipeline | ✅ | ✅ | — | — |
| `cancel_pipeline` | 取消 Pipeline | ✅ | ✅ | — | — |
| `play_pipeline_job` | 执行手动 Job | ✅ | ✅ | — | — |
| `retry_pipeline_job` | 重试 Job | ✅ | ✅ | — | — |
| `cancel_pipeline_job` | 取消 Job | — | ✅ | — | — |
| `list_job_artifacts` | Artifacts | ✅ | ✅ | — | — |
| `list_mr_pipelines` | MR Pipeline | ✅ | ✅ | — | — |

## 其他

| Action | 说明 | GitHub | GitLab | Gitee | GitCode |
|--------|------|:--:|:--:|:--:|:--:|
| `search_code` | 搜索代码 | ✅ | ✅ | ✅ | ✅ |
| `list_todos` | 待办列表 | ✅ | ✅ | — | — |
| `mark_todo_done` | 完成待办 | ✅ | ✅ | — | — |
| `mark_all_todos_done` | 全部完成 | ✅ | ✅ | — | — |

---

## 统计

| 平台 | 工具数 |
|------|:--:|
| GitHub | 74 |
| GitLab | 60 |
| Gitee | 36 |
| GitCode | 36 |
| **合计** | **~206** |

> ✅ = 完整实现（调用真实 API）
> — = 平台不支持（返回 UnsupportedOperationError + AI 可理解的提示）
