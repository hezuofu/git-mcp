# Project Setup Skill

Use git-mcp tools to set up new projects with labels, milestones, and branch protection.

## Create Repository
```
→ github_create_repo({
    name: "new-project",
    description: "A new project",
    visibility: "private"
  })
```

## Set Up Labels
```
→ github_create_label({ repository: "owner/new-project", name: "bug", color: "d73a4a", description: "Something isn't working" })
→ github_create_label({ repository: "owner/new-project", name: "enhancement", color: "a2eeef", description: "New feature request" })
→ github_create_label({ repository: "owner/new-project", name: "priority-high", color: "ff0000" })
→ github_create_label({ repository: "owner/new-project", name: "priority-medium", color: "ffaa00" })
→ github_create_label({ repository: "owner/new-project", name: "priority-low", color: "00ff00" })
→ github_create_label({ repository: "owner/new-project", name: "documentation", color: "0075ca" })
```

## Create Initial Files
```
→ github_create_or_update_file({
    repository: "owner/new-project",
    path: "README.md",
    content: "# new-project\n\nProject description",
    branch: "main",
    commitMessage: "docs: add README"
  })
→ github_create_or_update_file({
    repository: "owner/new-project",
    path: ".gitignore",
    content: "node_modules/\n.env\n*.log",
    branch: "main",
    commitMessage: "chore: add .gitignore"
  })
```

## Create Initial Issues
```
→ github_create_issue({
    repository: "owner/new-project",
    title: "Project setup",
    description: "Initial project setup tasks",
    labels: ["enhancement"]
  })
```

## Standard Labels Reference

| Name | Color | Purpose |
|------|-------|---------|
| bug | d73a4a | Something isn't working |
| enhancement | a2eeef | New feature request |
| documentation | 0075ca | Documentation changes |
| priority-high | ff0000 | Urgent |
| priority-medium | ffaa00 | Normal |
| priority-low | 00ff00 | Low urgency |
| good first issue | 7057ff | Easy for newcomers |
| help wanted | 008672 | Extra attention needed |
