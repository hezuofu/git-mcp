#!/usr/bin/env node
// @git-mcp/git-mcp — bundled CLI entry point for npx usage
// Dynamically loads all bundled adapters and starts the MCP server.

import { main } from "@git-mcp/core";
main().catch(err => {
  console.error("Fatal:", err.message ?? err);
  process.exit(1);
});
