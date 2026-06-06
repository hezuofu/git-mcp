# git-mcp — One-line MCP server installer for Windows
# Usage: irm https://raw.githubusercontent.com/hezuofu/git-mcp/main/install.ps1 | iex

param(
  [string]$GitHubToken,
  [string]$GitLabToken,
  [string]$GiteeToken,
  [string]$GitCodeToken
)

$ErrorActionPreference = "Stop"
$Package = "@git-mcp/git-mcp"
$ConfigFile = "$env:USERPROFILE\.git-mcp-config.json"

Write-Host "[git-mcp] Installing $Package..." -ForegroundColor Green

# Detect Node.js
try {
  $nodeVersion = node -v
  Write-Host "[git-mcp] Node.js: $nodeVersion" -ForegroundColor Gray
} catch {
  Write-Error "Node.js >= 18 is required. Install from https://nodejs.org"
  exit 1
}

# Install via npm
try {
  Write-Host "[git-mcp] Installing via npm..." -ForegroundColor Gray
  npm install -g $Package 2>&1 | Out-Null
} catch {
  Write-Host "[git-mcp] npm install failed, will use npx at runtime" -ForegroundColor Yellow
}

# Build platform config
$platforms = @()
if ($GitHubToken) { $platforms += @{ platform="github"; auth=@{ type="pat"; token=$GitHubToken } }; Write-Host "✓ GitHub configured" -ForegroundColor Green }
if ($GitLabToken) { $platforms += @{ platform="gitlab"; auth=@{ type="pat"; token=$GitLabToken } }; Write-Host "✓ GitLab configured" -ForegroundColor Green }
if ($GiteeToken)  { $platforms += @{ platform="gitee"; auth=@{ type="pat"; token=$GiteeToken } }; Write-Host "✓ Gitee configured" -ForegroundColor Green }
if ($GitCodeToken) { $platforms += @{ platform="gitcode"; auth=@{ type="pat"; token=$GitCodeToken } }; Write-Host "✓ GitCode configured" -ForegroundColor Green }

$config = @{ platforms = $platforms } | ConvertTo-Json -Compress
$config | Out-File -FilePath $ConfigFile -Encoding utf8
Write-Host "[git-mcp] Config saved to $ConfigFile" -ForegroundColor Green

# Print setup instructions
Write-Host ""
Write-Host "============================================"  -ForegroundColor Cyan
Write-Host "  git-mcp installed successfully!" -ForegroundColor Cyan
Write-Host "============================================"  -ForegroundColor Cyan
Write-Host ""
Write-Host "  Add to your AI tool:"
Write-Host ""
Write-Host '  Claude Code:'
Write-Host '  {'
Write-Host '    "mcpServers": {'
Write-Host '      "git-mcp": {'
Write-Host '        "command": "npx",'
Write-Host '        "args": ["-y", "@git-mcp/git-mcp"],'
Write-Host '        "env": {'
Write-Host "          ""GIT_MCP_CONFIG_PATH"": ""$ConfigFile"""
Write-Host '        }'
Write-Host '      }'
Write-Host '    }'
Write-Host '  }'
