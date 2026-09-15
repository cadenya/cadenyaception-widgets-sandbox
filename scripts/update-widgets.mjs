import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repository = "https://github.com/cadenya/widgets-ui-react.git";
const ref = process.argv[2] || "main";
const additionalRefs = process.argv.slice(3);
const root = process.cwd();
const source = mkdtempSync(join(tmpdir(), "cadenya-widgets-source-"));
const env = { ...process.env, npm_config_cache: join(tmpdir(), "cadenya-widgets-npm-cache") };
const run = (cmd, args, cwd = source) => execFileSync(cmd, args, { cwd, env, stdio: "inherit" });
run("git", [
  "clone",
  ...(additionalRefs.length ? [] : ["--depth", "1"]),
  "--branch",
  ref,
  repository,
  source,
]);
const sources = [
  {
    commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: source, encoding: "utf8" }).trim(),
  },
];
for (const additionalRef of additionalRefs) {
  run("git", ["fetch", "origin", additionalRef]);
  const sourceCommit = execFileSync("git", ["rev-parse", "FETCH_HEAD"], {
    cwd: source,
    encoding: "utf8",
  }).trim();
  run("git", ["merge", "--no-edit", sourceCommit]);
  sources.push({ commit: sourceCommit });
}
const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: source, encoding: "utf8" }).trim();
run("npm", ["ci"]);
run("npm", ["test"]);
run("npm", ["run", "build"]);
const vendor = join(root, "vendor");
mkdirSync(vendor, { recursive: true });
const packed = JSON.parse(
  execFileSync("npm", ["pack", "--json", "--pack-destination", vendor], {
    cwd: source,
    env,
    encoding: "utf8",
  }),
)[0];
const filename = `cadenya-widgets-ui-react-${commit.slice(0, 12)}.tgz`;
renameSync(join(vendor, packed.filename), join(vendor, filename));
const version = JSON.parse(readFileSync(join(source, "package.json"), "utf8")).version;
writeFileSync(
  join(vendor, "widgets-ui-react-source.json"),
  JSON.stringify({ repository, commit, sources, version, artifact: filename }, null, 2) + "\n",
);
run("npm", ["install", "--save", `file:vendor/${filename}`], root);
console.log(`Installed widgets-ui-react from GitHub commit ${commit}`);
