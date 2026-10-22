// Regenerates src/lib/ai/routeManifest.json: the list of page/route files under
// src/app. The dev assistant uses it to point a fix prompt at likely files.
// A unit test fails when the committed manifest is stale, so run this after
// adding or moving a page or API route:   node scripts/gen-route-manifest.mjs
import { readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = "src/app";
const out = "src/lib/ai/routeManifest.json";

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/^(page|route)\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const list = walk(root).map((f) => f.split(sep).join("/")).sort();
writeFileSync(out, JSON.stringify(list, null, 2) + "\n");
console.log(`${list.length} routes written to ${out}`);
