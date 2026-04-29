# Repository Conventions

Conventions for human contributors and AI agents working on this repository.

## Style

- Terse technical prose. No emojis in commits, issues, PR comments, or code.
- TypeScript strict mode. No `any`, no `unknown` casts, no `@ts-ignore`,
  no `@ts-expect-error`, no enums.
- ESM modules with `.js` suffix in import paths (Node16 resolution).
- Tabs for indentation. Double quotes for strings (matches biome config).
- Tests use vitest with `#given .. #when .. #then` description style or plain
  `// given / // when / // then` body comments. No Arrange/Act/Assert labels.

## Commands

- `npm install` — install dependencies (peer + dev). Run after clone.
- `npm test` — run vitest test suite once.
- `npm run typecheck` — strict TypeScript check (no emit).
- `npm run check` — type check + biome.
- `pi -e ./src/index.ts` — load the extension into a local pi session for
  manual smoke testing.

## Constraints

- No Bun APIs. Runtime is Node only. `test/node-portability.test.ts` scans
  `src/` for `from "bun"`, `Bun.`, and `.exited` on every CI run.
- TUI rendering reads exclusively from typed `details` returned by tool
  `execute`. Never parse formatter strings inside renderers.
- `ast_grep_replace` runs with `executionMode: "sequential"` because it
  mutates files via the external `sg` process.
- Hot-path binary lookup uses size+existence check. `sg --version` validation
  runs only after a fresh download.
- README, CHANGELOG, LICENSE, and NOTICE must stay in sync with the
  registered tool schemas. The doc gates assert this.

## Don'ts

- No `git add -A` or `git add .`. Stage only the files you changed.
- No `git commit --no-verify`. No force pushes. No history rewriting on
  shared branches.
- No new dependency on omo source paths. The package is standalone.
- No new dependency on pi-coding-agent internal modules outside the
  documented public extension API in `@mariozechner/pi-coding-agent`.
