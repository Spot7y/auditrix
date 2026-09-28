// Runs every *.test.ts / *.test.mts file with Node's built-in test runner (via tsx for
// TypeScript). Used by `npm test`; works on Windows, macOS and Linux.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const searchDirs = ["lib", "tests"];

function findTests(dir) {
  const found = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") found.push(...findTests(full));
    else if (entry.isFile() && /\.test\.m?ts$/.test(entry.name)) found.push(full);
  }
  return found;
}

// Server action tests replace modules like the Supabase client, which needs
// Node's module mocking (Node 22.3+). On older Node they're skipped.
const mockFlag = "--experimental-test-module-mocks";
const [major, minor] = process.versions.node.split(".").map(Number);
const canMock = major > 22 || (major === 22 && minor >= 3);

let files = searchDirs.flatMap((dir) => findTests(path.join(root, dir))).sort();
if (!canMock) {
  const skipped = files.filter((f) => f.includes(`${path.sep}actions${path.sep}`));
  files = files.filter((f) => !skipped.includes(f));
  if (skipped.length > 0) {
    console.warn(`Skipping ${skipped.length} server action test file(s): they need Node 22.3 or newer.`);
  }
}

const args = ["--import", "tsx", ...(canMock ? [mockFlag, "--no-warnings=ExperimentalWarning"] : []), "--test", ...files];
const result = spawnSync(process.execPath, args, { stdio: "inherit", cwd: root });
process.exit(result.status ?? 1);
