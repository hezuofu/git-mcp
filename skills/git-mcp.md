# Git MCP Skill

When users ask you to perform Git operations across GitHub, GitLab, Gitee, or GitCode, use the git-mcp tools.

## Platform Detection

Determine the platform from context:
- `github.com` or mentions "GitHub" → use `github_*` tools
- `gitlab.com` or mentions "GitLab" or "MR" → use `gitlab_*` tools
- `gitee.com` or mentions "Gitee" → use `gitee_*` tools
- `gitcode.com` or mentions "GitCode" → use `gitcode_*` tools

## Common Workflows

### 查看项目
```
User: "查看 octocat/hello-world 项目"
→ github_get_repo({ path: "octocat/hello-world" })
```

### 列出并查看 PR/MR
```
User: "查看 hello-world 的 open PR"
→ github_list_prs({ repository: "octocat/hello-world", state: "open" })
→ github_get_pr({ repository: "octocat/hello-world", iid: <number> })
```

### 查看 PR 变更和评论
```
→ github_get_pr_diffs({ repository: "...", iid: <number> })
→ github_list_pr_notes({ repository: "...", iid: <number> })
```

### 创建 PR
```
User: "创建 PR: feature/login → main"
→ github_create_pr({
    repository: "octocat/hello-world",
    title: "...",
    sourceBranch: "feature/login",
    targetBranch: "main",
    description: "..."
  })
```

### 创建 Issue
```
User: "创建 Issue: 登录按钮坏了"
→ github_create_issue({
    repository: "octocat/hello-world",
    title: "登录按钮坏了",
    description: "详细描述..."
  })
```

### 查看和编辑文件
```
→ github_get_file_contents({ repository: "...", path: "src/index.ts" })
→ github_create_or_update_file({
    repository: "...",
    path: "src/index.ts",
    content: "...",
    branch: "main",
    commitMessage: "fix: update index"
  })
```

### 查看 CI/CD
```
→ gitlab_list_pipelines({ repository: "...", ref: "main" })
→ github_get_pipeline({ repository: "...", runId: "..." })
→ github_get_pipeline_job_output({ repository: "...", jobId: "..." })
```

### 合并 PR
```
→ github_merge_pr({ repository: "...", iid: <number>, method: "squash" })
```

### 搜索代码
```
→ github_search_code({ search: "TODO", repository: "octocat/hello-world" })
```

### 管理标签和里程碑
```
→ github_list_labels({ repository: "..." })
→ github_create_label({ repository: "...", name: "priority-high", color: "ff0000" })
```

## Tips

1. **始终先获取信息再操作** — 修改前先 `get_*` 确认当前状态
2. **提供上下文** — 创建 PR/Issue 时写出有意义的描述
3. **确认危险操作** — merge、delete 前向用户确认
4. **处理错误** — 错误响应包含 `suggestion` 字段，据此调整
5. **跨平台** — 如果用户没指定平台，先问一下
