# `--ocr` Flag — CLI Reference

## Overview

| | |
|---|---|
| **Flag** | `--ocr` |
| **Short** | `-r` |
| **Type** | Boolean |
| **Default** | `false` |
| **Supported commands** | `local`, `web`, `batch` |

When `--ocr` is set, LexVaultMD activates a Tesseract.js fallback layer that runs after the native PDF text extraction pipeline. Pages that produced poor-quality or missing text are re-processed using OCR so the output is readable even from scanned or photocopy-quality legal documents.

When `--ocr` is **absent**, behaviour is byte-for-byte identical to before the flag existed. There is no performance overhead and no additional dependencies are loaded.

---

## When OCR is triggered

LexVaultMD does not apply OCR blindly to every page. Instead, it evaluates each page individually using two signals and routes it to one of four paths.

**The two signals:**

- `printable_native_ratio` — the proportion of printable Unicode characters in the text extracted natively from the PDF (high ratio = clean digital text; low ratio = garbage, mojibake, or missing text from a scanned page)
- `image_coverage` — the proportion of the page area occupied by rendered image operators in the PDF (high coverage = the page content is stored as an image, not as selectable text)

**The four routes, in plain English:**

| Route | When it activates | What happens |
|---|---|---|
| **NATIVE ONLY** | `printable_native_ratio ≥ 0.97` | The native text is clean. OCR is skipped entirely for this page, even if `--ocr` is set. No Tesseract work is done. |
| **NATIVE + REPAIR** | `0.85 ≤ ratio < 0.97` and `image_coverage < 0.60` | The native text is mostly clean but slightly degraded. The native result is returned as-is. No Tesseract work is done. |
| **WHOLE-PAGE OCR** | `ratio < 0.85` and `image_coverage ≥ 0.60` | The page is predominantly an image (scanned page, photocopy). The page image is OCR'd by Tesseract and the OCR result replaces the native text entirely. |
| **REGION OCR** | `ratio < 0.97` and `image_coverage ≥ 0.60` (some native text exists) | The page has a mix of native text and image regions. The OCR result is appended below the native text as a supplemental block. |

The practical implication: born-digital PDFs (motions, filings, contracts typed in Word and printed to PDF) will route to NATIVE ONLY on almost every page and complete at full native speed even when `--ocr` is set. OCR work only happens on pages that genuinely need it.

> **Sprint 1 limitation:** The WHOLE-PAGE OCR and REGION OCR routes are fully implemented but currently emit a graceful placeholder comment (`<!-- OCR: page image not available -->`) because `pdf-parse` does not render page images. These routes will produce full OCR output once a page renderer (`pdfjs-dist` canvas or `pdftoppm`) is integrated. The NATIVE and NATIVE+REPAIR routes are fully functional today.

---

## Prerequisites

The `--ocr` flag requires `tesseract.js`, which is **not bundled** in the default install. Install it separately:

```bash
# Required for OCR
npm install tesseract.js

# Optional — improves OCR accuracy via image preprocessing
npm install sharp
```

If `tesseract.js` is not installed and `--ocr` is passed, the CLI exits immediately with an installation hint. If `sharp` is not installed, images are passed to Tesseract unmodified — OCR still runs but quality may be lower on skewed or low-contrast scans.

> **Why is `tesseract.js` not bundled by default?** It adds approximately 40 MB to the install footprint and requires a native binary compilation step. Most users working with born-digital legal PDFs will never need it. Keeping it optional preserves the fast, dependency-light default install path.

---

## Image preprocessing pipeline

When a page image is available for OCR and `sharp` is installed, LexVaultMD preprocesses the image before passing it to Tesseract:

1. **300 dpi baseline** — upscales if the image is below 300 dpi equivalent; Tesseract accuracy degrades significantly below this threshold
2. **Grayscale conversion** — strips colour information; Tesseract performs best on single-channel input
3. **Adaptive binarization** — normalises histogram then applies adaptive threshold; handles uneven scan lighting common in photocopied court documents
4. **Light denoise** — 1-pixel median filter removes scanner dust without blurring character edges
5. **Deskew** — detects and corrects common scanner tilt artifacts

If `sharp` is absent, the raw image buffer is passed to Tesseract without preprocessing. OCR still runs; the above quality improvements are simply not applied.

---

## Worker pool

LexVaultMD initialises a Tesseract.js **worker pool once per CLI invocation**, not once per page. Workers are reused across all pages and all files in a batch run, then terminated automatically when processing completes. The default pool size is **2 workers**. This keeps concurrent OCR fast without excessive memory use on typical legal document workloads.

---

## Usage

```bash
# Local file — enable OCR fallback
lex-vault-md local ./deposition.pdf --ocr

# Remote PDF — enable OCR fallback
lex-vault-md web https://example.com/exhibit-a.pdf --ocr

# Batch folder — enable OCR fallback for all PDFs
lex-vault-md batch ./case_files/ --ocr

# Batch with output directory
lex-vault-md batch ./case_files/ --ocr --output ./review/

# Combine with --json output
lex-vault-md local ./contract.pdf --ocr --json

# Shorthand flag
lex-vault-md local ./deposition.pdf -r
```

---

## Known limitations

- **WHOLE-PAGE OCR and REGION OCR routes are not yet active.** Both routes emit a graceful `<!-- OCR: page image not available -->` placeholder. Full OCR output for scanned pages requires a page image renderer, which is on the roadmap. The flag is still useful today for born-digital PDFs: it activates the router and will automatically improve output as the implementation progresses.
- **`sharp` is optional.** Without it, preprocessing is skipped. OCR accuracy on skewed or low-contrast scans will be lower.
- **English-only by default.** Tesseract.js ships with an English language model. Multi-language support requires additional language data files and is not currently documented or tested.
- **Performance on large batches.** A 2-worker pool is conservative. For large discovery productions with many scanned pages, increasing the pool size may improve throughput, but this is not currently a configurable option.

---

## Data residency

OCR processing is fully offline. Tesseract.js runs the LSTM recognition engine in-process inside Node.js. No page images, extracted text, or document metadata leave the machine at any point during OCR processing. This guarantee is identical to the native extraction path.

See [`docs/no-transmission-statement.md`](../no-transmission-statement.md) for the full no-transmission declaration, which is suitable for attachment to vendor security questionnaires.
