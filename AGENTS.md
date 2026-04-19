# pdf2md-cli — Agent Instructions

CLI tool that converts PDFs (local files or remote URLs) to clean Markdown with font-size-based heading detection. See [README.md](README.md) for full feature overview and output format.

## Commands

```bash
node bin/cli.js local ./file.pdf          # convert local PDF
node bin/cli.js local ./file.pdf -o out.md --clipboard
node bin/cli.js web https://example.com/paper.pdf
npm start -- local ./file.pdf            # same via npm
```

No test suite yet (`npm test` is a placeholder).

## Architecture

```
bin/cli.js                  # Commander entry point — defines `local` and `web` subcommands
src/commands/local.js       # Reads file from disk, calls extractor + formatter, writes .md
src/commands/web.js         # Fetches PDF via axios, same pipeline
src/services/extractor.js   # pdf-parse wrapper; heading detection + per-page rendering
src/utils/formatter.js      # Assembles pages into final Markdown with metadata header
src/utils/logger.js         # chalk-based log helpers: log.info / success / warn / error / dim
```

## Key Conventions

- **ESM only** (`"type": "module"` in package.json). Use `import`/`export` everywhere. Use `createRequire(import.meta.url)` for CJS-only packages.
- **Heading thresholds** live in `HEADING_THRESHOLDS` at the top of `extractor.js`. Font sizes come from `item.transform[0]` (scale X). Adjust thresholds there, not in the render loop.
- **`pdf-parse` import path**: must be `pdf-parse/lib/pdf-parse.js`, not the package root — the root entry point triggers a test-file read that throws in ESM.
- **`clipboardy`** is an optional peer dependency (not in `package.json`). Both commands gracefully fall back with a warning if it's absent. Do not add it to `dependencies`.
- **`pkg`** (devDependency) is used to bundle the CLI into standalone executables — no special config file yet.
- Errors always call `process.exit(1)` after `log.error(...)`. No thrown exceptions bubble out of commands.
