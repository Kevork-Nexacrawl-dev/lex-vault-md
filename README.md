# LexVaultMD — Offline Legal PDF to Markdown CLI for Litigation and E-Discovery

> **LexVaultMD by Nexacrawl** is an offline legal PDF to Markdown converter for litigation teams, e-discovery workflows, exhibits, pleadings, contracts, case files, and AI-assisted document review.

**Repository:** [github.com/Kevork-Nexacrawl-dev/lex-vault-md](https://github.com/Kevork-Nexacrawl-dev/lex-vault-md)

[![GitHub Repo](https://img.shields.io/badge/GitHub-Kevork--Nexacrawl--dev%2Flex--vault--md-181717?logo=github)](https://github.com/Kevork-Nexacrawl-dev/lex-vault-md)
[![npm version](https://img.shields.io/badge/npm-v1.1.0-cb3837?logo=npm)](https://www.npmjs.com/package/@nexacrawl/lex-vault-md)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)
[![GitHub stars](https://img.shields.io/github/stars/Kevork-Nexacrawl-dev/lex-vault-md?style=social)](https://github.com/Kevork-Nexacrawl-dev/lex-vault-md)

---

## About LexVaultMD

LexVaultMD converts legal PDFs into clean, structured, AI-ready Markdown without sending confidential documents to a cloud API. It is built for law firms, legal operations teams, litigation support vendors, e-discovery providers, and builders who need local PDF extraction for sensitive legal documents.

Use it when you need to turn motions, briefs, exhibits, deposition transcripts, discovery productions, contracts, regulatory filings, or case files into Markdown for review, search, knowledge bases, or LLM workflows.

---

## Why LexVaultMD?

Legal PDFs are structurally rich but extraction-hostile. **LexVaultMD** reads the PDF transform matrix to detect real heading hierarchy, strips headers/footers/watermarks, detects multi-column layouts, extracts tables, and runs locally for confidential document workflows. The output is clean, structured Markdown that is immediately usable for AI-assisted review, case management, discovery, and litigation workflows.

| | **LexVaultMD** (Nexacrawl) | Typical converters |
|---|---|---|
| Speed | **~2 seconds for a 12 MB PDF** | Often slower; many use cloud APIs |
| Headings | Font-size-based detection from transform matrix | Flat text or guesswork |
| Modes | `local`, `web`, `batch` | Usually single-file only |
| Offline | Yes — no internet required for local/batch | Varies |
| Output | Structured `.md` or structured `.json` with schema | Plain text dump |
| Legal Artifacts | Header/footer removal, watermark stripping, margin noise | Not handled |
| Scanned PDFs | Optional `--ocr` fallback via Tesseract.js (local) | Varies; often cloud OCR |

---

## Data Residency

LexVaultMD processes all document content locally on the user’s machine. No data is transmitted to external services, APIs, or cloud infrastructure at any point during extraction. This applies to both native text extraction and the optional OCR path — Tesseract.js runs entirely in-process. There is no SaaS dependency and no vendor-side storage.

The `local` and `batch` commands process PDFs on the machine where the CLI is running. The `web` command downloads the PDF from the URL you supply, then runs the same local extraction pipeline — the document content is never forwarded to a third party. Use `local` or `batch` for confidential, privileged, sealed, or client-restricted documents where external network access is not permitted.

This deployment model reduces the surface area implicated by ABA Model Rule 1.6 confidentiality obligations and vendor security review requirements. It is not a substitute for independent legal judgment.

For a signed no-transmission declaration suitable for attachment to a vendor security questionnaire, see [`docs/no-transmission-statement.md`](docs/no-transmission-statement.md). For a pre-answered vendor security packet, see [`docs/vendor-security-packet.md`](docs/vendor-security-packet.md).

---

## Commercial Use

LexVaultMD is source-available with a commercial use restriction. It is free for non-commercial and internal evaluation use under the Business Source License 1.1 (BSL 1.1). A commercial license is required for use in commercial products or services.

Commercial licensing is intended for law firms, legal operations teams, litigation support vendors, e-discovery providers, and organizations that need written vendor assurances for internal procurement.

The Change Date is **2029-01-01** — after that date the code automatically converts to the MIT license.

For commercial licensing, offline deployment, vendor review, or data-handling documentation, contact **nexacrawl@gmail.com**.

---

## Install

```bash
npm install -g @nexacrawl/lex-vault-md
```

Requires Node.js 18+.

---

## Quick Start

### 1. Install the CLI

```bash
npm install -g @nexacrawl/lex-vault-md
```

### 2. Convert one PDF file

If your PDF is named `file.pdf` and it is in the folder where your terminal is open, run:

```bash
lex-vault-md local ./file.pdf
```

That creates:

```bash
file.md
```

For a legal document named `motion.pdf`, run:

```bash
lex-vault-md local ./motion.pdf
```

### 3. Convert a PDF from the web

If the PDF has a public URL, run:

```bash
lex-vault-md web https://example.com/brief.pdf
```

### 4. Convert a whole folder

If your folder is named `discovery` and contains multiple PDF files, run:

```bash
lex-vault-md batch ./discovery/
```

That writes `.md` files next to the PDFs. To write the Markdown files into a separate folder named `case-vault`, run:

```bash
lex-vault-md batch ./discovery/ --output ./case-vault/
```

---

## Usage

### Convert a local PDF

```bash
lex-vault-md local ./motion.pdf
```

### Fetch and convert a remote PDF

```bash
lex-vault-md web https://example.com/brief.pdf
```

### Batch convert an entire folder

```bash
# Convert all PDFs — output .md files to the same folder
lex-vault-md batch ./discovery/

# Write converted files to a separate case vault folder
lex-vault-md batch ./discovery/ --output ./case-vault/

# Control how many PDFs process in parallel (default: 3)
lex-vault-md batch ./discovery/ --output ./case-vault/ --concurrency 5
```

**Batch output example:**

```
ℹ Found 10 PDF(s) in discovery
ℹ Output → ./case-vault

  ✔ exhibit-001.pdf → exhibit-001.md  (4 page(s), 7203 chars)
  ✔ motion-to-dismiss.pdf → motion-to-dismiss.md  (3 page(s), 5891 chars)
  ✔ deposition-smith.pdf → deposition-smith.md  (2 page(s), 3142 chars)
  ⏭ exhibit-002.pdf — Skipped (exists)
  ✖ sealed-filing.pdf — encrypted PDF — skipped

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
|---|---|---|
| `local`, `web`, `batch` | `--json` | `-j` | Output structured JSON instead of Markdown (see [JSON Output](#json-output)) |
| `local`, `web`, `batch` | `--ocr` | `-r` | Enable Tesseract.js OCR fallback for scanned or low-quality pages (see [OCR](#ocr-for-scanned-pdfs)) |
| `local` | `--output <file>` | `-o` | Custom output filename (default: same name as PDF) |
| `local` | `--clipboard` | `-c` | Copy Markdown to clipboard after saving |
| `web` | `--output <file>` | `-o` | Custom output filename |
| `web` | `--clipboard` | `-c` | Copy Markdown to clipboard after saving |
| `batch` | `--output <dir>` | `-o` | Output directory for .md files (default: same as source folder) |
| `batch` | `--concurrency <n>` | `-n` | Number of PDFs to process in parallel (default: 3) |

### Examples

```bash
# Single file — save to a custom path
lex-vault-md local ./pleading.pdf --output ./vault/pleading.md

# Fetch remote PDF and copy result to clipboard
lex-vault-md web https://example.com/exhibit.pdf --clipboard

# Batch with higher concurrency for large discovery productions
lex-vault-md batch ./production/ --output ./review/ --concurrency 8

# JSON output — single file
lex-vault-md local ./motion.pdf --json

# JSON output — batch
lex-vault-md batch ./discovery/ --json --output ./json-vault/

# OCR fallback for scanned deposition exhibits
lex-vault-md local ./deposition.pdf --ocr

# OCR + JSON (pipe scanned PDF output to a downstream pipeline)
lex-vault-md local ./exhibit.pdf --ocr --json
```

---

## JSON Output

Add `--json` (or `-j`) to any `local`, `web`, or `batch` command to receive structured JSON instead of Markdown. This is the right mode for pipelines, integrations, and downstream automation.

```bash
lex-vault-md local ./motion-to-dismiss.pdf --json
```

Output file (`motion-to-dismiss.json`):

```json
{
  "metadata": {
    "source": "motion-to-dismiss.pdf",
    "extracted": "2026-06-30T19:37:00.000Z",
    "pages": 3,
    "chars": 5891
  },
  "pages": [
    { "page": 1, "content": "# MOTION TO DISMISS\n\n## IN THE UNITED STATES DISTRICT COURT\n..." },
    { "page": 2, "content": "## I. STATEMENT OF FACTS\n\nOn or about January 1, 2026..." },
    { "page": 3, "content": "## II. ARGUMENT\n\n### A. Standard of Review\n..." }
  ],
  "headings": [
    { "level": 1, "text": "MOTION TO DISMISS", "page": 1 },
    { "level": 2, "text": "I. STATEMENT OF FACTS", "page": 2 },
    { "level": 2, "text": "II. ARGUMENT", "page": 3 },
    { "level": 3, "text": "A. Standard of Review", "page": 3 }
  ],
  "tables": []
}
```

The schema includes four top-level keys:

- **`metadata`** — source path/URL, extraction timestamp, page count, character count
- **`pages`** — array of page objects, each with a 1-based `page` index and full Markdown `content` for that page
- **`headings`** — extracted heading index with `level`, `text`, and `page`; useful for building document outlines or search indexes
- **`tables`** — array of detected tables with row/column counts and Markdown representation; empty array `[]` when no tables are present

See the full schema and field-level descriptions in [docs/cli-reference/json-flag.md](docs/cli-reference/json-flag.md).

---

## OCR for Scanned PDFs

Add `--ocr` (or `-r`) to any `local`, `web`, or `batch` command to enable a Tesseract.js OCR fallback layer for pages that native extraction cannot read cleanly.

**`--ocr` requires an additional install step:**

```bash
# Required
npm install tesseract.js

# Optional — improves accuracy on skewed or low-contrast scans
npm install sharp
```

OCR is not applied blindly to every page. LexVaultMD evaluates each page individually and routes it based on text quality. Born-digital PDFs (motions, filings, contracts) will complete at full native speed even with `--ocr` set — OCR work only happens on pages that genuinely need it. See [docs/cli-reference/ocr-flag.md](docs/cli-reference/ocr-flag.md) for the full routing logic.

```bash
# Scanned deposition transcript
lex-vault-md local ./deposition-smith.pdf --ocr

# Batch — mixed folder of born-digital and scanned PDFs
lex-vault-md batch ./production/ --ocr --output ./review/

# Pipe scanned exhibit output to a downstream pipeline
lex-vault-md local ./exhibit-a.pdf --ocr --json
```

> LexVaultMD runs locally. Tesseract.js runs entirely in-process. No page images or extracted text leave your machine during OCR processing.

> **Current limitation:** Full OCR output for wholly scanned pages requires a page image renderer that is on the roadmap. The flag activates the routing layer today and improves output for born-digital PDFs via the NATIVE/REPAIR path. See the [OCR flag reference](docs/cli-reference/ocr-flag.md) for details.

---

## Performance

**LexVaultMD** is built for speed — pure Node.js, local extraction, no cloud round-trips.

| Document | Result |
|---|---|
| 12 MB PDF | **~2 seconds** on a typical machine |
| Batch folders | Parallel processing with `--concurrency` (default: 3) |
| Network | Not required for `local` and `batch` modes |

---

## Output Format

Every conversion produces a structured Markdown file:

```markdown
<!-- Source: motion.pdf | Extracted: Jun 29, 2026, 10:00 AM -->

[page 1 content flows here]

<!-- page 2 -->
*— page 2 —*

# ARGUMENT

## I. THE COURT HAS JURISDICTION

Paragraph text flows here with proper line breaks
and paragraph spacing preserved from the original PDF.
```

**Heading detection** maps font sizes from the PDF’s transform matrix relative to the page’s most common body-text size:

| Font-size ratio | Markdown output |
|---|---|
| ≥ 1.5x body text | `# H1` |
| ≥ 1.2x body text | `## H2` |
| ≥ 1.05x body text | `### H3` |
| < 0.8x body text | Treated as caption or footnote text |

---

## Features

- **Lightning-fast conversion** — local PDFs process in seconds, not minutes
- **Smart heading detection** — reads raw font-size data from the PDF transform matrix
- **Multi-column layout detection** — MER algorithm + XY-Cut++ fallback for complex legal layouts
- **Table extraction** — hybrid lattice/stream orchestrator for bordered and borderless tables
- **Artifact removal** — strips repeating headers/footers, watermarks (`DRAFT`, `CONFIDENTIAL`, `COPY`), and margin noise
- **Garbage gate** — detects and skips scanned/image-only pages automatically
- **JSON output mode** — `--json` flag outputs structured JSON with metadata, per-page content, heading index, and table index
- **OCR fallback** — `--ocr` flag enables per-page Tesseract.js OCR routing; only activates on pages that need it
- **Y-sorted text extraction** — items sorted by visual position (top→bottom, left→right)
- **Subtle page markers** — invisible HTML comment + `*— page N —*` italic; no large headings
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
| Scanned / image-only PDF | Detects via garbage gate, skips with placeholder; use `--ocr` for content |
| `--ocr` set but `tesseract.js` not installed | Exit with installation hint |
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
| [`tesseract.js`](https://github.com/naptha/tesseract.js) | ^5.1 | OCR engine — optional; required for `--ocr` |
| [`sharp`](https://sharp.pixelplumbing.com) | ^0.33 | Image preprocessing for OCR — optional |

---

## Migration from pdf2md-cli

This project was formerly published as `pdf2md-cli`.

New install:

```bash
npm install -g @nexacrawl/lex-vault-md
```

New CLI command:

```bash
lex-vault-md
```

The legacy `pdf2md` command remains available temporarily for backward compatibility.

---

## Local Development

```bash
git clone https://github.com/Kevork-Nexacrawl-dev/lex-vault-md.git
cd lex-vault-md
npm install
npm link          # makes both lex-vault-md and pdf2md available globally

lex-vault-md local ./test.pdf
lex-vault-md batch ./test-folder/
```

---

## FAQ

**Where is the official repo?**
→ [https://github.com/Kevork-Nexacrawl-dev/lex-vault-md](https://github.com/Kevork-Nexacrawl-dev/lex-vault-md)

**Is this the same as opengovsg/pdf2md?**
→ No. That is a different project. Search for **Kevork-Nexacrawl-dev/lex-vault-md** or **lex-vault-md nexacrawl**.

**What happened to pdf2md-cli?**
→ This project was renamed to **LexVaultMD** (`@nexacrawl/lex-vault-md`) and repositioned for legal teams. The `pdf2md` CLI alias still works temporarily for backward compatibility.

**Who maintains this?**
→ [Kevork (Nexacrawl)](https://github.com/Kevork-Nexacrawl-dev) — contact: nexacrawl@gmail.com

---

## License

**Business Source License 1.1** — © 2026 Nexacrawl

LexVaultMD is source-available with a commercial use restriction. It is free for non-commercial and internal evaluation use. A commercial license is required for use in commercial products or services. See [LICENSE](LICENSE) for full terms.

- Change Date: **2029-01-01** — after this date the code automatically converts to **MIT**
- For commercial licensing inquiries: **nexacrawl@gmail.com**

---

## Contributing

PRs are welcome. Open an issue first for any significant changes.

Please review [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request,
and follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all project spaces.
