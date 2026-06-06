# CI/CD Skill

Use git-mcp tools to manage CI/CD pipelines.

## GitLab CI

### View Pipeline Status
```
→ gitlab_list_pipelines({ repository: "<project_id>", ref: "main" })
→ gitlab_get_pipeline({ repository: "...", pipelineId: "..." })
```

### View Job Logs
```
→ gitlab_list_pipeline_jobs({ repository: "...", pipelineId: "..." })
→ gitlab_get_pipeline_job_output({ repository: "...", jobId: "..." })
```

### Control Pipeline
```
→ gitlab_retry_pipeline({ repository: "...", pipelineId: "..." })
→ gitlab_cancel_pipeline({ repository: "...", pipelineId: "..." })
→ gitlab_play_pipeline_job({ repository: "...", jobId: "..." })
→ gitlab_retry_pipeline_job({ repository: "...", jobId: "..." })
```

### Create Pipeline
```
→ gitlab_create_pipeline({ repository: "...", ref: "main" })
```

### View MR Pipelines
```
→ gitlab_list_mr_pipelines({ repository: "...", mrIid: <number> })
```

## GitHub Actions

### View Workflow Runs
```
→ github_list_pipelines({ repository: "owner/repo", ref: "main" })
→ github_get_pipeline({ repository: "...", runId: "..." })
```

### View Job Logs
```
→ github_list_pipeline_jobs({ repository: "...", runId: "..." })
→ github_get_pipeline_job_output({ repository: "...", jobId: "..." })
```

### Control Workflows
```
→ github_retry_pipeline({ repository: "...", runId: "..." })
→ github_cancel_pipeline({ repository: "...", runId: "..." })
→ github_play_pipeline_job({ repository: "...", jobId: "..." })
```

### Trigger Workflow
```
→ github_create_pipeline({ repository: "...", ref: "main" })
```

### View Artifacts
```
→ github_list_job_artifacts({ repository: "...", runId: "..." })
```

## Troubleshooting

1. **Pipeline failed**:
   → `get_pipeline_job_output` 查看失败 job 的日志
   → 分析错误原因
   → 建议修复后 `retry_pipeline` 或推送新 commit

2. **Stuck pipeline**:
   → `cancel_pipeline` 取消
   → 修复后重试

3. **Manual job waiting**:
   → `play_pipeline_job` 手动触发
