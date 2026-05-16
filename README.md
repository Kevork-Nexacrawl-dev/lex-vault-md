# pdf2md-cli

> **Convert any PDF to clean Markdown — from the command line.**  
> Smart heading detection, page separators, and full source metadata. Works with local files, remote URLs, and entire folders.

[![npm version](https://img.shields.io/badge/npm-v1.0.0-cb3837?logo=npm)](https://www.npmjs.com/package/pdf2md-cli)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

---

## Install

```bash
npm install -g pdf2md-cli
```

Requires Node.js 18+.

---

## Usage

### Convert a local PDF

```bash
pdf2md local ./report.pdf
```

### Fetch and convert a remote PDF

```bash
pdf2md web https://arxiv.org/pdf/2103.00020.pdf
```

### Batch convert an entire folder

```bash
# Convert all PDFs in a folder (output to same folder)
pdf2md batch ./case_files/

# Convert all PDFs and write .md files to a different folder
pdf2md batch ./case_files/ --output ./converted/

# Control parallel processing (default: 3)
pdf2md batch ./case_files/ --output ./converted/ --concurrency 5
```

**Batch output example:**
```
ℹ Found 62 PDF(s) in case_244401336
ℹ Output → ./converted

 ✔ document_001.pdf → document_001.md  (3 page(s), 4821 chars)
 ✔ document_002.pdf → document_002.md  (1 page(s), 892 chars)
 ⏭ document_003.pdf — Skipped (exists)
 ✖ document_004.pdf — encrypted PDF — skipped
 ...

────────────────────────────────────────────────
✔ Batch complete — 62 file(s) processed
  ✔ Converted : 59
  ⏭ Skipped   : 2  (already exists)
  ✖ Failed    : 1
```

---

### Flags

| Command | Flag | Short | Description |
|---|---|---|---|
| `local` | `--output <file>` | `-o` | Custom output filename |
| `local` | `--clipboard` | `-c` | Copy Markdown to clipboard after saving |
| `web` | `--output <file>` | `-o` | Custom output filename |
| `web` | `--clipboard` | `-c` | Copy Markdown to clipboard after saving |
| `batch` | `--output <dir>` | `-o` | Output directory for .md files |
| `batch` | `--concurrency <n>` | `-n` | Parallel PDFs to process (default: 3) |

---

### Examples

```bash
# Save to a custom path
pdf2md local ./research.pdf --output ./notes/research.md

# Fetch remote PDF and copy result to clipboard
pdf2md web https://example.com/paper.pdf --clipboard

# Batch convert entire case folder
pdf2md batch "./case_244401336" --output "./case_244401336_md"

# Full example with both flags
pdf2md local ./invoice.pdf -o ./invoices/invoice.md -c
```

---

## Output Format

Every conversion produces a structured Markdown file:

```markdown
<!-- Source: report.pdf | Extracted: Apr 18, 2026, 06:00 PM -->

## Page 1

# Document Title

## Section Heading

Paragraph text flows here with proper line breaks
and paragraph spacing preserved from the original PDF.

---

## Page 2

### Subsection

Continued content...
```

**Heading detection** maps font sizes from the PDF's transform matrix:

| Font size | Markdown heading |
|---|---|
| ≥ 22px | `# H1` |
| ≥ 18px | `## H2` |
| ≥ 15px | `### H3` |
| > 14px (distinct size) | `#### H4` |

---

## Features

- **Smart heading detection** — reads raw font-size data from the PDF transform matrix, not guesswork
- **Y-sorted text extraction** — items sorted by visual position (top→bottom, left→right) before parsing
- **Page separators** — each page is a clearly labeled `## Page N` section with `---` dividers
- **Source metadata** — output header includes filename/URL and extraction timestamp
- **Batch conversion** — convert entire folders with parallel processing and a clean summary
- **Skip on exist** — batch mode skips already-converted files, safe to re-run
- **Colored terminal output** — chalk-powered `✔ success`, `✖ error`, `⚠ warn` messages
- **Spinner feedback** — ora spinner shows progress during extraction
- **Graceful error handling** — specific messages for missing files, encrypted PDFs, 404s, timeouts
- **Works offline** — local and batch modes require no internet connection

---

## Error Handling

| Scenario | Behavior |
|---|---|
| File not found | Clear error with resolved path |
| Not a `.pdf` file | Rejects before attempting extraction |
| Encrypted / password-protected PDF | Specific error message |
| Scanned / image-only PDF | Detects no text content, explains why |
| Unreachable URL | Distinguishes DNS failure vs. refused connection |
| HTTP 404 / 403 | Status-specific error messages |
| Request timeout (30s) | Clean timeout message |
| Empty folder (batch) | Warns and exits cleanly |
| Mixed folder (batch) | Skips non-PDF files silently |

---

## Tech Stack

| Package | Version | Role |
|---|---|---|
| [`commander`](https://github.com/tj/commander.js) | ^12 | CLI commands & flags |
| [`pdf-parse`](https://gitlab.com/autokent/pdf-parse) | ^1.1 | PDF text extraction (Node.js) |
| [`axios`](https://axios-http.com) | ^1.7 | Fetch remote PDFs |
| [`chalk`](https://github.com/chalk/chalk) | ^5 | Colored terminal output |
| [`ora`](https://github.com/sindresorhus/ora) | ^8 | Loading spinner |

---

## Why This Project

Most PDF-to-Markdown tools treat extraction as a text dump — they grab raw characters and call it done. The result is flat, unstructured Markdown that loses all the hierarchy the original document had.

I originally built two Tampermonkey userscripts — one for browser-tab PDFs, one for local files — that solved this by reading the PDF's raw transform matrix to detect font sizes, then mapping those sizes to proper heading levels. After using them daily and finding them more reliable than any existing tool I tried, I ported the core logic to a Node.js CLI so it can live in developer workflows, automation scripts, and CI pipelines.

**The result:** Markdown that actually reflects the document's structure — with real headings, proper paragraph breaks, and page markers — ready to paste into Obsidian, Notion, or any Markdown editor.

---

## Local Development

```bash
git clone https://github.com/Kevork-Nexacrawl-dev/pdf2md-cli.git
cd pdf2md-cli
npm install
npm link          # makes pdf2md available globally

pdf2md local ./test.pdf
pdf2md batch ./test-folder/
```

---

## Contributing

PRs are welcome. Open an issue first for any significant changes.

Please review [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request,
and follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all project spaces.

---

## License

MIT © [Kevork](https://github.com/Kevork-Nexacrawl-dev)
