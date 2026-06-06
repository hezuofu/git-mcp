# Release Management Skill

Use git-mcp tools to manage releases and tags.

## Create a Release

### Step 1: Review Current Tags
```
→ github_list_tags({ repository: "owner/repo" })
→ gitlab_list_tags({ repository: "<id>" })
```

### Step 2: View Existing Releases
```
→ github_list_releases({ repository: "owner/repo" })
```

### Step 3: Create a Tag (optional)
```
→ github_create_tag({
    repository: "owner/repo",
    name: "v1.2.0",
    ref: "main",
    message: "Release v1.2.0"
  })
```

### Step 4: Create a Release
```
→ github_create_release({
    repository: "owner/repo",
    tagName: "v1.2.0",
    name: "Version 1.2.0",
    description: "## Changelog\n- Feature A\n- Fix B"
  })
```

## Update a Release
```
→ github_update_release({
    repository: "owner/repo",
    tagName: "v1.2.0",
    description: "Updated release notes"
  })
```

## View Release Details
```
→ github_get_release({ repository: "owner/repo", tagName: "v1.2.0" })
```

## Release Checklist

- [ ] All PRs for this milestone merged
- [ ] CI passes on main branch
- [ ] CHANGELOG updated
- [ ] Version bumped in code
- [ ] Tag created
- [ ] Release notes written
- [ ] Release published
