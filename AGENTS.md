<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Public repository standards

Treat this repository as a public example for visitors who have never used Cadenya.

- Introduce Cadenya and explain necessary terms before using them. Keep setup instructions complete, ordered, and usable with the reader's own workspace.
- Link to relevant guides and API documentation at `https://cadenya.com/docs`. Verify specific documentation URLs before adding them.
- Give every fenced code block a language indicator, such as `sh`, `dotenv`, `json`, `tsx`, or `text` for directory trees and plain output.
- Keep READMEs focused on what the examples do, how to run them, and how to extend them. Omit internal processes, ticket trackers such as Linear, private source paths, purchase references, and deployment-specific operational notes.
- Do not add standalone operational sections such as "Browser Verification." Keep configuration needed to run the app concise in setup instructions and `.env.example`.
- Describe current behavior. Remove migration narratives and comments such as "this used to be X, but now is Y." Keep comments that explain a current constraint, ordering requirement, or non-obvious failure case.
- Apply these rules across documentation, code comments, prompts, configuration examples, and generated metadata. Preserve useful dependency provenance through public repository URLs, versions, and commit hashes; omit internal ticket and branch labels.
- Keep credentials out of tracked files. Make workspace-specific setup inputs configurable and explain which resource files setup generates.
- Preserve required third-party attribution and license notices.

## Validation

- Check Markdown links and fenced code block languages after documentation edits.
- Run `npm run format:check` and `git diff --check` for applicable changes. Use `npm run format` to format examples, scripts, and their documentation.
- For behavior changes, run `npm test`, `npm run typecheck`, and `npm run build`.
- Keep `CLAUDE.md` as a relative symlink to `AGENTS.md` so both tools read the same instructions.
