# Docker 部署

## 构建镜像

```bash
docker build -t git-mcp:latest .
```

## 使用方式

### 方式一：stdio 模式（AI 工具集成）

最常用方式，通过 stdin/stdout 与 AI 工具通信：

```bash
docker run -i --rm \
  -e GIT_MCP_CONFIG='{"platforms":[{"platform":"github","auth":{"type":"pat","token":"ghp_xxx"}}]}' \
  git-mcp:latest
```

### 方式二：HTTP 模式（远程部署）

```bash
docker run -d -p 3002:3002 \
  -e GIT_MCP_CONFIG='{"platforms":[{"platform":"github","auth":{"type":"pat","token":"ghp_xxx"}}]}' \
  -e GIT_MCP_TRANSPORT=streamable-http \
  -e GIT_MCP_HOST=0.0.0.0 \
  git-mcp:latest
```

MCP 端点: `http://localhost:3002/mcp`

### 方式三：Docker Compose

```bash
# stdio 模式
docker compose run --rm git-mcp

# HTTP 模式（后台运行）
docker compose --profile http up -d
```

配置 `.env`:

```env
GIT_MCP_CONFIG={"platforms":[{"platform":"github","auth":{"type":"pat","token":"ghp_xxx"}}]}
GIT_MCP_PORT=3002
```

## AI 工具配置（Docker）

### Claude Code

```json
{
  "mcpServers": {
    "git-mcp": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "git-mcp:latest"],
      "env": {
        "GIT_MCP_CONFIG": "{\"platforms\":[{\"platform\":\"github\",\"auth\":{\"type\":\"pat\",\"token\":\"ghp_xxx\"}}]}"
      }
    }
  }
}
```

### Cursor

```json
{
  "mcpServers": {
    "git-mcp": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "git-mcp:latest"],
      "env": {
        "GIT_MCP_CONFIG": "{\"platforms\":[{\"platform\":\"github\",\"auth\":{\"type\":\"pat\",\"token\":\"ghp_xxx\"}}]}"
      }
    }
  }
}
```

### HTTP 模式（多客户端共享）

```json
{
  "mcpServers": {
    "git-mcp": {
      "url": "http://localhost:3002/mcp"
    }
  }
}
```

## 多平台配置

```bash
docker run -i --rm \
  -e GIT_MCP_CONFIG='{
    "platforms": [
      {"platform":"github","auth":{"type":"pat","token":"ghp_xxx"}},
      {"platform":"gitlab","auth":{"type":"pat","token":"glpat_xxx"}},
      {"platform":"gitee","auth":{"type":"pat","token":"xxx"}},
      {"platform":"gitcode","auth":{"type":"pat","token":"xxx"}}
    ]
  }' \
  git-mcp:latest
```

## 健康检查（HTTP 模式）

```bash
curl http://localhost:3002/mcp
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `GIT_MCP_CONFIG` | 必填 | 平台配置 JSON |
| `GIT_MCP_TRANSPORT` | `stdio` | `stdio` / `sse` / `streamable-http` |
| `GIT_MCP_HOST` | `127.0.0.1` | HTTP 监听地址 |
| `GIT_MCP_PORT` | `3002` | HTTP 端口 |
| `HTTP_PROXY` | — | 代理 |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `1` | TLS 验证 |

## 镜像大小优化

多阶段构建后，生产镜像仅包含：
- Node.js alpine + pnpm
- 编译后的 JS 文件 (build/)
- 生产依赖 (got, zod, MCP SDK)

预估镜像大小: ~150MB
