import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// devicon's GitHub mark, inlined at build time so it recolors with currentColor like the rest of the nav.
// Read by path rather than require.resolve so the bundler does not turn the SVG into a static asset reference.
const svg = readFileSync(join(process.cwd(), "node_modules", "devicon", "icons", "github", "github-original.svg"), "utf8")
  .replace(/fill="#181616"/g, 'fill="currentColor"')
  .replace("<svg ", '<svg class="github-icon" aria-hidden="true" focusable="false" ');

export function GithubIcon() {
  return <span dangerouslySetInnerHTML={{ __html: svg }} />;
}
