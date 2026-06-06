# ─── Builder Stage ───
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/core/package.json packages/core/tsconfig.json packages/core/
COPY packages/adapter-github/package.json packages/adapter-github/tsconfig.json packages/adapter-github/
COPY packages/adapter-gitlab/package.json packages/adapter-gitlab/tsconfig.json packages/adapter-gitlab/
COPY packages/adapter-gitee/package.json packages/adapter-gitee/tsconfig.json packages/adapter-gitee/
COPY packages/adapter-gitcode/package.json packages/adapter-gitcode/tsconfig.json packages/adapter-gitcode/

RUN pnpm install --frozen-lockfile

# Copy source and build
COPY packages/core/src packages/core/src
COPY packages/core/bin packages/core/bin
COPY packages/adapter-github/src packages/adapter-github/src
COPY packages/adapter-gitlab/src packages/adapter-gitlab/src
COPY packages/adapter-gitee/src packages/adapter-gitee/src
COPY packages/adapter-gitcode/src packages/adapter-gitcode/src

RUN pnpm build

# ─── Release Stage ───
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=builder /app/packages/core/package.json /app/packages/core/package.json
COPY --from=builder /app/packages/core/build /app/packages/core/build
COPY --from=builder /app/packages/adapter-github/package.json /app/packages/adapter-github/package.json
COPY --from=builder /app/packages/adapter-github/build /app/packages/adapter-github/build
COPY --from=builder /app/packages/adapter-gitlab/package.json /app/packages/adapter-gitlab/package.json
COPY --from=builder /app/packages/adapter-gitlab/build /app/packages/adapter-gitlab/build
COPY --from=builder /app/packages/adapter-gitee/package.json /app/packages/adapter-gitee/package.json
COPY --from=builder /app/packages/adapter-gitee/build /app/packages/adapter-gitee/build
COPY --from=builder /app/packages/adapter-gitcode/package.json /app/packages/adapter-gitcode/package.json
COPY --from=builder /app/packages/adapter-gitcode/build /app/packages/adapter-gitcode/build
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml

ENV NODE_ENV=production
ENV GIT_MCP_TRANSPORT=stdio

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

EXPOSE 3002

ENTRYPOINT ["node", "/app/packages/core/build/bin/cli.js"]
