#!/usr/bin/env node
// Seeds the local (miniflare) R2 with the same data objects production has in
// the omapak-repo bucket, so `wrangler dev` serves real catalog data:
//   data/catalog.json + data/flathub.json, built by web/scripts/*.
// Run from api/ after `bun install`:
//   bun run seed:local
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const catalog = resolve(here, "../../web/static/data/catalog.json");
const flathub = resolve(here, "../../web/static/data/flathub.json");

for (const [key, file] of [
  ["data/catalog.json", catalog],
  ["data/flathub.json", flathub],
]) {
  if (!existsSync(file)) {
    console.error(`missing ${file} — run the web build scripts first (see web/README.md)`);
    process.exit(1);
  }
  execSync(`bunx wrangler r2 object put "omapak-repo/${key}" --file "${file}" --local --force`, {
    stdio: "inherit",
    cwd: here,
  });
}
console.log("local R2 seeded");
