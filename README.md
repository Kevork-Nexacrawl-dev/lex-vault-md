# pdf2md-cli — Lightning-Fast PDF to Markdown CLI

> **pdf2md-cli by Nexacrawl** — Convert PDF documents to clean, structured Markdown in seconds. Smart heading detection, batch mode, local files, and remote URLs.

**Repository:** [github.com/Kevork-Nexacrawl-dev/pdf2md-cli](https://github.com/Kevork-Nexacrawl-dev/pdf2md-cli)

[![GitHub Repo](https://img.shields.io/badge/GitHub-Kevork--Nexacrawl--dev%2Fpdf2md--cli-181717?logo=github)](https://github.com/Kevork-Nexacrawl-dev/pdf2md-cli)
[![npm version](https://img.shields.io/badge/npm-v1.0.0-cb3837?logo=npm)](https://www.npmjs.com/package/pdf2md-cli)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)
[![GitHub stars](https://img.shields.io/github/stars/Kevork-Nexacrawl-dev/pdf2md-cli?style=social)](https://github.com/Kevork-Nexacrawl-dev/pdf2md-cli)

---

## Why pdf2md-cli?

Most PDF-to-Markdown tools dump raw text and call it done. **pdf2md-cli** reads the PDF transform matrix to detect real heading hierarchy, preserves page structure, and runs locally with zero API calls.

| | **pdf2md-cli** (Nexacrawl) | Typical converters |
|---|---|---|
| Speed | **~2 seconds for a 12 MB PDF** | Often slower; many use cloud APIs |
| Headings | Font-size-based detection from transform matrix | Flat text or guesswork |
| Modes | `local`, `web`, `batch` | Usually single-file only |
| Offline | Yes — no internet required for local/batch | Varies |
| Output | Page markers, metadata header, structured `.md` | Plain text dump |

> **Not the same as [opengovsg/pdf2md](https://github.com/opengovsg/pdf2md).** That is a separate, older project. This repo is **Kevork-Nexacrawl-dev/pdf2md-cli** — built by Nexacrawl with a different extraction engine and CLI-first workflow.

---

## Install

```bash
npm install -g pdf2md-cli
```

Requires Node.js 18+.

---

## Quick Start

```bash
# Convert a local PDF
pdf2md local ./report.pdf

# Fetch and convert a remote PDF
pdf2md web https://arxiv.org/pdf/2103.00020.pdf

# Batch convert an entire folder
pdf2md batch ./documents/ --output ./converted/
```

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
# Convert all PDFs — output .md files to the same folder
pdf2md batch ./documents/

# Write converted files to a separate output folder
pdf2md batch ./documents/ --output ./converted/

# Control how many PDFs process in parallel (default: 3)
pdf2md batch ./documents/ --output ./converted/ --concurrency 5
```

**Batch output example:**

```
ℹ Found 10 PDF(s) in documents
ℹ Output → ./converted

  ✔ document-1.pdf → document-1.md  (4 page(s), 7203 chars)
  ✔ document-2.pdf → document-2.md  (3 page(s), 5891 chars)
  ✔ document-3.pdf → document-3.md  (2 page(s), 3142 chars)
  ⏭ document-4.pdf — Skipped (exists)
  ✖ document-5.pdf — encrypted PDF — skipped

────────────────────────────────────────────────
  ✔ Batch complete — 10 file(s) processed
  ✔ Converted : 8
  ⏭ Skipped   : 1  (already exists)
  ✖ Failed    : 1
```

Batch mode is **safe to re-run** — already-converted files are skipped automatically.

---

### Flags

| Command | Flag | Short | Description |
|---|---|---|---|
| `local` | `--output <file>` | `-o` | Custom output filename (default: same name as PDF) |
| `local` | `--clipboard` | `-c` | Copy Markdown to clipboard after saving |
| `web` | `--output <file>` | `-o` | Custom output filename |
| `web` | `--clipboard` | `-c` | Copy Markdown to clipboard after saving |
| `batch` | `--output <dir>` | `-o` | Output directory for .md files (default: same as source folder) |
| `batch` | `--concurrency <n>` | `-n` | Number of PDFs to process in parallel (default: 3) |

### Examples

```bash
# Single file — save to a custom path
pdf2md local ./research.pdf --output ./notes/research.md

# Fetch remote PDF and copy result to clipboard
pdf2md web https://example.com/paper.pdf --clipboard

# Batch with higher concurrency for large folders
pdf2md batch ./archive/ --output ./archive_md/ --concurrency 8

# Full example with both flags
pdf2md local ./invoice.pdf -o ./invoices/invoice.md -c
```

---

## Performance

**pdf2md-cli** is built for speed — pure Node.js, local extraction, no cloud round-trips.

| Document | Result |
|---|---|
| 12 MB PDF | **~2 seconds** on a typical dev machine |
| Batch folders | Parallel processing with `--concurrency` (default: 3) |
| Network | Not required for `local` and `batch` modes |

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

- **Lightning-fast conversion** — local PDFs process in seconds, not minutes
- **Smart heading detection** — reads raw font-size data from the PDF transform matrix
- **Y-sorted text extraction** — items sorted by visual position (top→bottom, left→right)
- **Page separators** — each page is a clearly labeled `## Page N` section with `---` dividers
- **Source metadata** — output header includes filename/URL and extraction timestamp
- **Batch conversion** — convert entire folders with parallel processing and a clean summary
- **Skip on exist** — batch mode skips already-converted files; safe to re-run anytime
- **Colored terminal output** — chalk-powered `✔ success`, `✖ error`, `⚠ warn` messages
- **Spinner feedback** — ora spinner shows live progress per file
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

## Background

Most PDF-to-Markdown tools treat extraction as a text dump. I built an earlier browser-based version to solve heading detection using the PDF transform matrix, then ported the core logic to this Node.js CLI for developer workflows, automation, and CI pipelines.

**The result:** Markdown that reflects the document's structure — real headings, proper paragraph breaks, and page markers — ready for Obsidian, Notion, or any Markdown editor.

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

## FAQ

**Where is the official repo?**
→ [https://github.com/Kevork-Nexacrawl-dev/pdf2md-cli](https://github.com/Kevork-Nexacrawl-dev/pdf2md-cli)

**Is this the same as opengovsg/pdf2md?**
→ No. That is a different project. Search for **Kevork-Nexacrawl-dev/pdf2md-cli** or **pdf2md-cli nexacrawl**.

**Who maintains this?**
→ [Kevork (Nexacrawl)](https://github.com/Kevork-Nexacrawl-dev) — contact: nexacrawl@gmail.com

---

## License

**Business Source License 1.1** — © 2026 Kevork (Nexacrawl)

This project is licensed under the BSL 1.1, which allows non-production use, modification, and redistribution. **Production/commercial use requires a separate license.**

- Change Date: **2029-01-01** — after this date, the code automatically converts to **MIT**
- For commercial licensing inquiries: **nexacrawl@gmail.com**

See the [LICENSE](LICENSE) file for full terms.

---

## Contributing

PRs are welcome. Open an issue first for any significant changes.

Please review [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request,
and follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all project spaces.