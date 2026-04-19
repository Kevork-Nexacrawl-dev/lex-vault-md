# pdf2md-cli

> **Convert any PDF to clean Markdown — from the command line.**  
> Supports local files and remote URLs, with smart heading detection and page separators.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen?logo=node.js)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-in%20development-orange)](#)

---

## Installation

```bash
npm install -g pdf2md-cli
```

## Usage

```bash
# Convert a local PDF
pdf2md local ./report.pdf

# Convert a PDF from a URL
pdf2md web https://example.com/paper.pdf

# Specify output file
pdf2md local ./report.pdf --output ./report.md

# Copy result to clipboard
pdf2md local ./report.pdf --clipboard
```

## Features

- **Smart heading detection** — font-size analysis maps to H1–H4 automatically
- **Page separators** — each PDF page becomes a clearly marked Markdown section
- **Source metadata** — output includes filename/URL and timestamp header
- **Works offline** — local file mode needs no internet connection
- **Colored output** — uses chalk for clear terminal feedback

## Output Format

```markdown
<!-- Source: report.pdf | Extracted: 2026-04-18 -->

## Page 1

# Main Title

## Section Heading

Paragraph text...

## Page 2
...
```

## Tech Stack

| Tool | Role |
|---|---|
| `commander` | CLI commands & flags |
| `pdf-parse` | PDF text extraction |
| `axios` | Fetch remote PDFs |
| `chalk` | Colored terminal output |
| `ora` | Loading spinner |

## Why This Project

I built this after writing two Tampermonkey scripts that outperformed every PDF-to-Markdown tool I tried in the browser. The heading detection logic — based on font-size thresholds parsed from the PDF's raw transform matrix — produces cleaner, more structured Markdown than most tools that just dump raw text. This CLI packages that logic for developers who need it in automated workflows, scripts, and pipelines.

---

*More documentation coming as the project reaches v1.0.0.*
