# Code Review Skill

Use git-mcp tools to perform thorough code reviews on pull requests.

## Workflow

### Step 1: Get PR Details
```
→ github_get_pr({ repository: "<owner>/<repo>", iid: <number> })
→ gitlab_get_pr({ repository: "<id>", iid: <number> })
```

### Step 2: Get Changes
```
→ github_get_pr_diffs({ repository: "...", iid: <number> })
```

### Step 3: Review Context
```
→ github_get_file_contents({ repository: "...", path: "...", ref: "<source branch>" })
→ github_list_commits({ repository: "...", ref: "<source branch>" })
```

### Step 4: Check CI
```
→ github_list_mr_pipelines({ repository: "...", mrIid: <number> })
```

### Step 5: Provide Review
```
→ github_create_pr_note({ repository: "...", iid: <number>, body: "<review comment>" })
→ github_create_issue_note({ repository: "...", iid: <number>, body: "<review comment>" })
```

## Review Checklist

- [ ] Code logic correct
- [ ] No security issues (injection, exposed secrets)
- [ ] Error handling present
- [ ] Tests included
- [ ] No debug code left
- [ ] Performance considerations
