# LexVaultMD — Agent Instructions

CLI tool that converts legal PDFs (local files or remote URLs) to clean, AI-ready Markdown with font-size-based heading detection, multi-column layout support, table extraction, and artifact removal. See [README.md](README.md) for full feature overview and output format.

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
bin/cli.js                  # Commander entry point — defines `local`, `web`, and `batch` subcommands
src/commands/local.js       # Reads file from disk, calls extractor + formatter, writes .md
src/commands/web.js         # Fetches PDF via axios, same pipeline
src/commands/batch.js       # Walks a directory, runs local pipeline in parallel
src/services/extractor.js   # pdf-parse wrapper; two-pass architecture (pre-scan + render)
src/gate/signals.js         # pdfmux 4-signal garbage/scanned-PDF detector
src/gate/artifacts.js       # Header/footer removal, watermark stripping, margin noise
src/gate/index.js           # Gate orchestrator — wires signals + artifacts
src/layout/mer.js           # MER column detection algorithm
src/layout/novlad.js        # NovaLAD reading order
src/tables/orchestrator.js  # Hybrid table orchestrator
src/tables/lattice.js       # Lattice (bordered) table extractor
src/tables/stream.js        # Stream (borderless) table extractor
src/utils/formatter.js      # Assembles pages into final Markdown with metadata header
src/utils/logger.js         # chalk-based log helpers: log.info / success / warn / error / dim
```

## Key Conventions

- **ESM only** (`"type": "module"` in package.json). Use `import`/`export` everywhere. Use `createRequire(import.meta.url)` for CJS-only packages.
- **Heading detection** is body-size relative in `extractor.js`: the page body size is the mode of `item.transform[0]` values, then headings are detected by ratio against that body size.
- **`pdf-parse` import path**: must be `pdf-parse/lib/pdf-parse.js`, not the package root — the root entry point triggers a test-file read that throws in ESM.
- **`clipboardy`** is an optional peer dependency (not in `package.json`). Both commands gracefully fall back with a warning if it's absent. Do not add it to `dependencies`.
- **CLI binary names**: `lex-vault-md` (primary) and `pdf2md` (legacy alias) — both point to `bin/cli.js`.
- Errors always call `process.exit(1)` after `log.error(...)`. No thrown exceptions bubble out of commands.

## Research & Tool Strategy

Use [`agent-playbooks/competitive-research-architect.md`](agent-playbooks/competitive-research-architect.md) when the task is competitor research, architecture validation, OCR/layout/table extraction research, or build-plan refinement from external evidence.

Tool routing for research-heavy work:

- **Octocode**: primary tool for source-backed competitor research across GitHub repositories, pull requests, npm packages, and local code. Prefer source files over README claims.
- **CodeGraphContext (CGC)**: use for local graph indexing, call-chain analysis, impact analysis, dead-code discovery, and relationship questions after the repo has been indexed.
- **Context7**: use for current library/framework/API docs when implementation depends on exact current syntax or behavior.
- **DeepWiki**: if available, use only as supplementary documentation for libraries or repositories after source-code evidence has been gathered.
- **GitHub plugin / `gh`**: use for repository metadata, releases, issues, PRs, and publication workflows.

Do not add a recommendation to the build plan unless it is supported by primary evidence, fits this Node.js ESM CLI, and is compatible with the commercial/legal-tech positioning.

## Build Log

### Build 0 — Rename and Legal-Tech Repositioning

Renamed the project from `pdf2md-cli` to `LexVaultMD` / `lex-vault-md`.

Updated:
- npm package name to `@nexacrawl/lex-vault-md`
- CLI command to `lex-vault-md`
- temporary legacy alias `pdf2md`
- repository renamed to `Kevork-Nexacrawl-dev/lex-vault-md`
- README positioning for legal teams, litigation, discovery, exhibits, pleadings, and AI-ready Markdown workflows
- package keywords for legal-tech SEO
- BSL licensor to `Nexacrawl`
