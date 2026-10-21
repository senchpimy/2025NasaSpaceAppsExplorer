#!/usr/bin/env bun
import { rm } from "node:fs/promises";
import path from "node:path";

const entries = [
  "server/api/search.ts",
  "server/api/facets.ts",
  "server/api/stats.ts",
  "server/api/categorias/[cat].ts",
];

const outdir = path.join(process.cwd(), "api");
await rm(outdir, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: entries,
  root: "server/api",
  outdir,
  target: "node",
  format: "esm",
  external: ["better-sqlite3"],
  sourcemap: "none",
  minify: false,
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

for (const output of result.outputs) {
  console.log(output.path);
}
