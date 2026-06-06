#!/bin/bash
# git-mcp — One-line MCP server installer for Git platforms
# Usage: curl -fsSL https://raw.githubusercontent.com/hezuofu/git-mcp/main/install.sh | bash -s -- --github-token ghp_xxx --gitlab-token glpat_xxx

set -e

NPM_REGISTRY="https://registry.npmjs.org"
PACKAGE="@git-mcp/git-mcp"
CONFIG_FILE="${HOME}/.git-mcp-config.json"
PLATFORMS="[]"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[git-mcp]${NC} $1"; }
warn()  { echo -e "${YELLOW}[git-mcp]${NC} $1"; }
err()   { echo -e "${RED}[git-mcp]${NC} $1"; exit 1; }

# Parse args
GITHUB_TOKEN=""
GITLAB_TOKEN=""
GITEE_TOKEN=""
GITCODE_TOKEN=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --github-token) GITHUB_TOKEN="$2"; shift 2 ;;
    --gitlab-token) GITLAB_TOKEN="$2"; shift 2 ;;
    --gitee-token) GITEE_TOKEN="$2"; shift 2 ;;
    --gitcode-token) GITCODE_TOKEN="$2"; shift 2 ;;
    --help|-h) echo "Usage: curl -fsSL https://raw.githubusercontent.com/hezuofu/git-mcp/main/install.sh | bash -s -- [--github-token TOKEN] [--gitlab-token TOKEN] [--gitee-token TOKEN] [--gitcode-token TOKEN]"; exit 0 ;;
    *) shift ;;
  esac
done

info "Installing ${PACKAGE}..."

# Detect Node.js
if ! command -v node &> /dev/null; then
  err "Node.js >= 18 is required. Install from https://nodejs.org"
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  err "Node.js >= 18 required, found: $(node -v)"
fi

# Install via npm
if command -v npm &> /dev/null; then
  info "Installing via npm..."
  npm install -g "${PACKAGE}" 2>&1 || warn "npm install failed, trying npx fallback"
else
  warn "npm not found, will use npx at runtime"
fi

# Build platform config
PARTS=""
if [ -n "$GITHUB_TOKEN" ]; then
  PARTS="${PARTS}{\"platform\":\"github\",\"auth\":{\"type\":\"pat\",\"token\":\"${GITHUB_TOKEN}\"}},"
  info "✓ GitHub configured"
fi
if [ -n "$GITLAB_TOKEN" ]; then
  PARTS="${PARTS}{\"platform\":\"gitlab\",\"auth\":{\"type\":\"pat\",\"token\":\"${GITLAB_TOKEN}\"}},"
  info "✓ GitLab configured"
fi
if [ -n "$GITEE_TOKEN" ]; then
  PARTS="${PARTS}{\"platform\":\"gitee\",\"auth\":{\"type\":\"pat\",\"token\":\"${GITEE_TOKEN}\"}},"
  info "✓ Gitee configured"
fi
if [ -n "$GITCODE_TOKEN" ]; then
  PARTS="${PARTS}{\"platform\":\"gitcode\",\"auth\":{\"type\":\"pat\",\"token\":\"${GITCODE_TOKEN}\"}},"
  info "✓ GitCode configured"
fi

# Remove trailing comma
PARTS="${PARTS%,}"
PLATFORMS="[${PARTS}]"

# Save config
echo "{\"platforms\":${PLATFORMS}}" > "${CONFIG_FILE}"
info "Config saved to ${CONFIG_FILE}"

# Print setup instructions
echo ""
echo "============================================"
echo "  git-mcp installed successfully!"
echo "============================================"
echo ""
echo "  Add to your AI tool:"
echo ""
echo "  Claude Code (~/.claude/settings.json):"
echo '  {'
echo '    "mcpServers": {'
echo '      "git-mcp": {'
echo '        "command": "npx",'
echo '        "args": ["-y", "@git-mcp/git-mcp"],'
echo '        "env": {'
echo "          \"GIT_MCP_CONFIG_PATH\": \"${CONFIG_FILE}\""
echo '        }'
echo '      }'
echo '    }'
echo '  }'
echo ""
echo "  Cursor (.cursor/mcp.json):"
echo '  {'
echo '    "mcpServers": {'
echo '      "git-mcp": {'
echo '        "command": "npx",'
echo '        "args": ["-y", "@git-mcp/git-mcp"],'
echo '        "env": {'
echo "          \"GIT_MCP_CONFIG_PATH\": \"${CONFIG_FILE}\""
echo '        }'
echo '      }'
echo '    }'
echo '  }'
echo ""
echo "  Or run directly:"
echo "  GIT_MCP_CONFIG_PATH=${CONFIG_FILE} npx @git-mcp/git-mcp"
