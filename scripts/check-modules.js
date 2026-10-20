import { readdir, readFile } from "node:fs/promises";
import { resolve, dirname, extname } from "node:path";
import { spawnSync } from "node:child_process";
const root = resolve("dist/js");
const graph = new Map();
async function visitDirectory(directory) {
  for (const file of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, file.name);
    if (file.isDirectory()) await visitDirectory(path);
    else if (extname(path) === ".js") {
      const check = spawnSync(process.execPath, ["--check", path], {
        encoding: "utf8",
      });
      if (check.status !== 0) throw new Error(check.stderr);
      const source = await readFile(path, "utf8");
      graph.set(
        path,
        [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) =>
          resolve(dirname(path), match[1].split("?")[0]),
        ),
      );
    }
  }
}
await visitDirectory(root);
function checkCycles(path, ancestors = []) {
  if (ancestors.includes(path))
    throw new Error(
      `Circular dependency: ${[...ancestors, path].join(" -> ")}`,
    );
  if (!graph.has(path)) throw new Error(`Missing module: ${path}`);
  for (const dependency of graph.get(path))
    checkCycles(dependency, [...ancestors, path]);
}
for (const path of graph.keys()) checkCycles(path);
console.log(
  `${graph.size} modules: syntax, imports, and dependency cycles checked.`,
);
