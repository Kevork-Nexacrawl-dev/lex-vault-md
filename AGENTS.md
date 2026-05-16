# pdf2md-cli — Agent Instructions

CLI tool that converts PDFs (local files, remote URLs, or folders) to clean Markdown with font-size-based heading detection.

For product details and examples, link to existing docs instead of repeating them:
- [README.md](README.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)

## Commands Agents Should Run

```bash
npm install
npm start -- --help
npm start -- local ./file.pdf
npm start -- web https://example.com/paper.pdf
npm start -- batch ./folder --output ./out --concurrency 3
```

Direct CLI entry also works:

```bash
node bin/cli.js local ./file.pdf
node bin/cli.js web https://example.com/paper.pdf
node bin/cli.js batch ./folder
node bin/cli.js ./file.pdf            # shorthand default command
node bin/cli.js https://example.com/a.pdf
```

Validation note: `npm test` is a placeholder and does not run real tests.

## Architecture Snapshot

```text
bin/cli.js                  # Commander entry point: local, web, batch, and default shorthand
src/commands/local.js       # Local PDF pipeline: validate -> extract -> format -> write
src/commands/web.js         # Remote PDF pipeline via axios -> extract -> format -> write
src/commands/batch.js       # Folder pipeline: enumerate PDFs, skip existing .md, parallel conversion
src/services/extractor.js   # pdf-parse wrapper, heading detection, per-page render logic
src/utils/formatter.js      # Builds final Markdown with source/timestamp header + page separators
src/utils/logger.js         # Shared chalk logger helpers
```

## Project Conventions And Pitfalls

- ESM only (`"type": "module"`); use `import`/`export` everywhere.
- For CJS-only packages (like optional clipboard support), use `createRequire(import.meta.url)`.
- Keep `pdf-parse` import path as `pdf-parse/lib/pdf-parse.js`; package root import is problematic in this ESM setup.
- Heading thresholds live in `HEADING_THRESHOLDS` in `src/services/extractor.js`; tune there, not in render loop branches.
- `clipboardy` is intentionally optional and not listed in dependencies. Preserve graceful fallback warnings if missing.
- Command modules handle user-facing failures and call `process.exit(1)` after `log.error(...)`; preserve this behavior for consistency.
