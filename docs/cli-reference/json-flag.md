# `--json` Flag — CLI Reference

## Overview

| | |
|---|---|
| **Flag** | `--json` |
| **Short** | `-j` |
| **Type** | Boolean |
| **Default** | `false` |
| **Supported commands** | `local`, `web`, `batch` |

When `--json` is set, LexVaultMD writes structured JSON to stdout (or to the output file) instead of Markdown. The plain Markdown pipeline is unchanged when this flag is absent — all existing output is byte-for-byte identical to pre-flag behavior.

---

## Usage

### `local` — single PDF to JSON

```bash
lex-vault-md local ./motion.pdf --json
```

Writes JSON to `motion.json` next to the source file.

With a custom output path:

```bash
lex-vault-md local ./motion.pdf --json --output ./vault/motion.json
```

### `web` — remote PDF to JSON

```bash
lex-vault-md web https://example.com/brief.pdf --json
```

Downloads the PDF, runs the local extraction pipeline, and writes JSON output. No document content leaves the machine after download.

### `batch` — folder to JSON

```bash
lex-vault-md batch ./discovery/ --json
lex-vault-md batch ./discovery/ --json --output ./json-vault/
```

Each PDF in the folder produces a corresponding `.json` file. Skip-on-exist behavior applies: already-converted files are not reprocessed.

---

## Output Schema

```json
{
  "metadata": {
    "source":    "string  — filename (local/batch) or URL (web)",
    "extracted": "string  — ISO 8601 timestamp, e.g. 2026-06-30T19:37:00.000Z",
    "pages":     "number  — total page count",
    "chars":     "number  — total character count across all pages"
  },
  "pages": [
    {
      "page":    "number  — 1-based page index",
      "content": "string  — full Markdown text of this page (headings, paragraphs, table text)"
    }
  ],
  "headings": [
    {
      "level":   "number  — heading depth (1 = H1, 2 = H2, 3 = H3)",
      "text":    "string  — heading text as extracted",
      "page":    "number  — page on which this heading first appears"
    }
  ],
  "tables": [
    {
      "page":    "number  — page on which the table appears",
      "rows":    "number  — row count including header row",
      "cols":    "number  — column count",
      "markdown":"string  — table rendered as a Markdown pipe table"
    }
  ]
}
```

### Field descriptions

| Field | Type | Description |
|---|---|---|
| `metadata.source` | string | Absolute or relative path for local/batch; full URL for web |
| `metadata.extracted` | string | UTC timestamp of when extraction completed |
| `metadata.pages` | number | Total number of pages in the source PDF |
| `metadata.chars` | number | Total character count of extracted text |
| `pages[].page` | number | 1-based page number |
| `pages[].content` | string | Full Markdown text for this page, including headings and table representations |
| `headings[].level` | number | Heading depth: 1 = `#`, 2 = `##`, 3 = `###` |
| `headings[].text` | string | Heading text as detected from PDF transform matrix |
| `headings[].page` | number | Page index where this heading appears |
| `tables[].page` | number | Page index where the table was detected |
| `tables[].rows` | number | Row count including any header row |
| `tables[].cols` | number | Column count |
| `tables[].markdown` | string | Table content as a Markdown pipe table string |

> **Note:** `pages[].content` contains the full Markdown representation of that page, including headings and inline table text. The `headings` and `tables` arrays are extracted indexes for programmatic access — they do not duplicate raw content. If no headings or tables are detected, those arrays are present but empty (`[]`).

---

## Example Output

Command:

```bash
lex-vault-md local ./motion-to-dismiss.pdf --json
```

Output (`motion-to-dismiss.json`):

```json
{
  "metadata": {
    "source": "motion-to-dismiss.pdf",
    "extracted": "2026-06-30T19:37:00.000Z",
    "pages": 3,
    "chars": 5891
  },
  "pages": [
    {
      "page": 1,
      "content": "<!-- Source: motion-to-dismiss.pdf | Extracted: Jun 30, 2026, 7:37 PM -->\n\n# MOTION TO DISMISS\n\n## IN THE UNITED STATES DISTRICT COURT\n\nPlaintiff hereby moves this Court pursuant to Rule 12(b)(6)..."
    },
    {
      "page": 2,
      "content": "<!-- page 2 -->\n*— page 2 —*\n\n## I. STATEMENT OF FACTS\n\nOn or about January 1, 2026, the parties entered into a written agreement..."
    },
    {
      "page": 3,
      "content": "<!-- page 3 -->\n*— page 3 —*\n\n## II. ARGUMENT\n\n### A. Standard of Review\n\nTo survive a motion to dismiss..."
    }
  ],
  "headings": [
    { "level": 1, "text": "MOTION TO DISMISS", "page": 1 },
    { "level": 2, "text": "IN THE UNITED STATES DISTRICT COURT", "page": 1 },
    { "level": 2, "text": "I. STATEMENT OF FACTS", "page": 2 },
    { "level": 2, "text": "II. ARGUMENT", "page": 3 },
    { "level": 3, "text": "A. Standard of Review", "page": 3 }
  ],
  "tables": []
}
```

---

## When to use `--json`

Use `--json` when you need to:

- Feed LexVaultMD output into a downstream pipeline, script, or API without parsing Markdown
- Index extracted headings and tables into a database or search engine (e.g., Elasticsearch, Pinecone)
- Build legal-tech integrations that need per-page content with metadata (case management systems, e-discovery platforms, AI review tools)
- Run automated quality checks on extracted structure (heading count, table count, page count) without reading raw Markdown
- Pipe output directly into an LLM context window with structured page boundaries

The Markdown output mode (default, no flag) remains the better choice for producing human-readable `.md` files for review, version control, or case vaults.

---

## Integration example (Node.js)

```js
import { execSync } from 'child_process';

const result = JSON.parse(
  execSync('lex-vault-md local ./exhibit.pdf --json', { encoding: 'utf8' })
);

console.log(`Extracted ${result.metadata.pages} pages, ${result.metadata.chars} chars`);
console.log('Headings:', result.headings.map(h => h.text));
```

> LexVaultMD runs locally. No matter data is transmitted to any external service when using `--json` or any other flag.
