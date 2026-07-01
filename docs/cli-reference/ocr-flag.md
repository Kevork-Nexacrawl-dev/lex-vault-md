# `--ocr` Flag Reference

**Flag:** `--ocr` / `-r`  
**Type:** boolean  
**Default:** `false`  
**Supported commands:** `local`, `web`, `batch`, `convert` (shorthand)

---

## What It Does

When `--ocr` is passed, LexVaultMD enables a Tesseract.js fallback layer that runs
after the native PDF text extraction pipeline. Pages that produced poor-quality text
are re-processed using OCR so you get readable Markdown even from scanned or
photocopy-quality legal documents.

When `--ocr` is **absent**, behaviour is byte-for-byte identical to before the flag
existed. There is no performance overhead, no additional dependencies required.

---

## Routing Logic

Every page is evaluated using two signals:

| Signal | Description |
|---|---|
| `printable_native_ratio` | Printable Unicode chars ÷ total chars in extracted text |
| `image_coverage` | Rendered image area ÷ page area (from PDF operator list) |

The routing decision for each page:

| Condition | Route | Behaviour |
|---|---|---|
| `ratio >= 0.97` | **NATIVE ONLY** | Native text is high quality — OCR skipped even with `--ocr` |
| `0.85 ≤ ratio < 0.97`, `image_coverage < 0.60` | **NATIVE + REPAIR** | Native text returned as-is |
| `ratio < 0.85`, `image_coverage ≥ 0.60` | **WHOLE-PAGE OCR** | Page image is OCR'd; result replaces native text |
| `ratio < 0.97`, `image_coverage ≥ 0.60` (some native text exists) | **REGION OCR** | OCR result appended below native text as supplemental block |

---

## Prerequisites

The `--ocr` flag requires two optional packages that are **not** bundled by default:

```bash
# Required: Tesseract.js (OCR engine)
npm install tesseract.js

# Optional: sharp (image preprocessing — deskew, binarize, denoise)
npm install sharp
```

If `sharp` is not installed, images are passed to Tesseract unmodified. OCR still
works but quality may be lower on skewed or low-contrast scans.

If `tesseract.js` is not installed and `--ocr` is passed, the CLI exits with an
installation hint.

---

## OCR Preprocessing Pipeline

When a page image is available for OCR, LexVaultMD applies preprocessing via `sharp`
before recognition (requires `sharp`):

1. **300 dpi baseline** — upscale if the image is below 300 dpi equivalent
2. **Grayscale conversion** — Tesseract works best on grayscale input
3. **Adaptive binarization** — normalise histogram then threshold; handles uneven
   scan lighting common in photocopied court documents
4. **Light denoise** — 1-pixel median filter removes scanner dust without blurring
   character edges
5. **Deskew** — auto-orient correction for common scanner tilt artefacts

---

## Usage Examples

```bash
# Local file — enable OCR fallback
lex-vault-md local ./deposition.pdf --ocr

# Remote PDF — enable OCR fallback
lex-vault-md web https://example.com/exhibit-a.pdf --ocr

# Batch folder — enable OCR fallback on all PDFs
lex-vault-md batch ./case_files/ --ocr

# Combine with --json output
lex-vault-md local ./contract.pdf --ocr --json

# Shorthand (auto-detects local path vs URL)
lex-vault-md ./motion.pdf --ocr
```

---

## Worker Pool

To avoid spawning a new Tesseract.js worker per page (which is expensive), LexVaultMD
maintains a **worker pool** initialised once per CLI invocation. Workers are reused
across all pages and all files in a batch run. The pool terminates automatically
when processing is complete.

Default pool size: **2 workers**. This handles concurrent page OCR without excessive
memory usage on legal documents.

---

## Data Residency

OCR processing is **fully offline**. Tesseract.js runs the LSTM engine in-process
using Node.js. No page images, page text, or document metadata leave your machine.
This guarantee is identical to the native extraction path.

See [`docs/no-transmission-statement.md`](../no-transmission-statement.md) for the
full no-transmission declaration suitable for vendor questionnaire attachment.

---

## Monetization Tag

`src/services/ocr-router.js` and `src/services/ocr-preprocess.js` are tagged
`[PRO-CANDIDATE]`. The OCR worker pool configuration, preprocessing quality, and
batch concurrency tuning are candidates for Pro-tier enhancement in a future
commercial release.
