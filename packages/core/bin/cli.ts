#!/usr/bin/env node
import { main } from "../src/cli.js";

main().catch((err) => {
  console.error("Fatal:", (err as Error).message ?? err);
  process.exit(1);
});
